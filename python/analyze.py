#!/usr/bin/env python3
"""
Analysis pipeline for load balancing evaluation results.

Aggregates custom load balancer run exports (metrics/runs/*/summary.json)
and optional k6 summary JSON files into comparison tables and charts.

Usage:
  python analyze.py --metrics-dir ../metrics --out-dir ../metrics/analysis
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import matplotlib.pyplot as plt
import pandas as pd


def load_run_summaries(metrics_dir: Path) -> pd.DataFrame:
    runs_dir = metrics_dir / "runs"
    rows: list[dict[str, Any]] = []
    if not runs_dir.exists():
        return pd.DataFrame()

    for run_path in sorted(runs_dir.iterdir()):
        if not run_path.is_dir():
            continue
        summary_file = run_path / "summary.json"
        if not summary_file.exists():
            continue
        with summary_file.open("r", encoding="utf-8") as fh:
            summary = json.load(fh)

        rows.append(
            {
                "source": "custom-engine",
                "run_id": summary.get("runId") or run_path.name,
                "engine": summary.get("engine") or "custom",
                "algorithm": summary.get("algorithm"),
                "scenario": summary.get("scenario"),
                "total_requests": summary.get("totalRequests"),
                "error_count": summary.get("errorCount"),
                "error_rate": summary.get("errorRate"),
                "throughput_rps": summary.get("throughputRps"),
                "mean_ms": (summary.get("responseTime") or {}).get("mean"),
                "p50_ms": (summary.get("responseTime") or {}).get("p50"),
                "p95_ms": (summary.get("responseTime") or {}).get("p95"),
                "p99_ms": (summary.get("responseTime") or {}).get("p99"),
                "avg_lb_cpu_percent": summary.get("avgLbCpuPercent"),
                "avg_lb_rss_bytes": summary.get("avgLbRssBytes"),
                "duration_ms": summary.get("durationMs"),
            }
        )
    return pd.DataFrame(rows)


def load_k6_summaries(k6_dir: Path) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    if not k6_dir.exists():
        return pd.DataFrame()

    for path in sorted(k6_dir.glob("*.json")):
        with path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)

        metrics = data.get("metrics") or {}
        duration = metrics.get("http_req_duration") or {}
        failed = metrics.get("http_req_failed") or {}
        reqs = metrics.get("http_reqs") or {}

        # Parse engine_algorithm_scenario_trialN from filename when possible
        stem = path.stem
        parts = stem.split("_")
        engine = parts[0] if parts else "unknown"
        algorithm = parts[1] if len(parts) > 1 else "unknown"
        scenario = parts[2] if len(parts) > 2 else "unknown"

        values = duration.get("values") or {}
        failed_values = failed.get("values") or {}
        req_values = reqs.get("values") or {}

        rows.append(
            {
                "source": "k6",
                "run_id": stem,
                "engine": engine,
                "algorithm": algorithm,
                "scenario": scenario,
                "total_requests": req_values.get("count"),
                "error_rate": failed_values.get("rate"),
                "throughput_rps": req_values.get("rate"),
                "mean_ms": values.get("avg"),
                "p95_ms": values.get("p(95)") or values.get("p95"),
                "p99_ms": values.get("p(99)") or values.get("p99"),
                "med_ms": values.get("med"),
            }
        )
    return pd.DataFrame(rows)


def coerce_numeric(df: pd.DataFrame) -> pd.DataFrame:
    """Ensure metric columns are numeric so None/strings do not break plots."""
    if df.empty:
        return df
    out = df.copy()
    for col in [
        "total_requests",
        "error_count",
        "error_rate",
        "throughput_rps",
        "mean_ms",
        "p50_ms",
        "p95_ms",
        "p99_ms",
        "med_ms",
        "avg_lb_cpu_percent",
        "avg_lb_rss_bytes",
        "duration_ms",
    ]:
        if col in out.columns:
            out[col] = pd.to_numeric(out[col], errors="coerce")
    return out


def aggregate(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    group_cols = ["source", "engine", "algorithm", "scenario"]
    present = [c for c in group_cols if c in df.columns]
    numeric = [
        c
        for c in [
            "mean_ms",
            "p50_ms",
            "p95_ms",
            "p99_ms",
            "throughput_rps",
            "error_rate",
            "avg_lb_cpu_percent",
            "total_requests",
        ]
        if c in df.columns
    ]
    if not present or not numeric:
        return pd.DataFrame()
    return (
        df.groupby(present, dropna=False)[numeric]
        .agg(["mean", "std", "count"])
        .reset_index()
    )


def flatten_columns(df: pd.DataFrame) -> pd.DataFrame:
    if isinstance(df.columns, pd.MultiIndex):
        df = df.copy()
        df.columns = [
            "_".join([str(x) for x in col if str(x) != ""]).strip("_")
            for col in df.columns.values
        ]
    return df


def _barh_metric(
    plot_df: pd.DataFrame,
    metric: str,
    out_path: Path,
    xlabel: str,
    title: str,
    color: str,
    scale: float = 1.0,
) -> bool:
    """Plot a horizontal bar chart for one metric. Returns True if a file was written."""
    if metric not in plot_df.columns:
        return False
    ordered = plot_df.dropna(subset=[metric]).copy()
    ordered = ordered[pd.to_numeric(ordered[metric], errors="coerce").notna()]
    if ordered.empty:
        return False
    ordered = ordered.sort_values(metric)
    values = ordered[metric].astype(float) * scale

    fig, ax = plt.subplots(figsize=(12, max(3.5, 0.45 * len(ordered) + 1.5)))
    ax.barh(ordered["label"].astype(str), values, color=color)
    ax.set_xlabel(xlabel)
    ax.set_title(title)
    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)
    return True


def plot_comparisons(df: pd.DataFrame, out_dir: Path) -> list[str]:
    """Generate charts. Returns list of written filenames."""
    written: list[str] = []
    if df.empty:
        return written

    plot_df = df.copy()
    plot_df["label"] = (
        plot_df.get("engine", pd.Series(dtype=object)).fillna("?").astype(str)
        + " | "
        + plot_df.get("algorithm", pd.Series(dtype=object)).fillna("?").astype(str)
        + " | "
        + plot_df.get("scenario", pd.Series(dtype=object)).fillna("?").astype(str)
    )

    charts = [
        (
            "mean_ms",
            "mean_response_time.png",
            "Mean response time (ms)",
            "Mean response time by engine, algorithm, and scenario",
            "#0a0a0a",
            1.0,
        ),
        (
            "p95_ms",
            "p95_response_time.png",
            "p95 response time (ms)",
            "p95 response time by engine, algorithm, and scenario",
            "#171717",
            1.0,
        ),
        (
            "throughput_rps",
            "throughput.png",
            "Throughput (requests/s)",
            "Throughput by engine, algorithm, and scenario",
            "#737373",
            1.0,
        ),
        (
            "error_rate",
            "error_rate.png",
            "Error rate (%)",
            "Error rate by engine, algorithm, and scenario",
            "#e7000b",
            100.0,
        ),
    ]

    for metric, fname, xlabel, title, color, scale in charts:
        if _barh_metric(plot_df, metric, out_dir / fname, xlabel, title, color, scale):
            written.append(fname)

    # Algorithm gap within custom engine
    custom = plot_df[plot_df["engine"].isin(["custom", "custom-engine"])]
    if custom.empty and "source" in plot_df.columns:
        custom = plot_df[plot_df["source"] == "custom-engine"]
    if not custom.empty and "mean_ms" in custom.columns:
        usable = custom.dropna(subset=["mean_ms", "scenario", "algorithm"])
        if not usable.empty:
            pivot = usable.pivot_table(
                index="scenario",
                columns="algorithm",
                values="mean_ms",
                aggfunc="mean",
            )
            if not pivot.empty and pivot.shape[1] >= 1:
                fig, ax = plt.subplots(figsize=(8, 5))
                palette = ["#0a0a0a", "#737373", "#a3a3a3", "#404040"]
                pivot.plot(
                    kind="bar",
                    ax=ax,
                    color=palette[: max(1, pivot.shape[1])],
                )
                ax.set_ylabel("Mean response time (ms)")
                ax.set_title("Custom engine: algorithm comparison by scenario")
                ax.legend(title="Algorithm")
                fig.tight_layout()
                fig.savefig(out_dir / "custom_algorithm_gap.png", dpi=150)
                plt.close(fig)
                written.append("custom_algorithm_gap.png")

    # Validation: custom vs nginx
    if "engine" in plot_df.columns and plot_df["engine"].nunique(dropna=True) > 1:
        for metric, fname, title, ylabel in [
            ("mean_ms", "validation_mean.png", "Validation: mean latency", "ms"),
            (
                "throughput_rps",
                "validation_throughput.png",
                "Validation: throughput",
                "req/s",
            ),
        ]:
            if metric not in plot_df.columns:
                continue
            subset = plot_df.dropna(subset=[metric, "algorithm", "scenario", "engine"])
            if subset.empty:
                continue
            fig, ax = plt.subplots(figsize=(10, 5))
            plotted = False
            for engine, color in [("custom", "#0a0a0a"), ("nginx", "#737373")]:
                part = subset[subset["engine"] == engine]
                if part.empty:
                    continue
                x = (
                    part["algorithm"].astype(str)
                    + " / "
                    + part["scenario"].astype(str)
                )
                ax.scatter(x, part[metric], label=engine, s=60, color=color)
                plotted = True
            if not plotted:
                plt.close(fig)
                continue
            ax.set_title(title)
            ax.set_ylabel(ylabel)
            ax.tick_params(axis="x", rotation=30)
            ax.legend()
            fig.tight_layout()
            fig.savefig(out_dir / fname, dpi=150)
            plt.close(fig)
            written.append(fname)

    return written


def write_report(
    df: pd.DataFrame,
    agg: pd.DataFrame,
    out_dir: Path,
    charts: list[str],
    skipped_empty: int,
) -> None:
    lines = [
        "# Load Balancing Performance Analysis Report",
        "",
        "Generated by `python/analyze.py`.",
        "",
        "## Raw run count",
        "",
        f"- Rows loaded: **{len(df)}**",
        f"- Rows with zero or missing request metrics skipped for latency charts: **{skipped_empty}**",
        f"- Charts written: **{len(charts)}** ({', '.join(charts) if charts else 'none'})",
        "",
    ]
    if not df.empty:
        metric_cols = [
            c
            for c in ["mean_ms", "p95_ms", "throughput_rps", "error_rate", "total_requests"]
            if c in df.columns
        ]
        lines.extend(
            [
                "## Overall means by engine and algorithm",
                "",
                "```",
                df.groupby(["engine", "algorithm"], dropna=False)[metric_cols]
                .mean(numeric_only=True)
                .to_string(),
                "```",
                "",
                "## Per-run detail",
                "",
                "```",
                df[
                    [
                        c
                        for c in [
                            "run_id",
                            "engine",
                            "algorithm",
                            "scenario",
                            "total_requests",
                            "mean_ms",
                            "p95_ms",
                            "throughput_rps",
                            "error_rate",
                        ]
                        if c in df.columns
                    ]
                ].to_string(index=False),
                "```",
                "",
            ]
        )
        if skipped_empty:
            lines.extend(
                [
                    "## Note on empty runs",
                    "",
                    "Some metrics runs recorded **0 requests**. That usually means a metrics",
                    "run was started and ended without sending traffic through the load",
                    "balancer (port 8080) while recording was active.",
                    "",
                    "To produce latency charts:",
                    "1. Start a metrics run (dashboard or API)",
                    "2. Run k6 against `http://localhost:8080`",
                    "3. End the metrics run",
                    "4. Re-run this analysis script",
                    "",
                ]
            )
    report_path = out_dir / "report.md"
    report_path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Analyze load balancer evaluation results"
    )
    parser.add_argument(
        "--metrics-dir",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "metrics",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "metrics" / "analysis",
    )
    args = parser.parse_args()

    args.out_dir.mkdir(parents=True, exist_ok=True)

    custom_df = load_run_summaries(args.metrics_dir)
    k6_df = load_k6_summaries(args.metrics_dir / "k6")
    df = pd.concat([custom_df, k6_df], ignore_index=True, sort=False)
    df = coerce_numeric(df)

    if df.empty:
        print("No results found. Run experiments first.", file=sys.stderr)
        return 1

    # Count empty custom runs (started/ended with no traffic)
    skipped_empty = 0
    if "total_requests" in df.columns and "mean_ms" in df.columns:
        skipped_empty = int(
            ((df["total_requests"].fillna(0) == 0) | df["mean_ms"].isna()).sum()
        )

    df.to_csv(args.out_dir / "all_runs.csv", index=False)

    agg = flatten_columns(aggregate(df))
    if not agg.empty:
        agg.to_csv(args.out_dir / "aggregated.csv", index=False)

    charts = plot_comparisons(df, args.out_dir)
    write_report(df, agg, args.out_dir, charts, skipped_empty)

    print(f"Wrote analysis artifacts to {args.out_dir}")
    print(f"Runs analyzed: {len(df)}")
    print(f"Charts written: {len(charts)}" + (f" ({', '.join(charts)})" if charts else ""))
    if skipped_empty:
        print(
            f"Note: {skipped_empty} run(s) have missing latency or 0 requests "
            "(metrics run with no traffic). Latency charts need successful k6 "
            "traffic while a metrics run is active.",
            file=sys.stderr,
        )
    if not charts:
        print(
            "No plottable metric values found. Re-run load tests with traffic, "
            "then analyze again.",
            file=sys.stderr,
        )
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
