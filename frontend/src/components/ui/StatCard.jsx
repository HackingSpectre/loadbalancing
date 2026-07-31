export default function StatCard({ label, value, hint, tone = 'default' }) {
  const valueTone = {
    default: 'text-ink',
    good: 'text-ink',
    warn: 'text-ink-soft',
    bad: 'text-ember',
  };

  return (
    <div className="card card-pad">
      <p className="metric-label">{label}</p>
      <p className={`metric-value-sm mt-2 ${valueTone[tone] || valueTone.default}`}>
        {value}
      </p>
      {hint ? <p className="mt-2 text-caption text-mute">{hint}</p> : null}
    </div>
  );
}
