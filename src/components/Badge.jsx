import { classNames, STATUS_STYLES, CATEGORY_STYLES } from '../lib/utils';

export function StatusBadge({ status }) {
  if (!status) return <span className="text-slate-500">—</span>;
  return (
    <span
      className={classNames(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 whitespace-nowrap',
        STATUS_STYLES[status] || 'text-slate-600 bg-slate-100 ring-slate-200'
      )}
    >
      {status}
    </span>
  );
}

export function CategoryBadge({ category }) {
  if (!category) return <span className="text-slate-500">—</span>;
  return (
    <span
      className={classNames(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 whitespace-nowrap',
        CATEGORY_STYLES[category] || 'text-slate-600 bg-slate-100 ring-slate-200'
      )}
    >
      {category}
    </span>
  );
}

export function YesNo({ value }) {
  return value ? (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200">
      Yes
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold text-slate-500 bg-slate-100 ring-1 ring-slate-200">
      No
    </span>
  );
}
