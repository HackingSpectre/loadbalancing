# Progress Tracker

Checklist of project goals. Update status as work completes.

Legend: `[x]` done · `[ ]` pending · `[-]` cancelled

## Core engine

- [x] Modular reverse proxy architecture (Node.js `http`)
- [x] Pluggable scheduler interface isolated from proxy logic
- [x] Round Robin scheduler module
- [x] Least Connections scheduler module (active connection tracking)
- [x] Periodic active health checks
- [x] Request forwarding with backend selection headers
- [x] Runtime algorithm switching via control API

## Backend cluster and environment

- [x] Express.js lightweight backend servers
- [x] Health and metrics endpoints
- [x] Configurable delay, CPU work, and capacity factor
- [x] Docker image for backends
- [x] Homogeneous Docker Compose stack
- [x] Heterogeneous capacity Compose overlay

## Metrics and control plane

- [x] Per-request response time and routing log
- [x] Per-server active connection counts
- [x] Load balancer CPU/memory sampling
- [x] CSV and JSON export per run
- [x] REST API for algorithm, servers, live metrics, runs
- [x] WebSocket live event stream
- [x] Historical run listing and detail API

## Frontend dashboard

- [x] React application with UI/logic separation
- [x] Tailwind CSS 3.4.1 styling
- [x] Live monitor (routing feed, health table, charts)
- [x] Algorithm control and metrics run management
- [x] Comparative results view with Recharts
- [x] Responsive professional operator layout

## Evaluation harness

- [x] k6 steady scenario
- [x] k6 ramp-up scenario
- [x] k6 burst scenario
- [x] k6 single-server failure scenario
- [x] Matrix runner for repeated trials (custom + Nginx)
- [x] Nginx Round Robin reference config
- [x] Nginx Least Connections reference config

## Analysis and documentation

- [x] Python pandas aggregation pipeline
- [x] Matplotlib comparison charts
- [x] Backend metrics collector helper
- [x] docs/overview.md
- [x] docs/installation.md
- [x] docs/running.md
- [x] docs/test.md
- [x] docs/commands.md
- [x] docs/progresstracker.md

## Empirical evaluation (operator-run)

These require executing tests on a machine with dependencies installed.

- [x] Run steady scenario trials for both algorithms on the custom engine
- [x] Run ramp-up scenario trials for both algorithms on the custom engine
- [x] Run burst scenario trials for both algorithms on the custom engine
- [ ] Run heterogeneous capacity trials for both algorithms
- [x] Run failure scenario with health-check recovery observation
- [x] Run matching Nginx baseline trials
- [x] Generate Python analysis charts and interpret algorithm gaps
- [x] Confirm whether algorithm-level ranking is consistent across engines
- [x] Document findings in docs/results.md (2026-07-31 automated run)

## Notes

- Implementation scaffolding and code deliverables are complete in-repo.
- Performance conclusions for the dissertation must be produced by running the matrix and analysis steps in `running.md`.
