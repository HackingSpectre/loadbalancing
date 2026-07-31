# Eben Load Balancing Engine

**Performance Evaluation of Load Balancing Algorithms for Web Servers**

Custom reverse-proxy load balancer with pluggable Round Robin and Least Connections schedulers, Express backend cluster, React operator dashboard, k6 harness, Nginx validation baseline, and Python analysis pipeline.

## Quick links

- [Project overview](docs/overview.md)
- [Installation](docs/installation.md)
- [Running and testing](docs/running.md)
- [End-to-end test guide (detailed)](docs/test.md)
- [Commands cheat sheet (copy-paste)](docs/commands.md)
- [Experimental results](docs/results.md)
- [Project report Chapters 1–5 (draft)](docs/report/CHAPTERS_1_TO_5.md)
- [Progress tracker](docs/progresstracker.md)

## Layout

```
load-balancer/   Node.js engine (built-in http only)
backends/        Express backend servers
frontend/        React + Vite + Tailwind 3.4.1 + Recharts
nginx/           Round Robin and least_conn baselines
k6/              Load test scenarios
python/          pandas + matplotlib analysis
docs/            Documentation
metrics/         Experiment outputs (generated)
```

## Ports

| Port | Service |
|------|---------|
| 8080 | Custom load balancer (data plane) |
| 8090 | Control API + WebSocket |
| 5173 | Dashboard |
| 3001-3003 | Backends |
| 8081 | Nginx Round Robin |
| 8082 | Nginx Least Connections |

## Start (after installing dependencies)

```bash
docker compose up --build
```

Then open http://localhost:5173 and follow `docs/running.md`.
