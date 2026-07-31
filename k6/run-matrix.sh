#!/usr/bin/env bash
# Run the full evaluation matrix against the custom engine and optional Nginx baselines.
# Does not start Docker services; assumes the stack is already up.
#
# Usage:
#   chmod +x k6/run-matrix.sh
#   ./k6/run-matrix.sh
#
# Environment overrides:
#   CUSTOM_URL   default http://localhost:8080
#   API_URL      default http://localhost:8090
#   NGINX_RR_URL default http://localhost:8081
#   NGINX_LC_URL default http://localhost:8082
#   TRIALS       default 3
#   OUT_DIR      default ./metrics/k6

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CUSTOM_URL="${CUSTOM_URL:-http://localhost:8080}"
API_URL="${API_URL:-http://localhost:8090}"
NGINX_RR_URL="${NGINX_RR_URL:-http://localhost:8081}"
NGINX_LC_URL="${NGINX_LC_URL:-http://localhost:8082}"
TRIALS="${TRIALS:-3}"
OUT_DIR="${OUT_DIR:-$ROOT/metrics/k6}"
SCENARIOS=(steady ramp-up burst)
ALGORITHMS=(round-robin least-connections)

mkdir -p "$OUT_DIR"

start_run() {
  local algo="$1"
  local scenario="$2"
  local engine="$3"
  local run_id="$4"
  curl -sS -X POST "$API_URL/api/metrics/run/start" \
    -H 'Content-Type: application/json' \
    -d "{\"algorithm\":\"$algo\",\"scenario\":\"$scenario\",\"engine\":\"$engine\",\"runId\":\"$run_id\"}" \
    >/dev/null || true
}

end_run() {
  curl -sS -X POST "$API_URL/api/metrics/run/end" \
    -H 'Content-Type: application/json' \
    -d '{}' >/dev/null || true
}

set_algo() {
  local algo="$1"
  curl -sS -X PUT "$API_URL/api/algorithm" \
    -H 'Content-Type: application/json' \
    -d "{\"name\":\"$algo\"}" >/dev/null
}

run_k6() {
  local script="$1"
  local target="$2"
  local algo="$3"
  local engine="$4"
  local scenario="$5"
  local trial="$6"
  local outfile="$OUT_DIR/${engine}_${algo}_${scenario}_trial${trial}.json"

  k6 run \
    -e "TARGET_URL=$target" \
    -e "ALGORITHM=$algo" \
    -e "ENGINE=$engine" \
    --summary-export="$outfile" \
    "$ROOT/k6/${script}.js"
}

echo "Eben k6 evaluation matrix"
echo "Custom LB: $CUSTOM_URL"
echo "Output:    $OUT_DIR"
echo

for algo in "${ALGORITHMS[@]}"; do
  for scenario in "${SCENARIOS[@]}"; do
    for trial in $(seq 1 "$TRIALS"); do
      echo "==> custom | $algo | $scenario | trial $trial"
      set_algo "$algo"
      run_id="custom_${algo}_${scenario}_t${trial}_$(date +%s)"
      start_run "$algo" "$scenario" "custom" "$run_id"
      run_k6 "$scenario" "$CUSTOM_URL" "$algo" "custom" "$scenario" "$trial"
      end_run
      sleep 2
    done
  done
done

# Nginx baselines: RR service maps to round-robin; LC service maps to least-connections
for trial in $(seq 1 "$TRIALS"); do
  for scenario in "${SCENARIOS[@]}"; do
    echo "==> nginx | round-robin | $scenario | trial $trial"
    run_k6 "$scenario" "$NGINX_RR_URL" "round-robin" "nginx" "$scenario" "$trial"
    sleep 2

    echo "==> nginx | least-connections | $scenario | trial $trial"
    run_k6 "$scenario" "$NGINX_LC_URL" "least-connections" "nginx" "$scenario" "$trial"
    sleep 2
  done
done

echo
echo "Matrix complete. Summaries in $OUT_DIR"
echo "Custom engine per-request exports are under $ROOT/metrics/runs/"
