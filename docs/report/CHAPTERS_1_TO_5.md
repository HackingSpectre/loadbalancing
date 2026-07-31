# PERFORMANCE EVALUATION OF LOAD BALANCING ALGORITHMS FOR WEB SERVERS

**Student:** Michael Soromtochukwu Ebenezer  
**Matriculation Number:** 20/59435U/1  
**Department:** Computer Science, Faculty of Computing  
**Institution:** Abubakar Tafawa Balewa University, Bauchi, Bauchi State, Nigeria  
**Supervisor:** Prof. Abdussalam Yau Gital  
**Degree:** Bachelor of Technology (B.Tech.) in Computer Science  
**Year:** 2026  

---

# TABLE OF CONTENTS

1.0 CHAPTER ONE: INTRODUCTION  
2.0 CHAPTER TWO: LITERATURE REVIEW  
3.0 CHAPTER THREE: SYSTEM ANALYSIS AND DESIGN  
4.0 CHAPTER FOUR: SYSTEM IMPLEMENTATION  
5.0 CHAPTER FIVE: SUMMARY, CONCLUSION AND RECOMMENDATION  
REFERENCES  
APPENDICES  

---

# 1.0 CHAPTER ONE: INTRODUCTION

## 1.1 Background of the Study

The rapid expansion of the World Wide Web has transformed how individuals, businesses, and institutions access information and deliver digital services. As the number of users of a web application grows, a single server is often unable to process the resulting volume of requests without a decline in responsiveness. Distributed computing addresses this limitation by allowing multiple servers to jointly handle client requests. Load balancing is the mechanism that governs how those requests are shared among the available servers (Wira Harjanti, Setiyani, & Trianto, 2022).

Load balancing is a fundamental concept in distributed systems and network engineering. It refers to the process of distributing incoming client requests across a pool of backend servers so that no single server is overloaded while available computing resources are used efficiently. A load balancer sits logically between clients and the server pool. It intercepts each request and applies a scheduling algorithm to decide which server should handle it.

Scheduling algorithms range from simple static approaches such as Round Robin to dynamic, state-aware approaches such as Least Connections. Each algorithm makes different assumptions about server capacity, request cost, and network conditions, and therefore performs differently depending on the nature of the workload. Key technologies relevant to this project include reverse proxy architectures, HTTP request handling, containerization for reproducible test environments, and load testing tools used to generate controlled traffic for performance measurement.

