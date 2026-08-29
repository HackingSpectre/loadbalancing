'use strict';

const http = require('http');
const https = require('https');
const { URL } = require('url');
const logger = require('../utils/logger');

/**
 * Manages load testing scenario execution directly from the control plane.
 * Coordinates algorithm selection, metrics runs, concurrent HTTP generation,
 * and live WebSocket telemetry.
 */
class ScenarioRunner {
  /**
   * @param {object} options
   * @param {ReturnType<import('../schedulers').createSchedulerManager>} options.schedulerManager
   * @param {import('../metrics/collector')} options.metrics
   * @param {import('../serverPool')} options.serverPool
   * @param {number} options.proxyPort
   * @param {(event: object) => void} options.onEvent
   */
  constructor(options) {
    this.schedulerManager = options.schedulerManager;
    this.metrics = options.metrics;
    this.serverPool = options.serverPool;
    this.proxyPort = options.proxyPort || 8080;
    this.onEvent = options.onEvent || (() => {});

    this.activeRun = null;
    this.abortController = null;
    this.intervalTimer = null;
  }

  getStatus() {
    if (!this.activeRun) {
      return { running: false };
    }
    const elapsed = Math.min(
      this.activeRun.duration,
      Math.floor((Date.now() - this.activeRun.startedAt) / 1000)
    );
    const progress = Math.min(100, Math.round((elapsed / this.activeRun.duration) * 100));

    return {
      running: true,
      scenario: this.activeRun.scenario,
      algorithm: this.activeRun.algorithm,
      runId: this.activeRun.runId,
      startedAt: this.activeRun.startedAt,
      duration: this.activeRun.duration,
      elapsedSeconds: elapsed,
      progressPercent: progress,
      vus: this.activeRun.currentVus || this.activeRun.vus,
      totalRequests: this.activeRun.requestCount,
      errorCount: this.activeRun.errorCount,
      currentRps: this.activeRun.currentRps || 0,
    };
  }

  async startScenario(params = {}) {
    if (this.activeRun) {
      const err = new Error('A scenario is already running');
      err.code = 'SCENARIO_RUNNING';
      throw err;
    }

    const scenario = params.scenario || 'steady';
    const algo = params.algorithm || this.schedulerManager.getActiveName();
    const duration = Math.max(5, parseInt(params.duration, 10) || (scenario === 'failure' ? 60 : 30));
    const vus = Math.max(1, Math.min(100, parseInt(params.vus, 10) || (scenario === 'burst' ? 40 : 20)));
    const targetUrl =
      params.targetUrl || `http://127.0.0.1:${this.proxyPort}/api/work`;
    const runId = `ui_${algo}_${scenario}_${Date.now()}`;

    // Switch algorithm if requested
    if (algo && algo !== this.schedulerManager.getActiveName()) {
      this.schedulerManager.setActive(algo);
      this.onEvent({
        type: 'algorithm',
        name: algo,
        label: this.schedulerManager.getActive().label,
        timestamp: Date.now(),
      });
    }

    // Start metrics run
    const runMeta = this.metrics.startRun({
      algorithm: algo,
      scenario,
      engine: 'custom',
      notes: params.notes || 'Executed from operator dashboard',
      runId,
    });
    this.onEvent({ type: 'run', action: 'start', ...runMeta });

    this.abortController = { aborted: false };
    const abortSignal = this.abortController;

    this.activeRun = {
      scenario,
      algorithm: algo,
      runId,
      startedAt: Date.now(),
      duration,
      vus,
      currentVus: vus,
      targetUrl,
      requestCount: 0,
      errorCount: 0,
      recentRequestsInWindow: 0,
      currentRps: 0,
    };

    let lastTickTime = Date.now();
    this.intervalTimer = setInterval(() => {
      if (!this.activeRun) return;
      const now = Date.now();
      const deltaSec = Math.max(0.1, (now - lastTickTime) / 1000);
      lastTickTime = now;

      const rps = Math.round(this.activeRun.recentRequestsInWindow / deltaSec);
      this.activeRun.recentRequestsInWindow = 0;
      this.activeRun.currentRps = rps;

      const elapsed = Math.min(
        this.activeRun.duration,
        Math.floor((now - this.activeRun.startedAt) / 1000)
      );
      const progress = Math.min(100, Math.round((elapsed / this.activeRun.duration) * 100));

      this.onEvent({
        type: 'scenario_progress',
        scenario: this.activeRun.scenario,
        algorithm: this.activeRun.algorithm,
        runId: this.activeRun.runId,
        startedAt: this.activeRun.startedAt,
        duration: this.activeRun.duration,
        elapsedSeconds: elapsed,
        progressPercent: progress,
        vus: this.activeRun.currentVus,
        totalRequests: this.activeRun.requestCount,
        errorCount: this.activeRun.errorCount,
        currentRps: rps,
      });
    }, 1000);

    this._executeScenarioLoop(scenario, vus, duration, targetUrl, abortSignal)
      .catch((err) => {
        logger.error('Scenario execution error', { error: err.message });
      })
      .finally(async () => {
        clearInterval(this.intervalTimer);
        this.intervalTimer = null;

        let endResult = null;
        try {
          endResult = this.metrics.endRun();
          this.onEvent({
            type: 'run',
            action: 'end',
            runId,
            summary: endResult?.summary,
          });
        } catch (e) {
          logger.warn('Error concluding metrics run', { error: e.message });
        }

        const totalReqs = this.activeRun ? this.activeRun.requestCount : 0;
        this.onEvent({
          type: 'scenario_finished',
          scenario,
          algorithm: algo,
          runId,
          duration,
          totalRequests: totalReqs,
          summary: endResult?.summary,
        });

        this.activeRun = null;
        this.abortController = null;
        logger.info('Scenario finished', { scenario, algorithm: algo, runId, totalRequests: totalReqs });
      });

    return {
      runId,
      scenario,
      algorithm: algo,
      duration,
      vus,
      targetUrl,
      status: 'started',
    };
  }

