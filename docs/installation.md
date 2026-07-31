# Installation

Install the following on a Linux development machine (Docker Desktop or Engine recommended). Do not skip version floors if you hit compatibility issues.

## Required software

| Software | Suggested version | Purpose |
|----------|-------------------|---------|
| Git | 2.x | Version control |
| Node.js | 20 LTS (minimum 18) | Load balancer, backends, frontend tooling |
| npm | 10.x (bundled with Node) | Install JS dependencies |
| Docker Engine | 24+ | Container runtime |
| Docker Compose | v2 plugin | Multi-service stack |
| k6 | 0.50+ | Load generation |
| Python | 3.11+ | Result analysis |
| pip | matching Python | Python packages |

## Optional software

| Software | Purpose |
|----------|---------|
| curl | Control API smoke checks |
| make | Convenience (not required; no Makefile is mandatory) |

## Install Node.js (example: nvm)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# restart shell, then:
nvm install 20
node -v
npm -v
```

## Install Docker and Compose

Follow the official docs for your distribution:

- https://docs.docker.com/engine/install/
- Ensure `docker compose version` works

Add your user to the `docker` group if needed, then re-login:

```bash
sudo usermod -aG docker "$USER"
```

## Install k6

Examples:

```bash
# Debian/Ubuntu (see k6 docs for current package source)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

Or use the official install guide: https://grafana.com/docs/k6/latest/set-up/install-k6/

## Install Python packages

Recommended Python: **3.11 or 3.12**. Python **3.14** is very new; older pins such as `matplotlib==3.9.2` have no binary wheel for it and try (and often fail) to compile from source.

From the project root:

```bash
cd /home/spectre/Documents/Works/Projects/eben
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r python/requirements.txt
```

### If `matplotlib` metadata-generation fails

Symptoms: pip downloads `matplotlib-3.9.2.tar.gz`, then Meson errors about `qhull` hash or network.

**Fix 1 (preferred):** use the updated `python/requirements.txt` (unpinned recent matplotlib with wheels), upgrade pip, reinstall:

```bash
cd /home/spectre/Documents/Works/Projects/eben
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r python/requirements.txt
```

**Fix 2:** recreate the venv with Python 3.12 if installed:

```bash
sudo apt-get install -y python3.12 python3.12-venv
cd /home/spectre/Documents/Works/Projects/eben
rm -rf .venv
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r python/requirements.txt
```

**Fix 3:** longer download timeout on slow networks:

```bash
pip install --default-timeout=1000 -r python/requirements.txt
```

## Install project JavaScript dependencies

### Load balancer

No third-party packages. Uses Node built-in modules only.

```bash
cd load-balancer
# no npm install required
```

### Backends

```bash
cd backends
npm install
```

### Frontend

```bash
cd frontend
npm install
```

## Environment variables (optional)

### Load balancer

| Variable | Default | Description |
|----------|---------|-------------|
| `LB_HOST` | `0.0.0.0` | Data plane bind address |
| `LB_PORT` | `8080` | Data plane port |
| `API_HOST` | `0.0.0.0` | Control plane bind address |
| `API_PORT` | `8090` | Control plane port |
| `LB_ALGORITHM` | `round-robin` | Initial algorithm |
| `LB_BACKENDS` | local 3001-3003 | Comma-separated `id:url` list |
| `LB_METRICS_DIR` | `../metrics` | Export directory |
| `LB_HEALTH_PATH` | `/health` | Active probe path |
| `LB_HEALTH_INTERVAL_MS` | `2000` | Probe interval |
| `LB_CORS_ORIGINS` | `*` | CORS allow list |

### Frontend (Vite)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:8090` | Control API base |
| `VITE_WS_URL` | `ws://localhost:8090/ws` | Live WebSocket URL |

### Backends

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_ID` | derived from port | Backend identity in responses |
| `PORT` | `3000` | Listen port |
| `BASE_DELAY_MS` | `20` | Base artificial delay |
| `WORK_ITERS` | `0` | CPU burn iterations |
| `CAPACITY_FACTOR` | `1` | Heterogeneous capacity scalar |

## Verify installations

```bash
node -v
npm -v
docker -v
docker compose version
k6 version
python3 --version
```

After installing JS and Python deps, continue with [running.md](./running.md).
