import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp, ShoppingCart, IndianRupee, Percent } from 'lucide-react';
import { useData } from '../context/DataContext';
import KpiCard from '../components/KpiCard';
import { fmtCompact, fmtCurrency } from '../lib/utils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Monthly() {
  const { visits } = useData();

  const years = useMemo(() => {
    const set = new Set(visits.map((v) => v.visit_date?.slice(0, 4)).filter(Boolean));
    set.add(String(new Date().getFullYear()));
    return [...set].sort((a, b) => b - a);
  }, [visits]);

  const [year, setYear] = useState(years[0] || String(new Date().getFullYear()));

  const data = useMemo(() => {
    const rows = MONTHS.map((name, i) => ({ name, month: i, visits: 0, orders: 0, value: 0, noResp: 0 }));
    visits.forEach((v) => {
      if (!v.visit_date?.startsWith(year)) return;
      const mi = Number(v.visit_date.slice(5, 7)) - 1;
      if (mi < 0 || mi > 11) return;
      const r = rows[mi];
      r.visits++;
      if (v.order_received) { r.orders++; r.value += Number(v.order_value) || 0; }
      if (v.visit_status === 'No Response') r.noResp++;
    });
    return rows.map((r) => ({ ...r, conv: r.visits ? (r.orders / r.visits) * 100 : 0, avg: r.orders ? r.value / r.orders : 0 }));
  }, [visits, year]);

  const totals = useMemo(() => {
    const v = data.reduce((s, m) => s + m.visits, 0);
    const o = data.reduce((s, m) => s + m.orders, 0);
    const val = data.reduce((s, m) => s + m.value, 0);
    return { visits: v, orders: o, value: val, conv: v ? (o / v) * 100 : 0 };
  }, [data]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">Year performance overview</p>
        <select className="input w-auto" value={year} onChange={(e) => setYear(e.target.value)}>
          {years.map((y) => <option key={y}>{y}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={TrendingUp} tone="brand" label={`Visits in ${year}`} value={totals.visits} />
        <KpiCard icon={ShoppingCart} tone="emerald" label="Orders" value={totals.orders} />
        <KpiCard icon={IndianRupee} tone="violet" label="Revenue" value={fmtCompact(totals.value)} />
        <KpiCard icon={Percent} tone="amber" label="Conversion" value={totals.conv.toFixed(1) + '%'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Visits per Month">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.07)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip cursor={{ fill: 'rgba(15,23,42,0.04)' }} contentStyle={TT} />
            <Bar dataKey="visits" fill="#6366F1" radius={[5, 5, 0, 0]} maxBarSize={34} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Revenue per Month">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.07)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtCompact} width={52} />
            <Tooltip cursor={{ fill: 'rgba(15,23,42,0.04)' }} contentStyle={TT} formatter={(v) => fmtCurrency(v)} />
            <Bar dataKey="value" fill="#10B981" radius={[5, 5, 0, 0]} maxBarSize={34} />
          </BarChart>
        </ChartCard>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">Monthly Breakdown · {year}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200">
                <th className="py-3 px-5 font-medium">Month</th>
                <th className="py-3 px-4 font-medium">Visits</th>
                <th className="py-3 px-4 font-medium">Orders</th>
                <th className="py-3 px-4 font-medium">Conversion</th>
                <th className="py-3 px-4 font-medium">Revenue</th>
                <th className="py-3 px-4 font-medium">Avg Order</th>
                <th className="py-3 px-4 font-medium">No Response</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((m) => (
                <tr key={m.name} className="hover:bg-slate-50">
                  <td className="py-3 px-5 font-semibold text-slate-900">{m.name}</td>
                  <td className="py-3 px-4 num font-semibold text-slate-700">{m.visits}</td>
                  <td className="py-3 px-4 num text-emerald-600 font-semibold">{m.orders}</td>
                  <td className="py-3 px-4 num text-slate-600">{m.visits ? m.conv.toFixed(1) + '%' : '—'}</td>
                  <td className="py-3 px-4 num text-slate-700">{m.value ? fmtCurrency(m.value) : '—'}</td>
                  <td className="py-3 px-4 num text-slate-400">{m.orders ? fmtCurrency(Math.round(m.avg)) : '—'}</td>
                  <td className="py-3 px-4 num text-slate-400">{m.noResp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const TT = { background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12, color: '#334155', boxShadow: '0 8px 24px -8px rgba(15,23,42,0.18)' };

function ChartCard({ title, children }) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-slate-900 mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </div>
  );
}