  async stopScenario() {
    if (!this.activeRun) {
      return { status: 'idle' };
    }
    if (this.abortController) {
      this.abortController.aborted = true;
    }
    return { status: 'stopping', runId: this.activeRun.runId };
  }

  async _executeScenarioLoop(scenario, maxVus, totalSeconds, targetUrl, abortSignal) {
    const startTime = Date.now();
    const endTime = startTime + totalSeconds * 1000;

    const u = new URL(targetUrl);
    const isHttps = u.protocol === 'https:';
    const httpLib = isHttps ? https : http;
    const port = u.port || (isHttps ? 443 : 80);

    const httpAgent = new httpLib.Agent({
      keepAlive: true,
      maxSockets: maxVus * 2,
    });

    const sendRequest = () => {
      return new Promise((resolve) => {
        if (abortSignal.aborted) return resolve(false);

        const req = httpLib.request(
          {
            hostname: u.hostname,
            port,
            path: u.pathname + (u.search || ''),
            method: 'GET',
            agent: httpAgent,
            timeout: 8000,
          },
          (res) => {
            res.resume();
            res.on('end', () => {
              if (this.activeRun) {
                this.activeRun.requestCount += 1;
                this.activeRun.recentRequestsInWindow += 1;
                if (res.statusCode >= 500) {
                  this.activeRun.errorCount += 1;
                }
              }
              resolve(true);
            });
          }
        );

        req.on('error', () => {
          if (this.activeRun) {
            this.activeRun.requestCount += 1;
            this.activeRun.errorCount += 1;
            this.activeRun.recentRequestsInWindow += 1;
          }
          resolve(false);
        });

        req.on('timeout', () => {
          req.destroy();
          if (this.activeRun) {
            this.activeRun.requestCount += 1;
            this.activeRun.errorCount += 1;
            this.activeRun.recentRequestsInWindow += 1;
          }
          resolve(false);
        });

        req.end();
      });
    };

    const getDesiredVus = (elapsedSec) => {
      if (scenario === 'steady') return maxVus;
      if (scenario === 'ramp-up') {
        const rampUpSec = Math.max(2, totalSeconds * 0.3);
        const holdSec = Math.max(2, totalSeconds * 0.5);
        if (elapsedSec < rampUpSec) {
          return Math.max(1, Math.round((elapsedSec / rampUpSec) * maxVus));
        }
        if (elapsedSec < rampUpSec + holdSec) {
          return maxVus;
        }
        const remainingSec = Math.max(1, totalSeconds - elapsedSec);
        const rampDownSec = totalSeconds - (rampUpSec + holdSec);
        return Math.max(1, Math.round((remainingSec / rampDownSec) * maxVus));
      }
      if (scenario === 'burst') {
        const cycle = elapsedSec % 20;
        return cycle < 10 ? Math.max(2, Math.round(maxVus * 0.2)) : maxVus;
      }
      return maxVus;
    };

    const workers = new Set();

    const spawnWorker = async () => {
      while (Date.now() < endTime && !abortSignal.aborted) {
        const elapsedSec = (Date.now() - startTime) / 1000;
        const targetVus = getDesiredVus(elapsedSec);
        if (this.activeRun) {
          this.activeRun.currentVus = targetVus;
        }

        if (workers.size > targetVus) break;

        await sendRequest();
        const sleepMs = scenario === 'burst' && (elapsedSec % 20 < 10) ? 120 : 30;
        await new Promise((r) => setTimeout(r, sleepMs));
      }
    };

    while (Date.now() < endTime && !abortSignal.aborted) {
      const elapsedSec = (Date.now() - startTime) / 1000;
      const targetVus = getDesiredVus(elapsedSec);
      if (this.activeRun) {
        this.activeRun.currentVus = targetVus;
      }

      while (workers.size < targetVus && !abortSignal.aborted) {
        const p = spawnWorker().finally(() => workers.delete(p));
        workers.add(p);
      }

      await new Promise((r) => setTimeout(r, 200));
    }

    await Promise.all(Array.from(workers));
    httpAgent.destroy();
  }
}

module.exports = ScenarioRunner;
