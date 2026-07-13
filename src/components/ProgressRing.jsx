export default function ProgressRing({ value = 0, size = 72, stroke = 8, color = '#4F46E5', label, sub }) {
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="num text-sm font-bold text-slate-900">{Math.round(pct)}%</span>
        </div>
      </div>
      {(label || sub) && (
        <div>
          {label && <div className="text-sm font-semibold text-slate-900">{label}</div>}
          {sub && <div className="text-xs text-slate-500 num">{sub}</div>}
        </div>
      )}
    </div>
  );
}
