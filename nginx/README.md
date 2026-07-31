# Nginx Validation Baseline

These configurations provide an equivalent Round Robin and Least Connections baseline against the same backend pool used by the custom engine.

| File | Algorithm | Compose service | Host port |
|------|-----------|-----------------|-----------|
| `round-robin.conf` | Round Robin (Nginx default) | `nginx-rr` | 8081 |
| `least-conn.conf` | Least Connections (`least_conn`) | `nginx-lc` | 8082 |

Custom load balancer data plane: port **8080**.

Use identical k6 scenarios against 8080, 8081, and 8082 to compare algorithm-level gaps across engines.
