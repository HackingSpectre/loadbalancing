import { useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Alert from '../components/ui/Alert';
import { formatAlgorithm, formatTime } from '../utils/format';

export default function ControlPage({ monitor = {} }) {
  const {
    algorithm,
    algorithms = [],
    runInfo,
    scenarioState,
    selectedScenario = 'steady',
    setSelectedScenario,
    switchAlgorithm,
    startRun,
    endRun,
    startScenario,
    stopScenario,
    refreshStatus,
    error,
  } = monitor;

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [localScenario, setLocalScenario] = useState('steady');
  const scenario = selectedScenario || localScenario;
  const setScenario = setSelectedScenario || setLocalScenario;
  const [notes, setNotes] = useState('');

  async function handleSwitch(name) {
    setBusy(true);
    setMessage(null);
    try {
      const result = await switchAlgorithm(name);
      setMessage({
        type: 'ok',
        text: `Active algorithm set to ${formatAlgorithm(result.name)}.`,
      });
    } catch (err) {
      setMessage({ type: 'err', text: err.message || 'Failed to switch algorithm' });
    } finally {
      setBusy(false);
    }
  }

  async function handleRunScenario() {
    setBusy(true);
    setMessage(null);
    try {
      await startScenario({
        scenario,
        algorithm: algorithm?.name,
        notes,
      });
      setMessage({
        type: 'ok',
        text: `Running "${scenario}" scenario on ${formatAlgorithm(algorithm?.name)}.`,
      });
    } catch (err) {
      setMessage({ type: 'err', text: err.message || 'Failed to run scenario' });
    } finally {
      setBusy(false);
    }
  }

  async function handleStopScenario() {
    setBusy(true);
    try {
      await stopScenario();
      setMessage({ type: 'ok', text: 'Scenario stopped.' });
      await refreshStatus();
    } catch (err) {
      setMessage({ type: 'err', text: err.message || 'Failed to stop scenario' });
    } finally {
      setBusy(false);
    }
  }

  async function handleStartRun() {
    setBusy(true);
    setMessage(null);
    try {
      const info = await startRun({
        algorithm: algorithm?.name,
        scenario,
        engine: 'custom',
        notes,
      });
      setMessage({
        type: 'ok',
        text: `Metrics run started (${info.runId}). Generate traffic now.`,
      });
    } catch (err) {
      setMessage({ type: 'err', text: err.message || 'Failed to start run' });
    } finally {
      setBusy(false);
    }
  }

  async function handleEndRun() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await endRun();
      setMessage({
        type: 'ok',
        text: `Run ${result.runId} saved. Open Results to compare performance.`,
      });
      await refreshStatus();
    } catch (err) {
      setMessage({ type: 'err', text: err.message || 'Failed to end run' });
    } finally {
      setBusy(false);
    }
  }

  const isRunningScenario = Boolean(scenarioState?.running);
  const isRecording = Boolean(runInfo?.active) || isRunningScenario;

  const algoList = algorithms?.length
    ? algorithms
    : [
        { name: 'round-robin', label: 'Round Robin' },
        { name: 'least-connections', label: 'Least Connections' },
      ];

  return (
    <div>
      <PageHeader
        title="Control"
        description="Select the active scheduling algorithm and manage metrics recording for experimental runs."
      />

      {error ? (
        <Alert tone="error">{error}</Alert>
      ) : null}

      {message ? (
        <Alert tone={message.type === 'err' ? 'error' : 'neutral'}>
          {message.text}
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card card-pad">
          <h3 className="section-title">Scheduling algorithm</h3>
          <p className="section-desc">
            Current selection applies to new requests immediately.
          </p>

          <div className="mt-5 space-y-2">
            {algoList.map((algo) => {
              const active = algorithm?.name === algo.name;
              return (
                <button
                  key={algo.name}
                  type="button"
                  disabled={busy || active}
                  onClick={() => handleSwitch(algo.name)}
                  className={`flex w-full items-start justify-between rounded-nested border p-4 text-left transition ${
                    active
                      ? 'border-ink bg-ink text-surface-alt'
                      : 'border-hairline bg-paper text-ink hover:bg-surface-alt'
                  }`}
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-body font-medium">{algo.label}</p>
                    <p
                      className={`mt-1 text-caption ${
                        active ? 'text-surface-alt/70' : 'text-mute'
                      }`}
                    >
                      {algo.name === 'round-robin'
                        ? 'Fixed cyclic rotation through healthy servers.'
                        : 'Routes to the healthy server with the fewest active connections.'}
                    </p>
                  </div>
                  <span
                    className={
                      active
                        ? 'badge shrink-0 bg-paper text-ink'
                        : 'badge-soft shrink-0'
                    }
                  >
                    {active ? 'Active' : 'Select'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="card card-pad">
          <h3 className="section-title">Metrics run</h3>
          <p className="section-desc">
            Record per-request and resource samples to CSV/JSON for analysis.
          </p>

          <dl className="mt-5 grid grid-cols-2 gap-2">
            <MetaTile
              label="Status"
              value={isRunningScenario ? 'Running Scenario' : runInfo?.active ? 'Recording' : 'Idle'}
            />
            <MetaTile
              label="Run ID"
              value={scenarioState?.runId || runInfo?.runId || 'None'}
              mono
            />
            <MetaTile label="Started" value={formatTime(scenarioState?.startedAt || runInfo?.startedAt)} />
            <MetaTile
              label="Algorithm tag"
              value={formatAlgorithm(scenarioState?.algorithm || runInfo?.meta?.algorithm || algorithm?.name)}
            />
          </dl>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="label">Scenario label</span>
              <select
                className="field"
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                disabled={busy || isRecording}
              >
                <option value="steady">Steady</option>
                <option value="ramp-up">Ramp up</option>
                <option value="burst">Burst</option>
                <option value="failure">Single server failure</option>
              </select>
            </label>

            <label className="block">
              <span className="label">Notes (optional)</span>
              <textarea
                className="field min-h-[5.5rem] rounded-nested"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={busy || isRecording}
                placeholder="Trial number, load profile, or cluster mode"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {isRunningScenario ? (
              <button
                type="button"
                className="btn-danger-solid"
                disabled={busy}
                onClick={handleStopScenario}
              >
                Stop scenario
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                disabled={busy || isRecording}
                onClick={handleRunScenario}
              >
                Run scenario
              </button>
            )}

            <button
              type="button"
              className="btn-outline"
              disabled={busy || isRecording}
              onClick={handleStartRun}
            >
              Start manual recording
            </button>

            {runInfo?.active && !isRunningScenario ? (
              <button
                type="button"
                className="btn-danger-solid"
                disabled={busy}
                onClick={handleEndRun}
              >
                End and export
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function MetaTile({ label, value, mono }) {
  return (
    <div className="rounded-nested bg-canvas px-3 py-3">
      <dt className="text-caption text-mute">{label}</dt>
      <dd
        className={`mt-1 text-body font-medium text-ink ${
          mono ? 'truncate font-mono text-caption' : ''
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
