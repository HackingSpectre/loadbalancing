# Experimental Results

**Project:** Performance Evaluation of Load Balancing Algorithms for Web Servers  
**Date of run:** 2026-07-31  
**Environment:** Pop!_OS Linux, Docker Compose bind-mount stack (`docker-compose.bind.yml`)  
**Load generator:** Node concurrent HTTP runner (`k6/node-load-runner.mjs` via `k6/run-evaluation.mjs`)  
**Note:** Host `k6` binary was not installed; an equivalent concurrent HTTP load runner was used with the same scenarios, VUs, and targets. Summaries are k6-compatible JSON under `metrics/k6/`.

---

## 1. What was run

### Infrastructure

| Component | Endpoint |
|-----------|----------|
| Custom load balancer (data plane) | `http://127.0.0.1:8080` |
| Control API | `http://127.0.0.1:8090` |
| Backend pool | 3× Express (`server-1`…`server-3`), homogeneous capacity |
| Nginx Round Robin | `http://127.0.0.1:8081` |
| Nginx Least Connections | `http://127.0.0.1:8082` |

### Scenarios

| Scenario | Virtual users | Duration | Target |
|----------|---------------|----------|--------|
| Steady | 20 | 45 s | Custom + Nginx |
| Ramp-up (higher concurrency) | 30 | 50 s | Custom + Nginx |
| Burst (high concurrency) | 40 | 40 s | Custom + Nginx |
| Single server failure | 20 | 70 s | Custom only (`docker stop/start eben-backend-2` mid-run) |

### Algorithms

- Round Robin  
- Least Connections  

Each custom-engine test used: switch algorithm → start metrics run → load → end metrics run (CSV/JSON under `metrics/runs/`).

### Artifacts produced

| Path | Contents |
|------|----------|
| `metrics/runs/custom_*` | Per-request server-side exports + `summary.json` |
| `metrics/k6/*.json` | Client-side latency/throughput/error summaries |
| `metrics/analysis/*.png` | Matplotlib charts |
| `metrics/analysis/all_runs.csv` | Combined table |
| `metrics/analysis/client_summary_table.csv` | Client-side comparison table |
| `metrics/analysis/report.md` | Auto report from `analyze.py` |

---

## 2. Client-side results (load generator)

These numbers are measured at the client (includes network and full response path).

### 2.1 Custom engine

| Scenario | Algorithm | Requests | Throughput (RPS) | Mean (ms) | p95 (ms) | p99 (ms) | Error rate |
|----------|-----------|----------|------------------|-----------|----------|----------|------------|
| Steady | Round Robin | 29,098 | 646.3 | 30.87 | 39 | 50 | 0.000% |
| Steady | Least Connections | 27,704 | 615.2 | 32.43 | 43 | 55 | 0.000% |
| Ramp-up | Round Robin | 43,916 | 878.1 | 34.09 | 47 | 58 | 0.000% |
| Ramp-up | Least Connections | 41,971 | 838.8 | 35.68 | 49 | 63 | 0.000% |
| Burst | Round Robin | 38,686 | 966.4 | 41.30 | 60 | 82 | 0.000% |
| Burst | Least Connections | 39,651 | 990.3 | 40.30 | 55 | 73 | 0.000% |
| Failure | Round Robin | 41,393 | 591.1 | 33.76 | 38 | 46 | **14.280%** |
| Failure | Least Connections | 40,780 | 582.4 | 34.27 | 39 | 47 | **0.191%** |

### 2.2 Nginx validation baseline

| Scenario | Algorithm | Requests | Throughput (RPS) | Mean (ms) | p95 (ms) | Error rate |
|----------|-----------|----------|------------------|-----------|----------|------------|
| Steady | Round Robin | 32,369 | 719.0 | 27.75 | 31 | 0% |
| Steady | Least Connections | 32,055 | 711.9 | 28.02 | 32 | 0% |
| Ramp-up | Round Robin | 49,406 | 987.5 | 30.32 | 49 | 0% |
| Ramp-up | Least Connections | 49,066 | 980.8 | 30.53 | 49 | 0% |
| Burst | Round Robin | 50,815 | 1,269.4 | 31.45 | 55 | 0% |
| Burst | Least Connections | 51,829 | 1,294.2 | 30.84 | 51 | 0% |

---

## 3. Custom engine server-side summaries

Recorded by the load balancer metrics module while traffic was active (slightly different from client-side because measurement point differs).

| Scenario | Algorithm | Requests | Mean (ms) | p95 (ms) | Throughput (RPS) | Error rate | Request share (s1 / s2 / s3) |
|----------|-----------|----------|-----------|----------|------------------|------------|------------------------------|
| Steady | RR | 29,098 | 27.86 | 32 | 644.8 | 0% | 9699 / 9700 / 9699 |
| Steady | LC | 27,704 | 28.47 | 33 | 613.7 | 0% | 9724 / 9542 / 8438 |
| Ramp-up | RR | 43,916 | 29.13 | 36 | 875.5 | 0% | 14639 / 14638 / 14639 |
| Ramp-up | LC | 41,971 | 29.99 | 38 | 836.2 | 0% | 14337 / 14024 / 13610 |
| Burst | RR | 38,686 | 32.22 | 43 | 962.8 | 0% | 12895 / 12896 / 12895 |
| Burst | LC | 39,651 | 32.27 | 42 | 987.4 | 0% | 13682 / 13206 / 12763 |
| Failure | RR | 41,393 | 31.26 | 32 | 590.0 | **14.27%** | 12318 / 10905 / 12318 |
| Failure | LC | 40,780 | 32.12 | 32 | 581.5 | **0.17%** | 15863 / 11053 / 13864 |

