import { format, parseISO, isValid } from 'date-fns';

export const VISIT_STATUSES = [
  'Visited',
  'Meeting Scheduled',
  'No Response',
  'Order Placed',
  'Follow-Up Required',
  'Not Interested',
];

export const CLIENT_CATEGORIES = [
  'Hot Lead',
  'Warm Lead',
  'Cold Lead',
  'Active Client',
  'Inactive',
  'Blacklisted',
];

// Tailwind classes for status badges (text + bg + ring) — light theme
export const STATUS_STYLES = {
  'Visited':            'text-emerald-700 bg-emerald-50 ring-emerald-200',
  'Meeting Scheduled':  'text-blue-700 bg-blue-50 ring-blue-200',
  'No Response':        'text-amber-700 bg-amber-50 ring-amber-200',
  'Order Placed':       'text-violet-700 bg-violet-50 ring-violet-200',
  'Follow-Up Required': 'text-yellow-800 bg-yellow-50 ring-yellow-200',
  'Not Interested':     'text-rose-700 bg-rose-50 ring-rose-200',
};

export const CATEGORY_STYLES = {
  'Hot Lead':       'text-rose-700 bg-rose-50 ring-rose-200',
  'Warm Lead':      'text-amber-700 bg-amber-50 ring-amber-200',
  'Cold Lead':      'text-sky-700 bg-sky-50 ring-sky-200',
  'Active Client':  'text-emerald-700 bg-emerald-50 ring-emerald-200',
  'Inactive':       'text-slate-600 bg-slate-100 ring-slate-200',
  'Blacklisted':    'text-red-700 bg-red-50 ring-red-200',
};

// Chart palette per status (solid hex)
export const STATUS_COLORS = {
  'Visited': '#10B981',
  'Meeting Scheduled': '#3B82F6',
  'No Response': '#F59E0B',
  'Order Placed': '#8B5CF6',
  'Follow-Up Required': '#EAB308',
  'Not Interested': '#F43F5E',
};

// Quote line-item totals (pure — safe to use anywhere without pulling in jsPDF)
export function computeTotals(items = [], taxPercent = 0, discount = 0) {
  const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  const tax = subtotal * (Number(taxPercent) || 0) / 100;
  const total = Math.max(0, subtotal + tax - (Number(discount) || 0));
  return { subtotal, tax, total };
}

export function todayISO() {
  return format(new Date(), 'yyyy-MM-dd');
}

export function fmtDate(value) {
  if (!value) return '—';
  const d = typeof value === 'string' ? parseISO(value) : value;
  return isValid(d) ? format(d, 'dd MMM yyyy') : '—';
}

export function fmtShortDate(value) {
  if (!value) return '—';
  const d = typeof value === 'string' ? parseISO(value) : value;
  return isValid(d) ? format(d, 'dd MMM') : '—';
}

export function fmtCurrency(v) {
  if (v === null || v === undefined || v === '') return '—';
  return '₹' + Number(v).toLocaleString('en-IN');
}

export function fmtCompact(v) {
  const n = Number(v) || 0;
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(1) + 'Cr';
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(1) + 'L';
  if (n >= 1e3) return '₹' + (n / 1e3).toFixed(1) + 'K';
  return '₹' + n;
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = parseISO(dateStr);
  if (!isValid(d)) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - now) / 86400000);
}

export function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || '?';
}

export function classNames(...xs) {
  return xs.filter(Boolean).join(' ');
}

// CSV export helper
export function downloadCSV(filename, rows, columns) {
  const head = columns.map((c) => `"${c.label}"`).join(',');
  const body = rows
    .map((r) => columns.map((c) => `"${String(c.get(r) ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([head + '\n' + body], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
