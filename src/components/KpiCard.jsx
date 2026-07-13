import { classNames } from '../lib/utils';

const TONES = {
  brand:   { icon: 'text-brand-600 bg-brand-50', ring: 'hover:ring-brand-200' },
  emerald: { icon: 'text-emerald-600 bg-emerald-50', ring: 'hover:ring-emerald-200' },
  amber:   { icon: 'text-amber-600 bg-amber-50', ring: 'hover:ring-amber-200' },
  violet:  { icon: 'text-violet-600 bg-violet-50', ring: 'hover:ring-violet-200' },
};

export default function KpiCard({ icon: Icon, label, value, hint, tone = 'brand' }) {
  const t = TONES[tone] || TONES.brand;
  return (
    <div className={classNames('card p-5 ring-1 ring-transparent transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft', t.ring)}>
      <div className="flex items-start justify-between">
        <div className={classNames('h-10 w-10 rounded-xl grid place-items-center', t.icon)}>
          <Icon className="h-5 w-5" />
        </div>
        {hint && <span className="text-[11px] font-medium text-slate-400">{hint}</span>}
      </div>
      <div className="mt-4 num text-3xl font-bold text-slate-900 tracking-tight">{value}</div>
      <div className="mt-1 text-[13px] text-slate-500">{label}</div>
    </div>
  );
}
