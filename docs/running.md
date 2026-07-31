# Running and Testing End to End

Project root:

```bash
cd /home/spectre/Documents/Works/Projects/eben
```

## Option A: Docker Compose (recommended for full stack)

### Homogeneous cluster

```bash
docker compose up --build
```

Services:

| Service | Host port |
|---------|-----------|
| Custom load balancer (data) | 8080 |
| Control API + WebSocket | 8090 |
| Backend 1/2/3 | 3001/3002/3003 |
| Nginx Round Robin | 8081 |
| Nginx Least Connections | 8082 |
| Dashboard (static) | 5173 |

### Heterogeneous capacity

```bash
docker compose -f docker-compose.yml -f docker-compose.heterogeneous.yml up --build
```

Stop the stack:

```bash
docker compose down
```

## Option B: Local processes (development)

### 1. Start three backends

```bash
cd backends && npm install

SERVER_ID=server-1 PORT=3001 BASE_DELAY_MS=25 WORK_ITERS=50000 CAPACITY_FACTOR=1 npm start &
SERVER_ID=server-2 PORT=3002 BASE_DELAY_MS=25 WORK_ITERS=50000 CAPACITY_FACTOR=1 npm start &
SERVER_ID=server-3 PORT=3003 BASE_DELAY_MS=25 WORK_ITERS=50000 CAPACITY_FACTOR=1 npm start &
```

Heterogeneous example:

```bash
CAPACITY_FACTOR=1   WORK_ITERS=40000 SERVER_ID=server-1 PORT=3001 npm start &
CAPACITY_FACTOR=0.5 WORK_ITERS=40000 SERVER_ID=server-2 PORT=3002 npm start &
CAPACITY_FACTOR=0.25 WORK_ITERS=40000 SERVER_ID=server-3 PORT=3003 npm start &
```

### 2. Start the load balancer

```bash
cd load-balancer
LB_BACKENDS='server-1:http://127.0.0.1:3001,server-2:http://127.0.0.1:3002,server-3:http://127.0.0.1:3003' \
LB_METRICS_DIR="$(pwd)/../metrics" \
npm start
```

### 3. Start the dashboard

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Smoke checks

```bash
# Backend health
curl -s http://127.0.0.1:3001/health

# Proxied request
curl -s http://127.0.0.1:8080/api/work

# Control API status
curl -s http://127.0.0.1:8090/api/status | python3 -m json.tool

# Switch algorithm
curl -s -X PUT http://127.0.0.1:8090/api/algorithm \
  -H 'Content-Type: application/json' \
  -d '{"name":"least-connections"}'

# Scheduler unit-style verification (no deps)
node load-balancer/scripts/verify-schedulers.js
```

## Operator workflow (dashboard)

1. Open **Algorithm Control**.
2. Select **Round Robin** or **Least Connections**.
3. Choose a scenario label and click **Start metrics run**.
4. Generate traffic with k6 (below) or any HTTP client against port 8080.
5. Watch **Live Monitor** for routing feed, health, and resource charts.
6. Click **End and export** when the test finishes.
7. Open **Results** to inspect summaries and compare runs.

## Load testing with k6

Single scenario against the custom engine:

```bash
# Start a metrics run first (dashboard or API), then:
k6 run -e TARGET_URL=http://localhost:8080 -e ALGORITHM=round-robin k6/steady.js
k6 run -e TARGET_URL=http://localhost:8080 -e ALGORITHM=least-connections k6/ramp-up.js
k6 run -e TARGET_URL=http://localhost:8080 k6/burst.js
```

Failure scenario (manual fault injection):

```bash
# Terminal 1
k6 run -e TARGET_URL=http://localhost:8080 k6/failure.js

# Terminal 2 (about 20s after start)
docker stop eben-backend-2
# later
docker start eben-backend-2
```

Full matrix (custom + Nginx baselines, repeated trials):

```bash
chmod +x k6/run-matrix.sh
./k6/run-matrix.sh
```

Outputs:

- k6 summaries: `metrics/k6/*.json`
- Custom engine exports: `metrics/runs/<runId>/` (`requests.csv`, `requests.json`, `resources.csv`, `summary.json`)

## Nginx validation

With Compose running:

```bash
# Round Robin baseline
k6 run -e TARGET_URL=http://localhost:8081 -e ENGINE=nginx -e ALGORITHM=round-robin k6/steady.js

# Least Connections baseline
k6 run -e TARGET_URL=http://localhost:8082 -e ENGINE=nginx -e ALGORITHM=least-connections k6/steady.js
```

Compare ranking of algorithms (for example mean and p95 latency, throughput, error rate) between custom ports 8080 and Nginx 8081/8082 under the same scenario parameters.

## Python analysis

```bash
source .venv/bin/activate   # if using a venv
python python/analyze.py --metrics-dir metrics --out-dir metrics/analysis
```

Artifacts under `metrics/analysis/`:

- `all_runs.csv`, `aggregated.csv`
- `mean_response_time.png`, `p95_response_time.png`, `throughput.png`, `error_rate.png`
- `custom_algorithm_gap.png`
- `validation_mean.png`, `validation_throughput.png` (when Nginx k6 results exist)
- `report.md`

Optional backend resource sampling during a test:

```bash
python python/collect_backend_metrics.py --duration 90 --out metrics/backend_resources.csv
```

## Suggested experimental matrix

| Scenario | Algorithms | Engines | Notes |
|----------|------------|---------|-------|
| Steady | RR, LC | custom, nginx | Homogeneous backends |
| Ramp-up | RR, LC | custom, nginx | Homogeneous |
| Burst | RR, LC | custom, nginx | Homogeneous |
| Failure | RR, LC | custom | Stop one backend mid-test |
| Heterogeneous | RR, LC | custom | Use heterogeneous compose overlay |

Repeat each cell at least three trials (`TRIALS=3` in `run-matrix.sh`).

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Dashboard cannot connect | Control API on 8090; `VITE_API_BASE_URL` / `VITE_WS_URL` |
| 503 from proxy | All backends unhealthy; inspect `/api/servers` |
| Uneven Docker networking | Use Compose service DNS names in `LB_BACKENDS` |
| No results in UI | End metrics run after traffic; refresh Results |
| Frontend Docker build API URL wrong | Rebuild with build args for public host URLs |
