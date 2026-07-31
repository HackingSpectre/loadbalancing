# Commands Reference

Copy-paste commands for the Eben project.  
Every block is something **you** run yourself. Docker Compose does **not** run tests automatically.

**Always start here unless noted:**

```bash
cd /home/spectre/Documents/Works/Projects/eben
```

---

## Table of contents

1. [Project root](#1-project-root)
2. [One-time install](#2-one-time-install)
3. [Docker Compose](#3-docker-compose)
4. [Health checks](#4-health-checks)
5. [Control API (algorithm and metrics runs)](#5-control-api-algorithm-and-metrics-runs)
6. [Scheduler verification](#6-scheduler-verification)
7. [k6 single tests](#7-k6-single-tests)
8. [k6 with saved summary](#8-k6-with-saved-summary)
9. [k6 full matrix](#9-k6-full-matrix)
10. [Failure scenario helpers](#10-failure-scenario-helpers)
11. [Nginx validation (k6)](#11-nginx-validation-k6)
12. [Python analysis](#12-python-analysis)
13. [Local (non-Docker) run](#13-local-non-docker-run)
14. [Inspect results on disk](#14-inspect-results-on-disk)
15. [Stop and clean](#15-stop-and-clean)
16. [Practice loop (shortest full path)](#16-practice-loop-shortest-full-path)

---

## 1. Project root

```bash
cd /home/spectre/Documents/Works/Projects/eben
```

**Purpose:** Move into the project so all relative paths (`k6/`, `metrics/`, `docker-compose.yml`) work.

---

## 2. One-time install

### Check tools

```bash
node -v
npm -v
docker -v
docker compose version
k6 version
python3 --version
```

**Purpose:** Confirm required tools are installed before anything else.

### Backend dependencies

```bash
cd /home/spectre/Documents/Works/Projects/eben/backends
npm install
```

**Purpose:** Install Express for local backend runs (not required if you only use Docker for backends).

### Frontend dependencies

```bash
cd /home/spectre/Documents/Works/Projects/eben/frontend
npm install
```

**Purpose:** Install React/Vite/Tailwind for local dashboard dev (not required if you only use the Docker frontend).

### Python virtualenv and packages

```bash
cd /home/spectre/Documents/Works/Projects/eben
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r python/requirements.txt
```

**Purpose:** Create an isolated Python environment and install pandas/matplotlib for analysis.

### Python packages (if matplotlib build fails on Python 3.14)

```bash
cd /home/spectre/Documents/Works/Projects/eben
source .venv/bin/activate
python -m pip install --upgrade pip
pip install --default-timeout=1000 -r python/requirements.txt
```

**Purpose:** Retry install with newer requirements (wheels) and a longer network timeout.

### Python venv with 3.12 (most reliable if 3.14 still fails)

```bash
sudo apt-get install -y python3.12 python3.12-venv
cd /home/spectre/Documents/Works/Projects/eben
rm -rf .venv
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r python/requirements.txt
```

**Purpose:** Use Python 3.12 so pandas/matplotlib install from prebuilt wheels instead of compiling.

### Activate Python venv later

```bash
cd /home/spectre/Documents/Works/Projects/eben
source .venv/bin/activate
```

**Purpose:** Re-enter the analysis environment in a new terminal.

### Make matrix script executable

```bash
chmod +x /home/spectre/Documents/Works/Projects/eben/k6/run-matrix.sh
```

**Purpose:** Allow `./k6/run-matrix.sh` to run without a permission error.

---

## 3. Docker Compose

### Start full stack (homogeneous, foreground)

```bash
cd /home/spectre/Documents/Works/Projects/eben
docker compose up --build
```

**Purpose:** Build images and start backends, custom load balancer, Nginx RR/LC, and dashboard. Logs stay in this terminal. Does **not** run k6 or Python.

### If Docker build fails with `npm error ETIMEDOUT` (registry.npmjs.org)

This means the **Docker build** cannot download packages from npm (network/proxy), not that your code is wrong.

**Option A – retry normal build after network is better:**

```bash
cd /home/spectre/Documents/Works/Projects/eben
docker compose down
docker compose build --no-cache
docker compose up
```

**Purpose:** Rebuild without cache so npm install runs again with longer timeouts.

**Option B – install Express on the host, then use bind-mount stack (no npm inside Docker build):**

```bash
cd /home/spectre/Documents/Works/Projects/eben/backends
npm install

cd /home/spectre/Documents/Works/Projects/eben
docker compose -f docker-compose.bind.yml up --pull missing
```

**Purpose:** Avoid `RUN npm install` during image build. Host installs `node_modules`; containers only run Node. Still starts backends, load balancer, and Nginx. Dashboard: run separately with `cd frontend && npm install && npm run dev`.

**Option C – fully local (no Docker for app services):**

```bash
# three backends (3 terminals) + load balancer (1 terminal); see Local run section
```

**Purpose:** Skip Docker entirely if registry access from Docker stays broken.

### Start full stack (background)

```bash
cd /home/spectre/Documents/Works/Projects/eben
docker compose up --build -d
```

**Purpose:** Same stack as above, detached so you can keep using the same terminal for k6/curl.

### Start heterogeneous capacity stack

```bash
cd /home/spectre/Documents/Works/Projects/eben
docker compose down
docker compose -f docker-compose.yml -f docker-compose.heterogeneous.yml up --build
```

**Purpose:** Run backends with unequal capacity (for heterogeneous experiments).

### Start heterogeneous stack (background)

```bash
cd /home/spectre/Documents/Works/Projects/eben
docker compose -f docker-compose.yml -f docker-compose.heterogeneous.yml up --build -d
```

**Purpose:** Heterogeneous stack without blocking the terminal.

### List running services

```bash
cd /home/spectre/Documents/Works/Projects/eben
docker compose ps
```

**Purpose:** See which containers are up, healthy, or exited.

### View load balancer logs

```bash
cd /home/spectre/Documents/Works/Projects/eben
docker compose logs load-balancer --tail 50
```

**Purpose:** Debug proxy/API startup and runtime errors.

### View all service logs (follow)

```bash
cd /home/spectre/Documents/Works/Projects/eben
docker compose logs -f
```

**Purpose:** Stream live logs from every Compose service.

### View one backend logs

```bash
cd /home/spectre/Documents/Works/Projects/eben
docker compose logs backend-2 --tail 50
```

**Purpose:** Inspect a specific backend (example: `backend-2`).

### Stop the stack

```bash
cd /home/spectre/Documents/Works/Projects/eben
docker compose down
```

**Purpose:** Stop and remove project containers (keeps images and your `metrics/` files).

### Rebuild one service

```bash
cd /home/spectre/Documents/Works/Projects/eben
docker compose up --build -d load-balancer
```

**Purpose:** Rebuild and restart only the custom load balancer after code changes.

---

## 4. Health checks

### Backend health (direct)

```bash
curl -s http://127.0.0.1:3001/health
curl -s http://127.0.0.1:3002/health
curl -s http://127.0.0.1:3003/health
```

**Purpose:** Confirm each Express backend answers `/health`.

### Custom load balancer data plane

```bash
curl -s http://127.0.0.1:8080/api/work
```

**Purpose:** Send one request through the custom engine and see which `serverId` handled it.

### Control API status

```bash
curl -s http://127.0.0.1:8090/api/status
```

**Purpose:** Read active algorithm, server health, and metrics-run state.

### Pretty-print status (if python3 available)

```bash
curl -s http://127.0.0.1:8090/api/status | python3 -m json.tool
```

**Purpose:** Same as status, formatted for reading.

### List servers from API

```bash
curl -s http://127.0.0.1:8090/api/servers
```

**Purpose:** See healthy flags and active connection counts per backend.

### Nginx Round Robin smoke

```bash
curl -s http://127.0.0.1:8081/api/work
```

**Purpose:** Confirm Nginx RR baseline is proxying.

### Nginx Least Connections smoke

```bash
curl -s http://127.0.0.1:8082/api/work
```

**Purpose:** Confirm Nginx LC baseline is proxying.

### Control API health

```bash
curl -s http://127.0.0.1:8090/api/health
```

**Purpose:** Quick alive check for the control plane only.

---

## 5. Control API (algorithm and metrics runs)

### Switch to Round Robin

```bash
curl -s -X PUT http://127.0.0.1:8090/api/algorithm \
  -H 'Content-Type: application/json' \
  -d '{"name":"round-robin"}'
```

**Purpose:** Make the custom engine use Round Robin for new requests.

### Switch to Least Connections

```bash
curl -s -X PUT http://127.0.0.1:8090/api/algorithm \
  -H 'Content-Type: application/json' \
  -d '{"name":"least-connections"}'
```

**Purpose:** Make the custom engine use Least Connections for new requests.

### Get active algorithm

```bash
curl -s http://127.0.0.1:8090/api/algorithm
```

**Purpose:** Confirm which algorithm is active.

### List algorithms

```bash
curl -s http://127.0.0.1:8090/api/algorithms
```

**Purpose:** List available algorithms and the active one.

### Start metrics run (steady / Round Robin example)

```bash
curl -s -X POST http://127.0.0.1:8090/api/metrics/run/start \
  -H 'Content-Type: application/json' \
  -d '{"algorithm":"round-robin","scenario":"steady","engine":"custom","notes":"trial 1"}'
```

**Purpose:** Begin recording per-request and resource metrics to `metrics/runs/`.

### Start metrics run (Least Connections / burst)

```bash
curl -s -X POST http://127.0.0.1:8090/api/metrics/run/start \
  -H 'Content-Type: application/json' \
  -d '{"algorithm":"least-connections","scenario":"burst","engine":"custom","notes":"trial 1"}'
```

**Purpose:** Start recording for an LC + burst experiment.

### Start metrics run (ramp-up)

```bash
curl -s -X POST http://127.0.0.1:8090/api/metrics/run/start \
  -H 'Content-Type: application/json' \
  -d '{"algorithm":"round-robin","scenario":"ramp-up","engine":"custom"}'
```

**Purpose:** Start recording for a ramp-up experiment.

### Start metrics run (failure)

```bash
curl -s -X POST http://127.0.0.1:8090/api/metrics/run/start \
  -H 'Content-Type: application/json' \
  -d '{"algorithm":"least-connections","scenario":"failure","engine":"custom","notes":"stop backend-2"}'
```

**Purpose:** Start recording for a failure experiment.

### Start metrics run (heterogeneous)

```bash
curl -s -X POST http://127.0.0.1:8090/api/metrics/run/start \
  -H 'Content-Type: application/json' \
  -d '{"algorithm":"least-connections","scenario":"heterogeneous","engine":"custom"}'
```

**Purpose:** Start recording under unequal backend capacity.

### Check if a metrics run is active

```bash
curl -s http://127.0.0.1:8090/api/metrics/run
```

**Purpose:** See active run id and request count so far.

### End metrics run (save to disk)

```bash
curl -s -X POST http://127.0.0.1:8090/api/metrics/run/end \
  -H 'Content-Type: application/json' \
  -d '{}'
```

**Purpose:** Stop recording and write `summary.json`, CSV, and JSON under `metrics/runs/<runId>/`.

### List saved runs

```bash
curl -s http://127.0.0.1:8090/api/metrics/runs
```

**Purpose:** List historical runs available to the dashboard/API.

### Get live metrics snapshot

```bash
curl -s http://127.0.0.1:8090/api/metrics/live
```

**Purpose:** Fetch recent routing events and resource samples without WebSocket.

---

## 6. Scheduler verification

```bash
cd /home/spectre/Documents/Works/Projects/eben
node load-balancer/scripts/verify-schedulers.js
```

**Purpose:** Unit-style check that Round Robin rotates and Least Connections picks lowest active connections. No Docker or k6 required.

---

## 7. k6 single tests

Run these from the **project root** with the stack already up.  
Remember: `-e ALGORITHM=...` only **labels** k6 output. Switch the real algorithm with the Control API (Section 5) first.

### Steady (default: 20 VUs, 60s)

```bash
cd /home/spectre/Documents/Works/Projects/eben
k6 run -e TARGET_URL=http://localhost:8080 -e ALGORITHM=round-robin -e ENGINE=custom k6/steady.js
```

**Purpose:** Constant load against the custom load balancer using Round Robin label.

```bash
k6 run -e TARGET_URL=http://localhost:8080 -e ALGORITHM=least-connections -e ENGINE=custom k6/steady.js
```

**Purpose:** Constant load against the custom load balancer using Least Connections label.

### Steady (short practice)

```bash
k6 run -e TARGET_URL=http://localhost:8080 -e VUS=5 -e DURATION=20s k6/steady.js
```

**Purpose:** Quick low-load practice run (about 20 seconds).

### Steady (heavier)

```bash
k6 run -e TARGET_URL=http://localhost:8080 -e VUS=40 -e DURATION=90s k6/steady.js
```

**Purpose:** Higher constant concurrency for a longer trial.

### Ramp-up (default stages)

```bash
k6 run -e TARGET_URL=http://localhost:8080 -e ALGORITHM=round-robin -e ENGINE=custom k6/ramp-up.js
```

**Purpose:** Gradually increase load, hold peak, then decrease (Round Robin label).

```bash
k6 run -e TARGET_URL=http://localhost:8080 -e ALGORITHM=least-connections -e ENGINE=custom k6/ramp-up.js
```

**Purpose:** Same ramp-up profile with Least Connections label.

### Ramp-up (short practice)

```bash
k6 run -e TARGET_URL=http://localhost:8080 -e PEAK_VUS=10 \
  -e RAMP_UP=10s -e HOLD=15s -e RAMP_DOWN=5s k6/ramp-up.js
```

**Purpose:** Shortened ramp-up for a practice trial.

### Burst (default spikes)

```bash
k6 run -e TARGET_URL=http://localhost:8080 -e ALGORITHM=round-robin -e ENGINE=custom k6/burst.js
```

**Purpose:** Bursty arrival-rate spikes against the custom engine (Round Robin label).

```bash
k6 run -e TARGET_URL=http://localhost:8080 -e ALGORITHM=least-connections -e ENGINE=custom k6/burst.js
```

**Purpose:** Same burst profile with Least Connections label.

### Burst (lighter for weak machines)

```bash
k6 run -e TARGET_URL=http://localhost:8080 \
  -e START_RATE=2 -e BURST_RATE=20 -e PRE_VUS=20 -e MAX_VUS=50 \
  k6/burst.js
```

**Purpose:** Reduced burst intensity so k6 can allocate VUs on limited hardware.

### Failure scenario traffic

```bash
k6 run -e TARGET_URL=http://localhost:8080 -e ALGORITHM=least-connections -e ENGINE=custom k6/failure.js
```

**Purpose:** Generate steady traffic while you manually stop/start a backend (see Section 10).

```bash
k6 run -e TARGET_URL=http://localhost:8080 -e ALGORITHM=round-robin -e ENGINE=custom k6/failure.js
```

**Purpose:** Same failure traffic profile with Round Robin label.

### Failure (shorter)

```bash
k6 run -e TARGET_URL=http://localhost:8080 -e VUS=10 -e DURATION=60s k6/failure.js
```

**Purpose:** Shorter failure experiment window.

---

## 8. k6 with saved summary

### Create output folder

```bash
mkdir -p /home/spectre/Documents/Works/Projects/eben/metrics/k6
```

**Purpose:** Ensure the folder exists for `--summary-export` files.

### Steady + export summary

```bash
cd /home/spectre/Documents/Works/Projects/eben
k6 run \
  -e TARGET_URL=http://localhost:8080 \
  -e ALGORITHM=round-robin \
  -e ENGINE=custom \
  --summary-export=metrics/k6/custom_round-robin_steady_trial1.json \
  k6/steady.js
```

**Purpose:** Run steady load and save k6 client-side metrics to a JSON file for later analysis.

### Least Connections steady + export

```bash
k6 run \
  -e TARGET_URL=http://localhost:8080 \
  -e ALGORITHM=least-connections \
  -e ENGINE=custom \
  --summary-export=metrics/k6/custom_least-connections_steady_trial1.json \
  k6/steady.js
```

**Purpose:** Same as above for Least Connections.

### Ramp-up + export

```bash
k6 run \
  -e TARGET_URL=http://localhost:8080 \
  -e ALGORITHM=round-robin \
  -e ENGINE=custom \
  --summary-export=metrics/k6/custom_round-robin_ramp-up_trial1.json \
  k6/ramp-up.js
```

**Purpose:** Save k6 summary for a ramp-up trial.

### Burst + export

```bash
k6 run \
  -e TARGET_URL=http://localhost:8080 \
  -e ALGORITHM=least-connections \
  -e ENGINE=custom \
  --summary-export=metrics/k6/custom_least-connections_burst_trial1.json \
  k6/burst.js
```

**Purpose:** Save k6 summary for a burst trial.

---

## 9. k6 full matrix

### Default matrix (3 trials, custom + Nginx)

```bash
cd /home/spectre/Documents/Works/Projects/eben
./k6/run-matrix.sh
```

**Purpose:** Automatically run Round Robin and Least Connections across steady, ramp-up, and burst for the custom engine (with metrics start/end) and Nginx baselines. Writes `metrics/k6/` and `metrics/runs/`. Long running.

### Matrix with 1 trial (faster practice)

```bash
cd /home/spectre/Documents/Works/Projects/eben
TRIALS=1 ./k6/run-matrix.sh
```

**Purpose:** Same matrix shape but only one trial per cell (faster dry run).

### Matrix with 5 trials

```bash
TRIALS=5 ./k6/run-matrix.sh
```

**Purpose:** More statistical repeats for final evaluation.

### Matrix with custom k6 output directory

```bash
OUT_DIR=/home/spectre/Documents/Works/Projects/eben/metrics/k6 TRIALS=3 ./k6/run-matrix.sh
```

**Purpose:** Explicitly set where k6 summary JSON files are written.

### Matrix with custom URLs (if ports differ)

```bash
CUSTOM_URL=http://localhost:8080 \
API_URL=http://localhost:8090 \
NGINX_RR_URL=http://localhost:8081 \
NGINX_LC_URL=http://localhost:8082 \
./k6/run-matrix.sh
```

**Purpose:** Point the matrix at non-default hosts/ports.

---

## 10. Failure scenario helpers

Use while `k6/failure.js` is running in another terminal.

### Stop backend 2 mid-test

```bash
docker stop eben-backend-2
```

**Purpose:** Inject a single-server failure so health checks mark the backend down and traffic redistributes.

### Start backend 2 again

```bash
docker start eben-backend-2
```

**Purpose:** Restore the failed server so it can become healthy again.

### Stop backend 1 or 3 (alternatives)

```bash
docker stop eben-backend-1
docker start eben-backend-1
```

```bash
docker stop eben-backend-3
docker start eben-backend-3
```

**Purpose:** Fail a different backend if needed.

### Check container status

```bash
docker ps -a --filter name=eben-backend
```

**Purpose:** See which backend containers are running or stopped.

---

## 11. Nginx validation (k6)

### Nginx Round Robin steady

```bash
cd /home/spectre/Documents/Works/Projects/eben
mkdir -p metrics/k6
k6 run \
  -e TARGET_URL=http://localhost:8081 \
  -e ALGORITHM=round-robin \
  -e ENGINE=nginx \
  --summary-export=metrics/k6/nginx_round-robin_steady_trial1.json \
  k6/steady.js
```

**Purpose:** Run the same steady workload against Nginx Round Robin (port 8081) and save the summary.

### Nginx Least Connections steady

```bash
k6 run \
  -e TARGET_URL=http://localhost:8082 \
  -e ALGORITHM=least-connections \
  -e ENGINE=nginx \
  --summary-export=metrics/k6/nginx_least-connections_steady_trial1.json \
  k6/steady.js
```

**Purpose:** Run the same steady workload against Nginx Least Connections (port 8082) and save the summary.

### Nginx ramp-up (RR)

```bash
k6 run \
  -e TARGET_URL=http://localhost:8081 \
  -e ALGORITHM=round-robin \
  -e ENGINE=nginx \
  --summary-export=metrics/k6/nginx_round-robin_ramp-up_trial1.json \
  k6/ramp-up.js
```

**Purpose:** Ramp-up workload on Nginx Round Robin.

### Nginx ramp-up (LC)

```bash
k6 run \
  -e TARGET_URL=http://localhost:8082 \
  -e ALGORITHM=least-connections \
  -e ENGINE=nginx \
  --summary-export=metrics/k6/nginx_least-connections_ramp-up_trial1.json \
  k6/ramp-up.js
```

**Purpose:** Ramp-up workload on Nginx Least Connections.

### Nginx burst (RR)

```bash
k6 run \
  -e TARGET_URL=http://localhost:8081 \
  -e ALGORITHM=round-robin \
  -e ENGINE=nginx \
  --summary-export=metrics/k6/nginx_round-robin_burst_trial1.json \
  k6/burst.js
```

**Purpose:** Burst workload on Nginx Round Robin.

### Nginx burst (LC)

```bash
k6 run \
  -e TARGET_URL=http://localhost:8082 \
  -e ALGORITHM=least-connections \
  -e ENGINE=nginx \
  --summary-export=metrics/k6/nginx_least-connections_burst_trial1.json \
  k6/burst.js
```

**Purpose:** Burst workload on Nginx Least Connections.

---

## 12. Python analysis

### Run full analysis pipeline

```bash
cd /home/spectre/Documents/Works/Projects/eben
source .venv/bin/activate
python python/analyze.py --metrics-dir metrics --out-dir metrics/analysis
```

**Purpose:** Aggregate `metrics/runs/` and `metrics/k6/` into CSV tables, PNG charts, and `report.md`.

### Analysis with absolute paths

```bash
source /home/spectre/Documents/Works/Projects/eben/.venv/bin/activate
python /home/spectre/Documents/Works/Projects/eben/python/analyze.py \
  --metrics-dir /home/spectre/Documents/Works/Projects/eben/metrics \
  --out-dir /home/spectre/Documents/Works/Projects/eben/metrics/analysis
```

**Purpose:** Same analysis using full paths (works from any directory).

### Collect backend CPU/memory while a test runs

```bash
cd /home/spectre/Documents/Works/Projects/eben
source .venv/bin/activate
python python/collect_backend_metrics.py --duration 90 --interval 2 \
  --out metrics/backend_resources.csv
```

**Purpose:** Poll each backend `/metrics` every 2 seconds for 90 seconds and write a CSV (run this in parallel with k6).

### Collect backend metrics for 3 minutes

```bash
python python/collect_backend_metrics.py --duration 180 --interval 2 \
  --out metrics/backend_resources.csv
```

**Purpose:** Longer sampling window for longer load tests.

### Open analysis folder

```bash
ls /home/spectre/Documents/Works/Projects/eben/metrics/analysis
```

**Purpose:** List generated charts and CSVs after analysis.

---

## 13. Local (non-Docker) run

Use only if you are not using Compose for some services.

### Start three backends (homogeneous)

```bash
cd /home/spectre/Documents/Works/Projects/eben/backends
npm install

SERVER_ID=server-1 PORT=3001 BASE_DELAY_MS=25 WORK_ITERS=50000 CAPACITY_FACTOR=1 npm start
```

```bash
cd /home/spectre/Documents/Works/Projects/eben/backends
SERVER_ID=server-2 PORT=3002 BASE_DELAY_MS=25 WORK_ITERS=50000 CAPACITY_FACTOR=1 npm start
```

```bash
cd /home/spectre/Documents/Works/Projects/eben/backends
SERVER_ID=server-3 PORT=3003 BASE_DELAY_MS=25 WORK_ITERS=50000 CAPACITY_FACTOR=1 npm start
```

**Purpose:** Run three equal-capacity backends on the host (one terminal each).

### Start three backends (heterogeneous)

```bash
SERVER_ID=server-1 PORT=3001 CAPACITY_FACTOR=1   WORK_ITERS=40000 npm start
```

```bash
SERVER_ID=server-2 PORT=3002 CAPACITY_FACTOR=0.5 WORK_ITERS=40000 npm start
```

```bash
SERVER_ID=server-3 PORT=3003 CAPACITY_FACTOR=0.25 WORK_ITERS=40000 npm start
```

**Purpose:** Unequal capacity backends without Docker resource limits.

### Start load balancer locally

```bash
cd /home/spectre/Documents/Works/Projects/eben/load-balancer
LB_BACKENDS='server-1:http://127.0.0.1:3001,server-2:http://127.0.0.1:3002,server-3:http://127.0.0.1:3003' \
LB_METRICS_DIR='/home/spectre/Documents/Works/Projects/eben/metrics' \
npm start
```

**Purpose:** Run the custom engine on the host (ports 8080 and 8090 by default).

### Start dashboard locally

```bash
cd /home/spectre/Documents/Works/Projects/eben/frontend
npm install
npm run dev
```

**Purpose:** Vite dev server for the React dashboard (usually http://localhost:5173).

---

## 14. Inspect results on disk

### List custom engine runs

```bash
ls /home/spectre/Documents/Works/Projects/eben/metrics/runs
```

**Purpose:** See saved experiment folders after ending metrics runs.

### List files inside latest-style path (replace RUN_ID)

```bash
ls /home/spectre/Documents/Works/Projects/eben/metrics/runs/RUN_ID
```

**Purpose:** Confirm `summary.json`, `requests.csv`, and resource files exist for one run.

### View a run summary

```bash
python3 -m json.tool /home/spectre/Documents/Works/Projects/eben/metrics/runs/RUN_ID/summary.json
```

**Purpose:** Print mean, p95, p99, throughput, error rate for one run (replace `RUN_ID`).

### List k6 summaries

```bash
ls /home/spectre/Documents/Works/Projects/eben/metrics/k6
```

**Purpose:** See all k6 `--summary-export` / matrix JSON files.

### List analysis outputs

```bash
ls /home/spectre/Documents/Works/Projects/eben/metrics/analysis
```

**Purpose:** See charts and CSVs after `analyze.py`.

---

## 15. Stop and clean

### Stop Compose stack

```bash
cd /home/spectre/Documents/Works/Projects/eben
docker compose down
```

**Purpose:** Stop all project containers.

### Stop and remove volumes (careful)

```bash
docker compose down -v
```

**Purpose:** Stop containers and remove named volumes. Does not delete your host `metrics/` folder bind mount content unless you delete files yourself.

### Delete generated metrics (careful: loses experiment data)

```bash
rm -rf /home/spectre/Documents/Works/Projects/eben/metrics/runs/*
rm -rf /home/spectre/Documents/Works/Projects/eben/metrics/k6/*
rm -rf /home/spectre/Documents/Works/Projects/eben/metrics/analysis/*
```

**Purpose:** Clear old experiment outputs before a fresh evaluation campaign.

---

## 16. Practice loop (shortest full path)

Stack must already be running (`docker compose up --build -d`).

```bash
cd /home/spectre/Documents/Works/Projects/eben

# Verify algorithms
node load-balancer/scripts/verify-schedulers.js

# Round Robin + short steady + save metrics
curl -s -X PUT http://127.0.0.1:8090/api/algorithm \
  -H 'Content-Type: application/json' \
  -d '{"name":"round-robin"}'

curl -s -X POST http://127.0.0.1:8090/api/metrics/run/start \
  -H 'Content-Type: application/json' \
  -d '{"algorithm":"round-robin","scenario":"steady","engine":"custom","notes":"practice"}'

k6 run -e TARGET_URL=http://localhost:8080 -e VUS=5 -e DURATION=20s k6/steady.js

curl -s -X POST http://127.0.0.1:8090/api/metrics/run/end \
  -H 'Content-Type: application/json' \
  -d '{}'

# See saved run
ls metrics/runs/
```

**Purpose:** One complete custom-engine cycle: algorithm check, switch, record, load test, export, list results.

### Practice: then Least Connections

```bash
curl -s -X PUT http://127.0.0.1:8090/api/algorithm \
  -H 'Content-Type: application/json' \
  -d '{"name":"least-connections"}'

curl -s -X POST http://127.0.0.1:8090/api/metrics/run/start \
  -H 'Content-Type: application/json' \
  -d '{"algorithm":"least-connections","scenario":"steady","engine":"custom","notes":"practice"}'

k6 run -e TARGET_URL=http://localhost:8080 -e VUS=5 -e DURATION=20s k6/steady.js

curl -s -X POST http://127.0.0.1:8090/api/metrics/run/end \
  -H 'Content-Type: application/json' \
  -d '{}'
```

**Purpose:** Same short loop for Least Connections so you can compare two runs on the Results page.

### Practice: analyze whatever you have

```bash
source .venv/bin/activate
python python/analyze.py --metrics-dir metrics --out-dir metrics/analysis
ls metrics/analysis
```

**Purpose:** Turn completed runs into CSV/charts once you have data.

---

## URLs for the browser

| Page | URL |
|------|-----|
| Dashboard home (Live Monitor) | http://localhost:5173/ |
| Algorithm Control | http://localhost:5173/control |
| Results | http://localhost:5173/results |

**Purpose:** Operator UI for switching algorithms, watching routing, and viewing saved runs (alternative to many curl commands).

---

## Related docs

| File | Use when |
|------|----------|
| `docs/test.md` | Full step-by-step testing narrative |
| `docs/running.md` | Shorter run overview |
| `docs/installation.md` | Installing tools and packages |
| `docs/commands.md` | This file: copy-paste commands only |