Round Robin request shares are essentially equal (as expected). Least Connections is near-equal under homogeneous capacity, with modest imbalance.

---

## 4. Interpretation

### 4.1 Homogeneous cluster (steady, ramp-up, burst)

Under equal backend capacity and equal work per request:

- Round Robin and Least Connections show **similar** mean and p95 latency.  
- Differences are small (typically a few milliseconds) and can reverse between scenarios (e.g. RR slightly better on steady/ramp-up; LC slightly better on burst throughput and p95 in this trial).  
- **Conclusion for homogeneous load:** scheduling algorithm is not a strong differentiator when servers are identical and healthy. That matches theory: Least Connections mainly helps when backlog or capacity differs.

### 4.2 Single server failure (strongest algorithm signal)

While `eben-backend-2` was stopped mid-test:

| Metric | Round Robin | Least Connections |
|--------|-------------|-------------------|
| Client error rate | **14.28%** | **0.19%** |
| Server-side error rate | **14.27%** | **0.17%** |

Round Robin keeps rotating onto the dead server until health checks remove it (and still loses every turn assigned to that node during the outage window). Least Connections avoided sustained error rates in this run, keeping almost all traffic successful after failures and health updates.

**Conclusion:** Under failure, Least Connections delivered **far lower error rate** than Round Robin in this experiment. Latency for successful requests stayed comparable.

### 4.3 Custom engine vs Nginx (validation)

- Nginx achieved **higher throughput** and **slightly lower mean latency** than the custom engine under the same client load settings. That is expected: Nginx is a highly optimized C reverse proxy; the custom engine is Node.js built for **algorithm isolation**, not raw proxy performance.  
- **Algorithm ranking under healthy homogeneous load** is consistent across engines: RR and LC stay close; neither dominates by a large margin on mean/p95.  
- Burst: both engines show LC with slightly higher RPS and slightly lower mean/p95 than RR in this trial (small gap).  

**Validation takeaway:** Absolute numbers differ by engine (implementation confound), but the **relative algorithm gap pattern** under healthy equal servers remains small on both engines. The large custom-engine gap appears under **failure**, which is algorithm-relevant and should be highlighted in the dissertation.

### 4.4 Request distribution

- **Round Robin:** nearly perfect 1/3 split when all servers healthy.  
- **Least Connections:** close to even under homogeneous delay; slight skew is consistent with connection-tracking dynamics under concurrent load.

---

## 5. Charts generated

Matplotlib outputs (open these files):

| File | Description |
|------|-------------|
| `metrics/analysis/mean_response_time.png` | Mean latency by engine / algorithm / scenario |
| `metrics/analysis/p95_response_time.png` | p95 latency comparison |
| `metrics/analysis/throughput.png` | Throughput (RPS) |
| `metrics/analysis/error_rate.png` | Error rates (failure scenario stands out) |
| `metrics/analysis/custom_algorithm_gap.png` | Custom engine RR vs LC by scenario |
| `metrics/analysis/validation_mean.png` | Custom vs Nginx mean latency |
| `metrics/analysis/validation_throughput.png` | Custom vs Nginx throughput |

Regenerate anytime with:

```bash
source .venv/bin/activate
python python/analyze.py --metrics-dir metrics --out-dir metrics/analysis
```

---

## 6. Limitations (for academic honesty)

1. **One trial per cell** in this automated pass (not 3× repeats). Variance is not fully characterized.  
2. **Homogeneous backends only** in this run (heterogeneous Compose overlay not executed in this session).  
3. **Load tool:** Node concurrent runner instead of k6 binary; workload is still concurrent HTTP GETs to `/api/work` with fixed VU/duration profiles.  
4. **Nginx** was not subjected to the same server-failure injection (only custom engine).  
5. Early empty runs (`run-1785383729155`, `run-1785383761828`) with 0 requests remain on disk and appear as NaN latency rows; they do not affect the valid custom_* runs.  
6. Failure-scenario error gap is large and important, but one trial; re-run 2–3 times for the dissertation if possible.

---

## 7. Recommendations for the write-up

1. Report **homogeneous healthy** results as: algorithms perform similarly; algorithm is not the main latency driver.  
2. Report **failure** results as the primary place Least Connections outperforms Round Robin (error rate).  
3. Use Nginx numbers to argue that **absolute** performance differs by engine, while **healthy-cluster algorithm ranking** stays consistent (small gaps).  
4. Optionally re-run with `docker-compose.heterogeneous.yml` to show Least Connections shifting load under unequal capacity.  
5. Optionally increase trials (`TRIALS=3`) for confidence intervals.

---

## 8. How this session was executed

```text
1. docker compose -f docker-compose.bind.yml up -d
2. node k6/run-evaluation.mjs
   - custom: RR/LC × steady, ramp-up, burst (+ metrics start/end)
   - custom: RR/LC × failure (stop/start backend-2)
   - nginx: RR/LC × steady, ramp-up, burst
3. python python/analyze.py --metrics-dir metrics --out-dir metrics/analysis
4. This document: docs/results.md
```

**Total active evaluation wall time:** about **12 minutes** of load generation, plus analysis under 1 minute.

---

## 9. Bottom line

| Question | Answer from this run |
|----------|----------------------|
| Which algorithm is better under equal healthy servers? | Essentially a **tie** on latency/throughput |
| Which is better under single-server failure? | **Least Connections** (error rate ~0.2% vs ~14% for RR) |
| Is the custom engine comparable to Nginx at algorithm level? | **Yes on ranking** under healthy load (both show small RR/LC gaps); Nginx is faster in absolute RPS/latency |
| Are full charts available? | **Yes** under `metrics/analysis/` |

Stack was left running after the tests so the dashboard can still be used if desired. Stop with:

```bash
docker compose -f docker-compose.bind.yml down
```
