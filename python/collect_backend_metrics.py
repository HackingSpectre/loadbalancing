#!/usr/bin/env python3
"""
Optional helper: poll backend /metrics endpoints during a test and write CSV.

Usage:
  python collect_backend_metrics.py --interval 2 --duration 60 --out ../metrics/backend_resources.csv
"""

from __future__ import annotations

import argparse
import csv
import json
import time
import urllib.request
from pathlib import Path


DEFAULT_TARGETS = [
    "http://127.0.0.1:3001/metrics",
    "http://127.0.0.1:3002/metrics",
    "http://127.0.0.1:3003/metrics",
]


def fetch_json(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=2) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--interval", type=float, default=2.0)
    parser.add_argument("--duration", type=float, default=60.0)
    parser.add_argument(
        "--targets",
        nargs="*",
        default=DEFAULT_TARGETS,
        help="Backend metrics URLs",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).resolve().parent.parent
        / "metrics"
        / "backend_resources.csv",
    )
    args = parser.parse_args()

    args.out.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "timestamp",
        "serverId",
        "activeRequests",
        "totalRequests",
        "cpuPercent",
        "rssBytes",
        "heapUsedBytes",
        "capacityFactor",
    ]

    deadline = time.time() + args.duration
    with args.out.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        while time.time() < deadline:
            ts = int(time.time() * 1000)
            for url in args.targets:
                try:
                    data = fetch_json(url)
                    mem = data.get("memory") or {}
                    writer.writerow(
                        {
                            "timestamp": ts,
                            "serverId": data.get("serverId"),
                            "activeRequests": data.get("activeRequests"),
                            "totalRequests": data.get("totalRequests"),
                            "cpuPercent": data.get("cpuPercent"),
                            "rssBytes": mem.get("rssBytes"),
                            "heapUsedBytes": mem.get("heapUsedBytes"),
                            "capacityFactor": data.get("capacityFactor"),
                        }
                    )
                except Exception as exc:  # noqa: BLE001
                    writer.writerow(
                        {
                            "timestamp": ts,
                            "serverId": url,
                            "activeRequests": "",
                            "totalRequests": "",
                            "cpuPercent": "",
                            "rssBytes": "",
                            "heapUsedBytes": "",
                            "capacityFactor": f"error:{exc}",
                        }
                    )
            fh.flush()
            time.sleep(args.interval)

    print(f"Wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
