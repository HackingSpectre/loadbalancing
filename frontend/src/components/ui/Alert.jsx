export default function Alert({ tone = 'neutral', children }) {
  const className = tone === 'error' ? 'alert-error' : 'alert-neutral';
  return <div className={`mb-5 ${className}`}>{children}</div>;
}