Over the past decade, cloud computing, containerization, and microservice architectures have intensified interest in load balancing research. Modern web systems are commonly deployed as clusters of services behind a load balancer, making the choice of scheduling algorithm consequential for latency, throughput, and fault tolerance (Shahid, Alam, & Su'ud, 2023). Within recent literature, two broad directions are visible: empirical comparison of established algorithms under realistic workloads, and adaptive or intelligent load balancing that uses machine learning or resource awareness (Gures, Shayea, Ergen, Azmi, & El-Saleh, 2022; Al Reshan et al., 2023).

This project designs, implements, and empirically evaluates a custom load balancing engine that supports multiple request distribution algorithms, so that reliable, controlled evidence can be obtained on how those algorithms compare under varying web traffic conditions. To make the system observable and easy to demonstrate, the engine is paired with a React-based operator dashboard that allows selection of the active algorithm, viewing of request routing and server health in real time, and visualization of comparative performance results after test runs complete.

## 1.2 Statement of the Problem

Existing performance evaluation studies on load balancing algorithms for web servers largely rely on pre-built load balancer software such as HAProxy or Nginx to implement and compare scheduling algorithms. While convenient, this approach introduces a confound: differences observed in response time, throughput, or resource utilization may result from the internal engineering of the load balancer software itself, such as its connection handling model or event loop implementation, rather than from the scheduling algorithm under test (Wira Harjanti et al., 2022). Consequently, the specific contribution of each algorithm to overall performance cannot be isolated with confidence.

There is a limited body of work that implements multiple load balancing algorithms from first principles within a single, controlled software engine, so that the only variable changed between experiments is the scheduling logic itself. This gap makes it difficult for developers and system administrators, particularly those operating small and resource-constrained web infrastructure, to obtain algorithm-level evidence when selecting a load balancing strategy.

This project addresses that gap by building a modular reverse-proxy load balancer in which Round Robin and Least Connections are interchangeable modules behind a common scheduler interface. Core proxying, health checking, and metrics collection remain constant across experiments, so that measured differences can be attributed more confidently to the scheduling policy.

## 1.3 Aim and Objectives of the Study

### Aim

The aim of this project is to design, implement, and empirically evaluate a custom-built load balancing engine that supports two request distribution algorithms, in order to determine their comparative performance for web server clusters under varying load conditions.

### Specific Objectives

1. To design a modular, reverse proxy based load balancer architecture with a pluggable scheduling interface that allows algorithms to be switched without altering the core request handling logic.  
2. To implement two load balancing algorithms, namely Round Robin and Least Connections, as interchangeable modules within the custom load balancing engine.  
3. To develop a controlled backend web server cluster and workload generation environment that allows repeatable, scenario-based testing, including configurations for homogeneous and heterogeneous server capacity.  
4. To design and implement a React-based frontend dashboard that allows an operator to select the active scheduling algorithm, monitor live request routing and server health, and visualize comparative performance results.  
5. To evaluate and compare the implemented algorithms using response time, throughput, CPU and memory utilization, and error rate, under steady, bursty, and failure-related load conditions.  
6. To validate the custom engine's Round Robin and Least Connections behavior against equivalent Nginx configurations running the same algorithms, to check whether algorithm-level performance patterns are consistent across engines.

**Note on scope relative to the proposal:** The approved project proposal outlined four algorithms (Round Robin, Weighted Round Robin, Least Connections, and Least Response Time). For controlled depth and delivery within the project timeline, the implemented and fully evaluated algorithms are **Round Robin** and **Least Connections**, which are the most widely used static and dynamic baselines in production and in comparative literature. The architecture remains pluggable so that additional algorithms can be added without redesigning the proxy core.

## 1.4 The Scope of the Study

This study is limited to the following:

1. **Application-layer (HTTP) reverse proxy load balancing** implemented in Node.js using the built-in `http` module, not Layer 4 TCP balancing alone and not commercial hardware appliances.  
2. **Two scheduling algorithms:** Round Robin and Least Connections.  
3. **A backend cluster** of lightweight Express.js servers containerized with Docker, with optional capacity factors for homogeneous and heterogeneous setups.  
4. **Performance metrics:** mean and percentile response times (including p95 and p99 where available), throughput (requests per second), error rate, load balancer process resource samples, and per-server request distribution.  
5. **Traffic scenarios:** steady load, ramp-up (higher concurrency), burst (high concurrency), and single-server failure injection.  
6. **Validation baseline:** Nginx configured with default Round Robin and `least_conn` against the same backend pool.  
7. **Operator interface:** a React dashboard for algorithm control, live monitoring, and results viewing.  
8. **Environment:** local Linux development and Docker Compose based laboratory setup (not multi-region cloud production deployment).

The study does not cover commercial cloud load balancers as primary implementation targets, does not claim production hardening for multi-tenant security, and does not implement machine learning based adaptive routing.

## 1.5 Significance of the Study

This study is significant at academic, practical, and methodological levels.

**Academically,** it contributes an empirical dataset and a reusable benchmarking framework to an area where many comparisons are confounded by third-party load balancer engines. The Department of Computer Science can use the prototype as a reference implementation for coursework and further research in distributed systems and network engineering.

**Practically,** the prototype and findings provide system administrators, backend developers, and small technology teams with evidence-based guidance on algorithm behavior under different traffic patterns, without requiring expensive commercial appliances. This is relevant to startups and public institutions operating self-hosted infrastructure with constrained budgets.

**Methodologically,** the unique contribution is holding the load balancer engine constant while varying only the scheduling module, combined with a multi-scenario test harness (steady, burst, ramp-up, and failure) and an optional Nginx validation baseline. This design improves the credibility of claims about algorithm-level effects.

**Societally,** better understanding of load balancing contributes to more reliable and available web services in education, government, and commerce as online service demand continues to grow.

## 1.6 Definition of Terms

| Term | Definition |
|------|------------|
| **Load balancing** | Distribution of incoming client requests across multiple backend servers to improve performance and availability. |
| **Load balancer** | Software (or hardware) component that receives client requests and forwards each request to a selected backend server. |
| **Reverse proxy** | A proxy server that sits in front of backend servers and handles client requests on their behalf. |
| **Round Robin (RR)** | A static scheduling algorithm that assigns requests in cyclic order through the healthy server pool. |
| **Least Connections (LC)** | A dynamic scheduling algorithm that assigns each request to the healthy server with the fewest active in-flight connections. |
| **Backend server** | An application server in the pool that processes requests and returns responses. |
| **Throughput** | Number of successfully handled requests per unit time (here, requests per second). |
| **Response time (latency)** | Time from request arrival (or client send) until response completion, measured in milliseconds. |
| **p95 / p99** | The 95th and 99th percentiles of response time; 95% or 99% of requests finish at or below that value. |
| **Error rate** | Fraction of requests that fail (for example connection errors or HTTP 5xx). |
| **Health check** | Periodic probe used to mark a backend as healthy or unhealthy for scheduling. |
| **Homogeneous cluster** | Backend servers with equal capacity and configuration. |
| **Heterogeneous cluster** | Backend servers with unequal capacity or resource limits. |
| **Data plane** | Path that carries measured client traffic through the load balancer (port 8080 in this system). |
| **Control plane** | Path used for operator API and live dashboard events (port 8090), separated from measured traffic. |
| **Nginx** | Open-source web server and reverse proxy used here as a validation baseline for RR and Least Connections. |

---

# 2.0 CHAPTER TWO: LITERATURE REVIEW

## 2.1 Introduction

This chapter reviews literature related to load balancing for web and cloud systems. It covers concepts of load balancing, classifications of algorithms, empirical comparison studies, intelligent and resource-aware approaches, and software tools commonly used in practice. The chapter closes by identifying the research gap that motivates the present work.

## 2.2 Concept of Load Balancing

Load balancing is the process of allocating work among multiple computing resources so that overall system performance and reliability improve (Shahid et al., 2023). In web systems, load balancers typically operate at Layer 4 (transport) or Layer 7 (application). Layer 7 reverse proxies can inspect HTTP headers and paths and are widely used for modern web clusters (Nginx, HAProxy documentation traditions).

Early load balancing used DNS Round Robin, which rotates IP addresses returned for a hostname but lacks real-time load awareness and fine-grained failure reaction. Dedicated hardware load balancers later provided high performance at high cost. Software load balancers became dominant in cloud and container environments because they are flexible, scriptable, and integrable with orchestration platforms.

## 2.3 Classification of Load Balancing Algorithms

Algorithms are commonly classified as:

1. **Static algorithms** decide routing without continuous feedback on current server load. Round Robin and Weighted Round Robin are typical examples. They are simple and predictable but can overload a slow server if request costs vary.  
2. **Dynamic algorithms** use runtime state such as active connections or measured response times. Least Connections and Least Response Time belong to this class. They adapt better to uneven load but require accurate state tracking.  
3. **Adaptive / intelligent algorithms** use optimization or machine learning to predict load or request cost (Gures et al., 2022; Rahimov & Aghayev, 2026). These approaches are promising but harder to reproduce and explain for small controlled studies.

This project focuses on one canonical static algorithm (Round Robin) and one canonical dynamic algorithm (Least Connections), which form the baseline pair used in many industrial and academic comparisons (Wira Harjanti et al., 2022).

## 2.4 Round Robin Algorithm

Round Robin distributes requests in a fixed cyclic order: server 1, server 2, server 3, then back to server 1. Implementation typically maintains an index into the healthy server list and advances the index after each selection. Advantages include simplicity, fairness under equal request costs, and low overhead. Disadvantages appear when servers differ in capacity or when long-running requests accumulate unevenly: the algorithm still gives equal share of *requests*, not equal share of *work*.

## 2.5 Least Connections Algorithm

Least Connections selects the server with the fewest active concurrent connections (or in-flight requests). The intuition is that a server with fewer active requests is likely freer to accept new work. Implementation requires incrementing a counter when a request starts and decrementing when it completes or fails. Ties are broken by a deterministic rule (for example, server identifier order) for reproducible experiments.

Empirical studies often report that Least Connections outperforms Round Robin when request service times vary or when servers are heterogeneous, while the two algorithms may perform similarly under homogeneous short requests (Wira Harjanti et al., 2022; Shahid et al., 2023).

## 2.6 Empirical Comparison Studies

Wira Harjanti et al. (2022) compared Round Robin and Least Connection for server service response time and found performance differences dependent on workload. Shahid et al. (2023) evaluated load-balancing algorithms with different service broker policies in cloud settings and again reported that no single algorithm dominates all scenarios. These findings support multi-scenario evaluation rather than a single synthetic benchmark.

A methodological issue across many studies is that algorithms are evaluated *as implemented inside* production load balancer products. Observed differences may then mix algorithm effects with engine effects (event loop, connection pooling, TLS offload, and so on). The present project is designed specifically to reduce that confound.

## 2.7 Adaptive and Resource-Aware Load Balancing

Gures et al. (2022) surveyed machine learning based load balancing in heterogeneous networks. Al Reshan et al. (2023) proposed a globally optimized approach for cloud load balancing. Hussain, Aleem, Ur Rehman, and Arshad (2025) presented a dynamic resource-aware algorithm (DE-RALBA) for cloud environments. Kumar, Marston, Sen, and Narisetty (2022) discussed greening cloud networks through load balancing mechanisms. Rahimov and Aghayev (2026) compared Round Robin, Weighted Round Robin, and a machine learning approach for predictive load balancing.

These works show active research interest in intelligence and optimization. They also show that classic algorithms remain the baseline against which new methods are judged. Building a transparent classic baseline engine is therefore complementary to intelligent approaches: it provides a clean measurement platform and a teaching tool.

## 2.8 Software Load Balancers in Practice

**Nginx** offers Round Robin by default and Least Connections via the `least_conn` directive. **HAProxy** provides rich Layer 4/7 balancing with many algorithms. **Traefik** and **Envoy** emphasize cloud-native routing and service discovery. **Managed cloud balancers** (for example AWS Elastic Load Balancing) abstract algorithm details further.

These tools excel in production. For *algorithm research*, their closed or complex internals make it harder to guarantee that only the scheduling policy changes between experiments. The proposed system therefore implements scheduling as isolated modules while still validating against Nginx for external credibility.

## 2.9 Metrics and Evaluation Methodology

Standard metrics in web load balancing evaluation include average and percentile latency, throughput, error rate, and resource utilization (CPU, memory). Percentiles such as p95 and p99 are important because averages can hide tail latency that dominates user experience. Controlled load tools (Apache JMeter, k6, custom concurrent clients) generate repeatable traffic. Containerization (Docker) improves environment reproducibility (Wira Harjanti et al., 2022).

## 2.10 Research Gap

From the review, the following gap is identified:

1. Many comparisons evaluate algorithms only inside commercial or production load balancers, so engine and algorithm effects are mixed.  
2. Few open academic prototypes combine (a) first-principles multi-algorithm scheduling, (b) scenario-based automated testing, (c) live operator dashboard, and (d) external validation against Nginx under matched backends.  
3. Operators of small infrastructures still need transparent, reproducible evidence for choosing between simple algorithms under steady load versus failure conditions.

This project addresses that gap with a modular custom engine, two well-known algorithms, multi-scenario experiments, a React dashboard, and Nginx validation.

## 2.11 Summary of Literature Review

Load balancing is essential for scalable web systems. Round Robin and Least Connections remain foundational algorithms with different strengths. Empirical literature shows scenario-dependent performance and motivates controlled experimentation. Intelligent approaches are active research areas but rest on classical baselines. The present study implements a controlled classical baseline engine and evaluates it under multiple load conditions with transparent metrics and validation.

---

# 3.0 CHAPTER THREE: SYSTEM ANALYSIS AND DESIGN

## 3.1 Methodology Adopted

This project adopts a **structured systems development methodology** with experimental evaluation, combining elements of the waterfall stages (requirements, design, implementation, testing) with iterative refinement during implementation. The methodological steps are:

1. **Requirements gathering** from the approved proposal, literature, and evaluation goals.  
2. **System analysis** of existing load balancer approaches (HAProxy, Nginx, managed balancers).  
3. **System design** of architecture, modules, data flow, and algorithm interfaces.  
4. **Implementation** of load balancer core, algorithms, backends, API, dashboard, and test harness.  
5. **Experimentation** under defined scenarios with recorded metrics.  
6. **Analysis** using statistical aggregation and charts.  
7. **Validation** against Nginx with equivalent algorithms.  
8. **Documentation** of design, results, and recommendations.

The experimental component follows a controlled comparison design: the **independent variable** is the scheduling algorithm; **dependent variables** include mean and percentile latency, throughput, and error rate; **controlled factors** include backend pool, request path, and load profile for a given scenario.

## 3.2 Analysis of the Existing System

### 3.2.1 Description of Existing Systems

Organizations commonly rely on:

- **Nginx / HAProxy** configuration of built-in algorithms.  
- **Cloud managed load balancers** with limited transparency.  
- **DNS Round Robin** for crude distribution without live health awareness.

These systems solve production routing well but are not optimized as research instruments for isolating algorithm effects.

### 3.2.2 Strengths of Existing Systems

- High performance and maturity.  
- Rich operational features (TLS, sticky sessions, advanced health checks).  
- Broad community and documentation.

### 3.2.3 Weaknesses Relevant to This Study

- Scheduling logic is not easily isolated or modified for teaching and research.  
- Comparative experiments may reflect engine engineering differences.  
- Purpose-built algorithm comparison dashboards are usually absent or external.

### 3.2.4 Comparative Summary

| Existing system | Algorithm transparency | Visualization | Gap filled by proposed system |
|-----------------|------------------------|---------------|--------------------------------|
| HAProxy | Built into engine; hard to isolate | Basic stats | Swappable algorithm modules in one engine |
| Nginx | Config directives only | Needs third-party tools | Research-oriented dashboard for comparison |
| Traefik | Limited classic set | Routing status focus | Explicit RR vs LC evaluation focus |
| Managed cloud LB | Black box | Traffic/health only | Full algorithm-level control |

[INSERT DIAGRAM: Comparative diagram of existing load balancer approaches versus the proposed custom evaluation engine]

## 3.3 The Proposed System Design

The proposed system is a **custom reverse-proxy load balancing evaluation platform** consisting of:

1. **Load balancer core (Node.js):** accepts HTTP requests, selects a backend via the active scheduler, proxies the request, tracks connections, runs health checks, and records metrics.  
2. **Scheduler modules:** Round Robin and Least Connections behind a shared interface (`select(servers)`).  
3. **Backend cluster:** Express.js servers with `/health`, `/metrics`, and `/api/*` workload endpoints.  
4. **Control plane:** REST API and WebSocket on a separate port for algorithm switching, live events, and historical runs.  
5. **React dashboard:** Live Monitor, Control, and Results pages.  
6. **Test harness:** scripted concurrent load scenarios and matrix runner.  
7. **Nginx baselines:** Round Robin and Least Connections for validation.  
8. **Analysis pipeline:** Python (pandas, matplotlib) for aggregation and charts.

### 3.3.1 Functional Requirements

1. The system shall forward HTTP requests to healthy backends according to the active algorithm.  
2. The system shall allow runtime switching between Round Robin and Least Connections.  
3. The system shall mark backends unhealthy after consecutive failed health checks.  
4. The system shall record per-request metrics when a metrics run is active.  
5. The dashboard shall display live routing and server health.  
6. The system shall export metrics for offline analysis.  
7. Nginx baselines shall serve the same backend pool for comparison.

### 3.3.2 Non-Functional Requirements

1. **Modularity:** algorithms isolated from proxy core.  
2. **Reproducibility:** Docker Compose based environment.  
3. **Observability:** live events and exportable CSV/JSON.  
4. **Usability:** professional operator UI.  
5. **Separability of traffic:** data plane vs control plane ports.

## 3.4 The Architecture / Model

### 3.4.1 High-Level Architecture

Client and load-test traffic enter the **data plane** (port 8080). The reverse proxy asks the active scheduler for a backend, increments active connections, proxies the request, then decrements connections and records metrics. The **control plane** (port 8090) serves the dashboard API and WebSocket stream without mixing into measured traffic.

[INSERT DIAGRAM: High-level system architecture showing Clients/Load Generator → Custom Load Balancer (schedulers, health checks, metrics) → Backend servers 1–3; Control plane → React Dashboard; parallel Nginx RR/LC paths to same backends]

### 3.4.2 Module Design

| Module | Responsibility |
|--------|----------------|
| `proxy/reverseProxy.js` | HTTP reverse proxying |
| `schedulers/*` | RR and LC selection logic |
| `health/healthChecker.js` | Active health probes |
| `metrics/collector.js` | Request and resource samples, CSV/JSON export |
| `api/controlServer.js` | REST + WebSocket control plane |
| `backends/src/server.js` | Express workload servers |
| `frontend/*` | Operator UI |
| `nginx/*` | Validation configs |
| `k6/*` / node load runner | Traffic generation |
| `python/analyze.py` | Offline charts |

[INSERT DIAGRAM: Component/module diagram of the load balancer package structure]

### 3.4.3 Data Flow

1. Client request arrives at load balancer.  
2. Scheduler selects backend among healthy servers.  
3. `activeConnections` increments.  
4. Request is proxied; response returns to client.  
5. `activeConnections` decrements; metrics record is written if a run is active.  
6. Dashboard receives routing and health events over WebSocket.

[INSERT DIAGRAM: Sequence diagram of a single proxied request (client → LB → backend → LB → client) with scheduler select and metrics hooks]

## 3.5 Design Flowchart / Algorithm

### 3.5.1 Round Robin Selection Algorithm (Pseudocode)

```
index ← 0
function select(servers):
    healthy ← filter servers where healthy = true
    if healthy is empty:
        return null
    chosen ← healthy[index mod length(healthy)]
    index ← (index + 1) mod length(healthy)
    return chosen
```

[INSERT DIAGRAM: Flowchart of Round Robin algorithm]

### 3.5.2 Least Connections Selection Algorithm (Pseudocode)

```
function select(servers):
    healthy ← filter servers where healthy = true
    if healthy is empty:
        return null
    best ← healthy[0]
    for each s in healthy[1..]:
        if s.activeConnections < best.activeConnections:
            best ← s
        else if s.activeConnections = best.activeConnections and s.id < best.id:
            best ← s
    return best
```

[INSERT DIAGRAM: Flowchart of Least Connections algorithm]

### 3.5.3 Request Handling Flowchart

[INSERT DIAGRAM: Flowchart of reverse proxy request handling including health gate, scheduler select, proxy error paths, and metrics completion]

### 3.5.4 Experimental Procedure Flowchart

[INSERT DIAGRAM: Flowchart of evaluation procedure: start stack → set algorithm → start metrics run → generate load → end metrics run → analyze → compare with Nginx]

## 3.6 The Advantage of the New System

1. **Algorithm isolation:** only the scheduler module changes between experiments.  
2. **Transparency:** scheduling logic is open source and readable for academic review.  
3. **Pluggability:** new algorithms can be registered without rewriting proxy logic.  
4. **Observability:** live dashboard plus CSV/JSON exports and Python charts.  
5. **Reproducibility:** Docker-based cluster and scripted load scenarios.  
6. **Validation path:** same backends behind Nginx RR and LC for cross-engine comparison.  
7. **Educational value:** clear mapping from theory (RR vs LC) to running code and measured results.

---

# 4.0 CHAPTER FOUR: SYSTEM IMPLEMENTATION

This chapter presents the implemented system: development environment, module interfaces, summary of key code structures, experimental setup, **results (Section 4.1)**, and **discussion (Section 4.2)**.

## 4.0.1 Development Environment

| Item | Details |
|------|---------|
| Operating system | Linux (Pop!_OS / Ubuntu family) |
| Load balancer runtime | Node.js 18+ (implemented with Node 20 in containers) |
| Backend framework | Express.js |
| Frontend | React 18, Vite, Tailwind CSS 3.4.1, Recharts |
| Containers | Docker, Docker Compose |
| Validation proxy | Nginx 1.27 Alpine |
| Analysis | Python 3, pandas, matplotlib |
| Version control | Git |

## 4.0.2 Implementation Overview

### Load balancer core

The reverse proxy uses Node.js `http` to accept client requests, filter hop-by-hop headers, select a backend, and stream the response. On start and end of each proxied request, the server pool updates `activeConnections`, which Least Connections reads during selection.

### Scheduler interface

Each algorithm implements `name`, `label`, and `select(context)`. A scheduler manager holds the active algorithm and supports runtime switching via `PUT /api/algorithm`.

### Health checking

Active probes call each backend `/health` on an interval. After consecutive failures a server is marked unhealthy and excluded from selection; consecutive successes restore it.

### Metrics and control plane

`POST /api/metrics/run/start` and `.../end` bound experimental recording. Exports include `requests.csv`, `resources.csv`, and `summary.json` per run. WebSocket `/ws` streams routing, health, and resource events to the dashboard.

### Backend servers

Express servers expose `/health`, `/metrics`, and `/api/*` with configurable base delay, CPU work iterations, and capacity factor.

### Frontend dashboard

Three main views:

1. **Live Monitor** – stats, distribution chart, resource chart, server health table, routing feed.  
2. **Control** – algorithm selection and metrics run management.  
3. **Results** – historical runs and comparative charts (Recharts).

[INSERT DIAGRAM / SCREENSHOT: Live Monitor page of the React dashboard]

[INSERT DIAGRAM / SCREENSHOT: Control page showing Round Robin and Least Connections selection]

[INSERT DIAGRAM / SCREENSHOT: Results page with comparative metrics]

### Summary code structures (illustrative)

**Round Robin selection (summary):**

```javascript
// load-balancer/src/schedulers/roundRobin.js (summary)
select(context) {
  const healthy = getHealthyServers(context.servers);
  if (healthy.length === 0) return null;
  const selected = healthy[this._index % healthy.length];
  this._index = (this._index + 1) % healthy.length;
  return selected;
}
```

**Least Connections selection (summary):**

```javascript
// load-balancer/src/schedulers/leastConnections.js (summary)
select(context) {
  const healthy = getHealthyServers(context.servers);
  // choose minimum activeConnections; tie-break by server id
  return best;
}
```

**Proxy scheduling call (summary):**

```javascript
// load-balancer/src/proxy/reverseProxy.js (summary)
const scheduler = this.schedulerManager.getActive();
const target = scheduler.select({ servers: this.serverPool.forScheduler() });
this.serverPool.beginRequest(target);
// ... proxy request ...
this.serverPool.endRequest(target, isError);
```

[INSERT DIAGRAM: Screenshot or code structure tree of the repository folders: load-balancer, backends, frontend, nginx, k6, python]

## 4.0.3 Experimental Setup

| Parameter | Value used in main evaluation |
|-----------|-------------------------------|
| Backends | 3 Express servers, homogeneous capacity |
| Workload path | `GET /api/work` |
| Steady | 20 virtual users, 45 s |
| Ramp-up (higher load) | 30 virtual users, 50 s |
| Burst | 40 virtual users, 40 s |
| Failure | 20 virtual users, 70 s; stop `backend-2` mid-run, then restart |
| Custom LB | `http://127.0.0.1:8080` |
| Nginx RR / LC | ports 8081 / 8082 |
| Trials | one trial per cell in the automated campaign (limitations noted in Chapter 5) |

Load generation used a concurrent Node HTTP runner with k6-compatible summary export when the host `k6` binary was unavailable. Custom-engine tests always used: set algorithm → start metrics run → load → end metrics run.

---

## 4.1 RESULTS

This section presents experimental results of the implementation. Tables report measured values. Figures should be inserted from `metrics/analysis/`.

### 4.1.1 Functional Results

1. The custom load balancer correctly forwarded requests and attached routing metadata headers.  
2. Algorithm switching via API and dashboard took effect for new requests.  
3. Health checks marked a stopped backend unhealthy and restored it after restart.  
4. Metrics runs exported summaries under `metrics/runs/`.  
5. Dashboard Live Monitor displayed routing events and server health.  
6. Nginx RR and LC successfully proxied the same backend pool.

[INSERT DIAGRAM / SCREENSHOT: Sample live routing feed during a test]

[INSERT DIAGRAM / SCREENSHOT: Server health table with one server unhealthy during failure test]

### 4.1.2 Custom Engine – Client-Side Performance Results

**Table 4.1: Custom load balancer client-side results**

| Scenario | Algorithm | Requests | Throughput (RPS) | Mean (ms) | p95 (ms) | p99 (ms) | Error rate (%) |
|----------|-----------|----------|------------------|-----------|----------|----------|----------------|
| Steady | Round Robin | 29,098 | 646.3 | 30.87 | 39 | 50 | 0.000 |
| Steady | Least Connections | 27,704 | 615.2 | 32.43 | 43 | 55 | 0.000 |
| Ramp-up | Round Robin | 43,916 | 878.1 | 34.09 | 47 | 58 | 0.000 |
| Ramp-up | Least Connections | 41,971 | 838.8 | 35.68 | 49 | 63 | 0.000 |
| Burst | Round Robin | 38,686 | 966.4 | 41.30 | 60 | 82 | 0.000 |
| Burst | Least Connections | 39,651 | 990.3 | 40.30 | 55 | 73 | 0.000 |
| Failure | Round Robin | 41,393 | 591.1 | 33.76 | 38 | 46 | **14.280** |
| Failure | Least Connections | 40,780 | 582.4 | 34.27 | 39 | 47 | **0.191** |

[INSERT DIAGRAM: Figure 4.1 – Mean response time chart (`metrics/analysis/mean_response_time.png`)]

[INSERT DIAGRAM: Figure 4.2 – p95 response time chart (`metrics/analysis/p95_response_time.png`)]

[INSERT DIAGRAM: Figure 4.3 – Throughput chart (`metrics/analysis/throughput.png`)]

[INSERT DIAGRAM: Figure 4.4 – Error rate chart (`metrics/analysis/error_rate.png`)]

[INSERT DIAGRAM: Figure 4.5 – Custom engine algorithm comparison by scenario (`metrics/analysis/custom_algorithm_gap.png`)]

### 4.1.3 Custom Engine – Server-Side Metrics and Distribution

**Table 4.2: Custom engine server-side summary and request distribution**

| Scenario | Algorithm | Mean (ms) | p95 (ms) | RPS | Error rate | Share s1 / s2 / s3 |
|----------|-----------|-----------|----------|-----|------------|--------------------|
| Steady | RR | 27.86 | 32 | 644.8 | 0% | 9699 / 9700 / 9699 |
| Steady | LC | 28.47 | 33 | 613.7 | 0% | 9724 / 9542 / 8438 |
| Ramp-up | RR | 29.13 | 36 | 875.5 | 0% | 14639 / 14638 / 14639 |
| Ramp-up | LC | 29.99 | 38 | 836.2 | 0% | 14337 / 14024 / 13610 |
| Burst | RR | 32.22 | 43 | 962.8 | 0% | 12895 / 12896 / 12895 |
| Burst | LC | 32.27 | 42 | 987.4 | 0% | 13682 / 13206 / 12763 |
| Failure | RR | 31.26 | 32 | 590.0 | 14.27% | 12318 / 10905 / 12318 |
| Failure | LC | 32.12 | 32 | 581.5 | 0.17% | 15863 / 11053 / 13864 |

Observation: Round Robin produces near-perfect equal splits when all servers are healthy. Least Connections remains close to even under homogeneous capacity, with mild imbalance.

### 4.1.4 Nginx Validation Baseline Results

**Table 4.3: Nginx baseline client-side results**

| Scenario | Algorithm | Requests | Throughput (RPS) | Mean (ms) | p95 (ms) | Error rate (%) |
|----------|-----------|----------|------------------|-----------|----------|----------------|
| Steady | Round Robin | 32,369 | 719.0 | 27.75 | 31 | 0 |
| Steady | Least Connections | 32,055 | 711.9 | 28.02 | 32 | 0 |
| Ramp-up | Round Robin | 49,406 | 987.5 | 30.32 | 49 | 0 |
| Ramp-up | Least Connections | 49,066 | 980.8 | 30.53 | 49 | 0 |
| Burst | Round Robin | 50,815 | 1,269.4 | 31.45 | 55 | 0 |
| Burst | Least Connections | 51,829 | 1,294.2 | 30.84 | 51 | 0 |

[INSERT DIAGRAM: Figure 4.6 – Validation mean latency custom vs Nginx (`metrics/analysis/validation_mean.png`)]

[INSERT DIAGRAM: Figure 4.7 – Validation throughput custom vs Nginx (`metrics/analysis/validation_throughput.png`)]

### 4.1.5 Summary of Quantitative Findings

1. Under **healthy homogeneous** load, RR and LC differences in mean/p95 latency are small.  
2. Under **burst**, LC showed slightly higher throughput and slightly lower mean/p95 than RR in this trial on the custom engine.  
3. Under **single-server failure**, LC reduced error rate dramatically relative to RR (~0.2% vs ~14%).  
4. **Nginx** achieved higher absolute RPS and somewhat lower mean latency than the custom Node engine, while healthy-load RR vs LC gaps remained small on both engines.

---

## 4.2 DISCUSSION

### 4.2.1 Interpretation of Homogeneous Healthy Load Results

When all backends have equal capacity and similar service times, Round Robin’s equal request share closely matches what Least Connections would achieve by connection counts that stay similar across servers. Therefore small differences in mean latency and throughput are expected. This agrees with literature reporting that no algorithm is universally superior and that performance depends on workload structure (Wira Harjanti et al., 2022; Shahid et al., 2023).

Slight reversals between scenarios (RR better on some steady/ramp metrics; LC better on some burst metrics) should be interpreted cautiously because this campaign used one trial per cell. The practical message for operators is: **for equal servers and stable short requests, either algorithm is acceptable; algorithm choice alone will not transform latency.**

### 4.2.2 Interpretation of Failure Scenario Results

The failure experiment provides the strongest algorithm-level signal in this study. Round Robin continues to allocate a cyclic share of requests toward a server that is down until health checks remove it, producing a large error fraction during the outage window (about one third of traffic while three servers are still considered, consistent with roughly 14% overall errors across the full test window). Least Connections, together with connection tracking and health state, kept almost all requests successful after disruption (error rate about 0.19% client-side).

This result supports the claim that **dynamic, state-aware scheduling can improve reliability under partial failure** compared with naive static rotation, even when both algorithms use the same health-check subsystem. It is an important practical finding for self-hosted clusters where restarts and crashes occur.

### 4.2.3 Custom Engine versus Nginx (Validation Discussion)

Nginx outperformed the custom engine in absolute throughput and often in mean latency. This does **not** invalidate the project. The custom engine was built to isolate scheduling logic for evaluation and education, not to beat Nginx’s highly optimized C implementation. The validation goal is whether **algorithm ranking patterns** under healthy load are consistent: on both engines, RR and LC remained close under homogeneous healthy scenarios, with small gaps. That consistency supports the methodological argument that algorithm-level conclusions can be discussed separately from absolute engine speed (the confound discussed in Chapter 1).

### 4.2.4 Request Distribution Behavior

Server-side distribution tables confirm correct Round Robin fairness. Least Connections did not create extreme imbalance under homogeneous delays, which is expected. Under heterogeneous capacity (not fully executed in the automated campaign), theory and literature predict greater LC benefit; this is recommended as future work in Chapter 5.

### 4.2.5 Dashboard and Observability Contribution

Although the dashboard does not affect scheduling correctness, it improves experimental usability: operators can switch algorithms, start and end metrics runs, and inspect live routing. This fulfills objective 4 and makes the research prototype demonstrable in a defense setting.

### 4.2.6 Relation to Project Aim and Objectives

| Objective | Status based on implementation and results |
|-----------|--------------------------------------------|
| Modular reverse proxy + pluggable interface | Achieved |
| Implement RR and LC | Achieved |
| Controlled backend + workload environment | Achieved (homogeneous tested; heterogeneous configurable) |
| React dashboard | Achieved |
| Evaluate metrics under varied load | Achieved for steady, ramp-up, burst, failure |
| Validate against Nginx | Achieved for healthy scenarios |

### 4.2.7 Threats to Validity

1. **Internal validity:** one trial per cell increases risk of random fluctuation.  
2. **Construct validity:** Node load runner approximates k6; results are still concurrent HTTP GETs but not identical to k6’s arrival models.  
3. **External validity:** laboratory Docker on one host differs from multi-host production networks.  
4. **Engine validity:** absolute performance favors Nginx; comparisons of absolute RPS between engines should not be over-interpreted as algorithm superiority.

---

# 5.0 CHAPTER FIVE: SUMMARY, CONCLUSION AND RECOMMENDATION

## 5.1 Summary

This project designed and implemented a custom reverse-proxy load balancing engine with pluggable Round Robin and Least Connections schedulers, a Dockerized Express backend cluster, a React operator dashboard, scripted multi-scenario load tests, Nginx validation baselines, and a Python analysis pipeline. The core design kept scheduling logic isolated from proxying, health checks, and metrics so that algorithm comparison would remain methodologically meaningful.

Experiments under steady, ramp-up, and burst traffic on a homogeneous three-server cluster showed that Round Robin and Least Connections produced similar latency and throughput. Under single-server failure, Least Connections achieved a much lower error rate than Round Robin. Nginx baselines confirmed that absolute performance differs by engine, while healthy-load algorithm gaps remained small on both systems. Results were documented with tables and matplotlib charts under `metrics/analysis/` and discussed in Chapter 4.

## 5.2 Conclusion

Based on the implementation and experimental evidence, the following conclusions are drawn:

1. It is feasible to build a transparent, modular load balancing evaluation engine in Node.js where algorithms are interchangeable modules.  
2. Under **homogeneous healthy** web workloads with similar request costs, Round Robin and Least Connections perform **comparably** on mean/p95 latency and throughput.  
3. Under **partial server failure**, Least Connections can substantially **reduce error rate** relative to Round Robin when combined with health-aware selection.  
4. Validation against Nginx shows that **engine implementation** affects absolute performance, reinforcing the project’s original problem statement about confounded evaluations, while algorithm ranking under healthy homogeneous load remains consistent in direction (small gaps).  
5. An operator dashboard and exportable metrics improve the usefulness of the system for demonstration, teaching, and further research.

Overall, the aim of the study was achieved: a custom engine was designed, implemented, and empirically evaluated, producing controlled evidence on comparative algorithm behavior under varying load conditions.

## 5.3 Limitation of the Study

1. Only two algorithms were fully implemented and evaluated (Round Robin and Least Connections), although the proposal mentioned a wider set.  
2. Most quantitative cells used a **single trial**, limiting statistical confidence intervals.  
3. **Heterogeneous capacity** experiments were prepared in Compose overlays but not fully completed in the main automated campaign.  
4. Load generation used a Node concurrent runner when host k6 was unavailable; results are valid concurrent HTTP tests but not identical to a standardized k6 matrix with many trials.  
5. Failure injection was applied to the custom engine path, not repeated identically against Nginx.  
6. Resource utilization (CPU/memory) was sampled by the metrics module, but dedicated multi-scenario CPU/memory comparison charts were not the primary reported figures.  
7. The study is laboratory-based on a single host Docker environment and may not generalize to multi-region cloud deployments.

## 5.4 Recommendation

### 5.4.1 Recommendations for Practice

1. For **equal servers and stable traffic**, either Round Robin or Least Connections is acceptable; prioritize operational simplicity.  
2. For clusters that experience **restarts, crashes, or uneven overload**, prefer **Least Connections** (or other dynamic policies) together with health checks.  
3. Do not compare algorithms only by marketing benchmarks of different products; control the engine when possible.

### 5.4.2 Recommendations for Future Work

1. Implement and evaluate Weighted Round Robin and Least Response Time on the same pluggable interface.  
2. Complete **heterogeneous capacity** experiments with repeated trials.  
3. Increase **trial count** (for example three or more) and report means with standard deviations.  
4. Integrate standard **k6** (or JMeter) fully for publication-grade load definitions.  
5. Add optional TLS, sticky sessions, and Layer 4 modes for broader comparison.  
6. Explore adaptive/ML scheduling on top of the same metrics harness (Gures et al., 2022; Rahimov & Aghayev, 2026).

## 5.5 Contribution to Knowledge

This project contributes:

1. An **open, modular load balancing evaluation platform** that isolates scheduling algorithms from proxy engine internals.  
2. An **empirical dataset** comparing Round Robin and Least Connections under steady, ramp-up, burst, and failure scenarios, with Nginx validation for healthy load.  
3. A clear **methodological demonstration** that absolute engine performance and algorithm ranking must be discussed separately.  
4. A **teaching and research artifact** (dashboard, Docker environment, analysis scripts) reusable by the Department of Computer Science for distributed systems experiments.  
5. Practical evidence that **Least Connections can markedly improve error behavior under server failure** relative to Round Robin in a controlled setting.

---

# REFERENCES

Al Reshan, M. S., Syed, D., Islam, N., Shaikh, A., Hamdi, M., Elmagzoub, M. A., Muhammad, G., & Talpur, K. H. (2023). A fast converging and globally optimized approach for load balancing in cloud computing. *IEEE Access, 11*, 11390–11404.

Gures, E., Shayea, I., Ergen, M., Azmi, M. H., & El-Saleh, A. A. (2022). Machine learning-based load balancing algorithms in future heterogeneous networks: A survey. *IEEE Access, 10*, 37689–37717. https://doi.org/10.1109/ACCESS.2022.3161511

Hussain, A., Aleem, M., Ur Rehman, A., & Arshad, U. (2025). DE-RALBA: Dynamic enhanced resource aware load balancing algorithm for cloud computing. *PeerJ Computer Science, 11*, e2739. https://doi.org/10.7717/peerj-cs.2739

Kumar, C., Marston, S., Sen, R., & Narisetty, A. (2022). Greening the cloud: A load balancing mechanism to optimize cloud computing networks. *Journal of Management Information Systems, 39*(2), 513–541.

Nginx, Inc. (n.d.). *Module ngx_http_upstream_module*. Retrieved from https://nginx.org/en/docs/http/ngx_http_upstream_module.html

Node.js. (n.d.). *HTTP module documentation*. Retrieved from https://nodejs.org/api/http.html

Rahimov, E., & Aghayev, T. (2026). Predictive load balancing in distributed systems: A comparative study of round robin, weighted round robin, and a machine learning approach. *Engineering Proceedings, 122*(1), Article 26. https://doi.org/10.3390/engproc2026122026

Shahid, M. A., Alam, M. M., & Su'ud, M. M. (2023). Performance evaluation of load-balancing algorithms with different service broker policies for cloud computing. *Applied Sciences, 13*(3), Article 1586. https://doi.org/10.3390/app13031586

Wira Harjanti, T., Setiyani, H., & Trianto, J. (2022). Load balancing analysis using round-robin and least-connection algorithms for server service response time. *Applied Technology and Computing Science Journal, 5*(2), 40–49. https://doi.org/10.33086/atcsj.v5i2.3743

---

# APPENDICES

## Appendix A: Repository Structure

```
eben/
  load-balancer/   Custom engine
  backends/        Express servers
  frontend/        React dashboard
  nginx/           Validation configs
  k6/              Load scripts and evaluation runner
  python/          Analysis pipeline
  metrics/         Experimental outputs
  docs/            Documentation and this report draft
```

## Appendix B: Key API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/status` | Overall status |
| PUT | `/api/algorithm` | Switch algorithm |
| GET | `/api/servers` | Server health list |
| POST | `/api/metrics/run/start` | Start metrics recording |
| POST | `/api/metrics/run/end` | End recording and export |
| GET | `/api/metrics/runs` | List historical runs |
| WS | `/ws` | Live events |

## Appendix C: Chart File Map for Chapter 4 Figures

| Suggested figure | File path |
|------------------|-----------|
| Mean response time | `metrics/analysis/mean_response_time.png` |
| p95 response time | `metrics/analysis/p95_response_time.png` |
| Throughput | `metrics/analysis/throughput.png` |
| Error rate | `metrics/analysis/error_rate.png` |
| Custom algorithm gap | `metrics/analysis/custom_algorithm_gap.png` |
| Validation mean | `metrics/analysis/validation_mean.png` |
| Validation throughput | `metrics/analysis/validation_throughput.png` |

## Appendix D: Detailed Results Source

Full narrative of the automated evaluation session: `docs/results.md`.

## Appendix E: Algorithms Pseudocode

See Chapter 3, Section 3.5. Full source: `load-balancer/src/schedulers/`.

---

**End of Chapters 1–5 and References**

*This document is a standard draft for transfer into the official university project report format (MS Word). Replace all `[INSERT DIAGRAM: ...]` markers with figures produced in draw.io/PlantUML or with screenshots/charts from the project.*
