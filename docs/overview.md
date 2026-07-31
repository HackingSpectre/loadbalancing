# Project Overview

## Title

Performance Evaluation of Load Balancing Algorithms for Web Servers

## Purpose

This project designs, implements, and empirically evaluates a custom load balancing engine built from first principles. Scheduling algorithm performance can be measured in isolation from the internal engineering of pre-built products such as HAProxy or Nginx. A React operator dashboard supports algorithm selection, live routing and health monitoring, and comparative result visualization after each test run.

## Problem Statement

Existing evaluation studies often implement algorithms inside full-featured reverse proxies. Observed differences in latency, throughput, or resource use may then reflect connection handling and event-loop design rather than the scheduling policy itself. This work closes that gap by implementing multiple algorithms behind one controlled engine where only the scheduling module changes between experiments.

## Aim

Design, implement, and empirically evaluate a custom load balancing engine that supports two request distribution algorithms, and determine their comparative performance for web server clusters under varying load conditions.

## Objectives

1. Design a modular reverse-proxy architecture with a pluggable scheduling interface.
2. Implement Round Robin and Least Connections as interchangeable modules.
3. Build a controlled Express.js backend cluster and workload environment, including heterogeneous capacity.
4. Build a React dashboard for algorithm control, live monitoring, and comparative charts.
5. Evaluate algorithms using response time, throughput, CPU and memory utilization, and error rate under steady, bursty, and heterogeneous conditions.
6. Validate custom engine behavior against equivalent Nginx Round Robin and Least Connections configurations.

## System Architecture

| Component | Location | Role |
|-----------|----------|------|
| Load balancer core | `load-balancer/` | Node.js reverse proxy (`http`), health checks, metrics, REST + WebSocket control plane |
| Schedulers | `load-balancer/src/schedulers/` | Pluggable Round Robin and Least Connections |
| Backend cluster | `backends/` | Express.js servers with configurable delay/work and capacity factor |
| Operator dashboard | `frontend/` | React + Vite + Tailwind 3.4.1 + Recharts |
| Load tests | `k6/` | Steady, ramp-up, burst, and failure scenarios |
| Nginx baseline | `nginx/` | Round Robin and `least_conn` reference configs |
| Analysis | `python/` | pandas aggregation and matplotlib charts |
| Metrics output | `metrics/` | CSV/JSON run exports and k6 summaries |
| Orchestration | `docker-compose.yml` | Reproducible multi-service environment |

### Traffic planes

- **Data plane** (port 8080): client and k6 traffic through the custom reverse proxy.
- **Control plane** (port 8090): REST API and WebSocket for the dashboard. Separated so control traffic does not confound measured load.

### Isolation of scheduling logic

Proxying, health checking, metrics, and API code never embed algorithm-specific branching. The proxy always calls `scheduler.select({ servers })`. Algorithms only implement selection (and optional start/end hooks). This keeps the algorithm the sole experimental variable.

## Algorithms

### Round Robin

Fixed cyclic rotation through the healthy server pool. Connection counts are not used.

### Least Connections

Selects the healthy server with the fewest active in-flight requests. Ties break by lexicographic server id for deterministic behavior.

## Evaluation metrics

- Response time: mean, p50, p95, p99
- Throughput (requests per second)
- Error rate
- Load balancer CPU and memory (process samples)
- Backend CPU/memory via `/metrics` and optional `collect_backend_metrics.py`
- Per-server request distribution

## Validation baseline

Nginx containers expose:

- Port 8081: Round Robin (default upstream)
- Port 8082: Least Connections (`least_conn`)

Both share the same backend pool as the custom engine so algorithm-level gaps can be compared across engines under matched workloads.

## Repository layout

```
eben/
  load-balancer/     Custom engine (zero npm dependencies at runtime)
  backends/          Express backend image and source
  frontend/          React operator dashboard
  nginx/             Reference Nginx configs
  k6/                Load test scripts and matrix runner
  python/            Analysis pipeline
  docs/              Documentation
  metrics/           Generated experiment data (runtime)
  docker-compose.yml
  docker-compose.heterogeneous.yml
```
