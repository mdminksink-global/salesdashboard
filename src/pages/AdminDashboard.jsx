import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { MapPin, Sun, ShoppingCart, IndianRupee, BarChart3, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useData } from '../context/DataContext';
import { useProfiles } from '../hooks/useProfiles';
import { useCollection } from '../hooks/useCollection';
import KpiCard from '../components/KpiCard';
import EmptyState from '../components/EmptyState';
import { VISIT_STATUSES, STATUS_COLORS, todayISO, fmtCurrency, fmtCompact, classNames } from '../lib/utils';

const TT = { background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12, color: '#334155', boxShadow: '0 8px 24px -8px rgba(15,23,42,0.18)' };
const firstName = (n = '') => n.trim().split(/\s+/)[0] || n;

export default function AdminDashboard() {
  const { visits } = useData();
  const { profiles, byId } = useProfiles();
  const { rows: targets } = useCollection('targets', { orderBy: 'period', ascending: false });

  const years = useMemo(() => {
    const set = new Set(visits.map((v) => v.visit_date?.slice(0, 7)).filter(Boolean));
    set.add(format(new Date(), 'yyyy-MM'));
    return [...set].sort().reverse();
  }, [visits]);
  const [period, setPeriod] = useState(format(new Date(), 'yyyy-MM'));

  const monthVisits = useMemo(() => visits.filter((v) => v.visit_date?.startsWith(period)), [visits, period]);

  const team = useMemo(() => {
    const today = todayISO();
    const orders = monthVisits.filter((v) => v.order_received);
    return {
      visits: monthVisits.length,
      today: monthVisits.filter((v) => v.visit_date === today).length,
      orders: orders.length,
      revenue: orders.reduce((s, v) => s + (Number(v.order_value) || 0), 0),
    };
  }, [monthVisits]);

  // Per-salesperson rollup for the selected month.
  const perRep = useMemo(() => {
    const acc = {};
    for (const p of profiles) acc[p.id] = { id: p.id, name: p.full_name || p.email, visits: 0, orders: 0, revenue: 0 };
    for (const v of monthVisits) {
      const r = acc[v.owner_id] || (acc[v.owner_id] = { id: v.owner_id, name: byId[v.owner_id]?.full_name || 'Unknown', visits: 0, orders: 0, revenue: 0 });
      r.visits++;
      if (v.order_received) { r.orders++; r.revenue += Number(v.order_value) || 0; }
    }
    return Object.values(acc)
      .map((r) => ({ ...r, conv: r.visits ? (r.orders / r.visits) * 100 : 0, short: firstName(r.name) }))
      .sort((a, b) => b.visits - a.visits);
  }, [profiles, monthVisits, byId]);

  const statusData = useMemo(() => {
    const counts = Object.fromEntries(VISIT_STATUSES.map((s) => [s, 0]));
    monthVisits.forEach((v) => { if (v.visit_status in counts) counts[v.visit_status]++; });
    return VISIT_STATUSES.map((s) => ({ name: s, value: counts[s] })).filter((d) => d.value > 0);
  }, [monthVisits]);

  const targetOf = (id) => targets.find((t) => t.owner_id === id && t.period === period);
  const chartReps = perRep.filter((r) => r.visits > 0 || r.revenue > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Team overview · {profiles.length} {profiles.length === 1 ? 'member' : 'members'}</p>
        <select className="input w-auto" value={period} onChange={(e) => setPeriod(e.target.value)}>
          {years.map((y) => <option key={y} value={y}>{format(parseISO(y + '-01'), 'MMM yyyy')}</option>)}
        </select>
      </div>

      {/* Team KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={MapPin} tone="brand" label="Team Visits" value={team.visits} />
        <KpiCard icon={Sun} tone="emerald" label="Visits Today" value={team.today} />
        <KpiCard icon={ShoppingCart} tone="violet" label="Orders" value={team.orders} />
        <KpiCard icon={IndianRupee} tone="amber" label="Revenue" value={fmtCompact(team.revenue)} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCard title="Visits by Salesperson" empty={chartReps.length === 0}>
          <BarChart data={chartReps}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.07)" vertical={false} />
            <XAxis dataKey="short" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip cursor={{ fill: 'rgba(15,23,42,0.04)' }} contentStyle={TT} />
            <Bar dataKey="visits" fill="#6366F1" radius={[5, 5, 0, 0]} maxBarSize={44} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Revenue by Salesperson" empty={chartReps.length === 0}>
          <BarChart data={chartReps}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.07)" vertical={false} />
            <XAxis dataKey="short" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtCompact} width={52} />
            <Tooltip cursor={{ fill: 'rgba(15,23,42,0.04)' }} contentStyle={TT} formatter={(v) => fmtCurrency(v)} />
            <Bar dataKey="revenue" fill="#10B981" radius={[5, 5, 0, 0]} maxBarSize={44} />
          </BarChart>
        </ChartCard>
      </div>

      {/* Per-rep table + status */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card overflow-hidden xl:col-span-2">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-brand-600" />
            <h3 className="text-sm font-bold text-slate-900">Salesperson Reports</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200">
                  <th className="py-3 px-5 font-medium">Salesperson</th>
                  <th className="py-3 px-4 font-medium">Visits</th>
                  <th className="py-3 px-4 font-medium">Orders</th>
                  <th className="py-3 px-4 font-medium">Conv.</th>
                  <th className="py-3 px-4 font-medium">Revenue</th>
                  <th className="py-3 px-4 font-medium">Target</th>
                  <th className="py-3 px-4 font-medium text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {perRep.map((r) => {
                  const t = targetOf(r.id);
                  const vPct = t?.visit_goal ? Math.min(100, Math.round((r.visits / t.visit_goal) * 100)) : null;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-3 px-5 font-semibold text-slate-900 whitespace-nowrap">{r.name}</td>
                      <td className="py-3 px-4 num font-semibold text-slate-700">{r.visits}</td>
                      <td className="py-3 px-4 num text-emerald-600 font-semibold">{r.orders}</td>
                      <td className="py-3 px-4 num text-slate-600">{r.conv.toFixed(0)}%</td>
                      <td className="py-3 px-4 num text-slate-800">{r.revenue ? fmtCurrency(r.revenue) : '—'}</td>
                      <td className="py-3 px-4">
                        {vPct !== null ? (
                          <div className="flex items-center gap-1.5 min-w-[90px]">
                            <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600" style={{ width: `${vPct}%` }} />
                            </div>
                            <span className="num text-[10px] text-slate-400 shrink-0">{vPct}%</span>
                          </div>
                        ) : <span className="text-xs text-slate-400">—</span>}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link to={`/admin/reps/${r.id}`} className="text-xs font-semibold text-brand-600 hover:text-brand-700">Report →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {perRep.length === 0 && <EmptyState icon={Users} title="No salespeople yet" hint="Add your team from Team & Users." />}
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Team Status Breakdown</h3>
          {statusData.length === 0 ? (
            <EmptyState title="No visits this month" />
          ) : (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" innerRadius={54} outerRadius={78} paddingAngle={2} stroke="none">
                      {statusData.map((d) => <Cell key={d.name} fill={STATUS_COLORS[d.name]} />)}
                    </Pie>
                    <Tooltip contentStyle={TT} itemStyle={{ color: '#334155' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-1.5">
                {statusData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-[13px]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[d.name] }} />
                    <span className="text-slate-500">{d.name}</span>
                    <span className="ml-auto num font-semibold text-slate-700">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children, empty }) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-slate-900 mb-4">{title}</h3>
      {empty ? (
        <EmptyState icon={BarChart3} title="No data yet" hint="Charts appear once reps log visits." />
      ) : (
        <div className="h-64"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
      )}
    </div>
  );
}
