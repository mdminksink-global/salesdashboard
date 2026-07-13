import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, MapPin, ShoppingCart, IndianRupee, Percent, Clock, Target } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useProfiles } from '../hooks/useProfiles';
import { useCollection } from '../hooks/useCollection';
import KpiCard from '../components/KpiCard';
import ProgressRing from '../components/ProgressRing';
import { StatusBadge, YesNo } from '../components/Badge';
import EmptyState from '../components/EmptyState';
import { fmtDate, fmtCurrency, fmtCompact, daysUntil, initials } from '../lib/utils';

export default function RepReport() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const { visits } = useData();
  const { byId } = useProfiles();
  const { rows: targets } = useCollection('targets', { orderBy: 'period', ascending: false });

  const rep = byId[id];
  const repVisits = useMemo(() => visits.filter((v) => v.owner_id === id), [visits, id]);

  const years = useMemo(() => {
    const set = new Set(repVisits.map((v) => v.visit_date?.slice(0, 7)).filter(Boolean));
    set.add(format(new Date(), 'yyyy-MM'));
    return [...set].sort().reverse();
  }, [repVisits]);
  const [period, setPeriod] = useState(format(new Date(), 'yyyy-MM'));

  const monthVisits = useMemo(() => repVisits.filter((v) => v.visit_date?.startsWith(period)), [repVisits, period]);
  const target = targets.find((t) => t.owner_id === id && t.period === period);

  const m = useMemo(() => {
    const orders = monthVisits.filter((v) => v.order_received);
    const revenue = orders.reduce((s, v) => s + (Number(v.order_value) || 0), 0);
    const pending = repVisits.filter((v) => { const d = daysUntil(v.next_visit_date); return d !== null && d >= 0 && !v.order_received; }).length;

    const byDay = {};
    for (const v of monthVisits) {
      const d = (byDay[v.visit_date] ||= { date: v.visit_date, visits: 0, orders: 0, revenue: 0 });
      d.visits++;
      if (v.order_received) { d.orders++; d.revenue += Number(v.order_value) || 0; }
    }
    const days = Object.values(byDay).sort((a, b) => (a.date < b.date ? 1 : -1));
    return { orders: orders.length, revenue, pending, conv: monthVisits.length ? (orders.length / monthVisits.length) * 100 : 0, days };
  }, [monthVisits, repVisits]);

  if (!isAdmin) return <Navigate to="/" replace />;
  if (!rep) return <div className="card"><EmptyState title="Salesperson not found" hint="They may have been removed." /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      <Link to="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 cursor-pointer">
        <ArrowLeft className="h-4 w-4" /> Back to team
      </Link>

      {/* Header */}
      <div className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-base font-bold text-white shrink-0">{initials(rep.full_name || rep.email)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">{rep.full_name || '—'}</h2>
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 bg-slate-100 ring-1 ring-slate-200 rounded px-1.5 py-0.5">{rep.role}</span>
          </div>
          <div className="text-sm text-slate-500">{rep.email}</div>
        </div>
        <select className="input w-auto" value={period} onChange={(e) => setPeriod(e.target.value)}>
          {years.map((y) => <option key={y} value={y}>{format(parseISO(y + '-01'), 'MMM yyyy')}</option>)}
        </select>
      </div>

      {/* Target progress */}
      <div className="card p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-1.5"><Target className="h-4 w-4 text-accent-600" /> Target Progress</h3>
        {target && (target.visit_goal || target.revenue_goal) ? (
          <div className="flex flex-wrap gap-8">
            <ProgressRing size={84} value={target.visit_goal ? (monthVisits.length / target.visit_goal) * 100 : 0} label="Visits" sub={`${monthVisits.length} / ${target.visit_goal || 0}`} />
            <ProgressRing size={84} color="#10B981" value={target.revenue_goal ? (m.revenue / target.revenue_goal) * 100 : 0} label="Revenue" sub={`${fmtCompact(m.revenue)} / ${fmtCompact(target.revenue_goal || 0)}`} />
          </div>
        ) : (
          <EmptyState icon={Target} title="No target set for this month" hint="Set one from the team list." />
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={MapPin} tone="brand" label="Visits" value={monthVisits.length} />
        <KpiCard icon={ShoppingCart} tone="violet" label="Orders" value={m.orders} />
        <KpiCard icon={IndianRupee} tone="emerald" label="Revenue" value={fmtCompact(m.revenue)} />
        <KpiCard icon={Percent} tone="amber" label="Conversion" value={m.conv.toFixed(1) + '%'} />
      </div>

      {/* Daily report */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Daily Activity · {format(parseISO(period + '-01'), 'MMMM yyyy')}</h3>
          <span className="text-xs text-slate-400 inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {m.pending} pending follow-ups</span>
        </div>
        {m.days.length === 0 ? (
          <EmptyState icon={MapPin} title="No activity this month" hint="No visits logged in this period." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200">
                  <th className="py-3 px-5 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium">Visits</th>
                  <th className="py-3 px-4 font-medium">Orders</th>
                  <th className="py-3 px-4 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {m.days.map((d) => (
                  <tr key={d.date} className="hover:bg-slate-50">
                    <td className="py-3 px-5 font-semibold text-slate-900 whitespace-nowrap">{fmtDate(d.date)}</td>
                    <td className="py-3 px-4 num font-semibold text-slate-700">{d.visits}</td>
                    <td className="py-3 px-4 num text-emerald-600 font-semibold">{d.orders}</td>
                    <td className="py-3 px-4 num text-slate-700">{d.revenue ? fmtCurrency(d.revenue) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent visits */}
      <div className="card p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Recent Visits</h3>
        {monthVisits.length === 0 ? (
          <EmptyState title="Nothing to show" />
        ) : (
          <div className="divide-y divide-slate-100">
            {monthVisits.slice(0, 12).map((v) => (
              <div key={v.id} className="flex items-center gap-3 py-2.5">
                <span className="num text-xs text-slate-400 w-20 shrink-0">{fmtDate(v.visit_date)}</span>
                <span className="font-medium text-slate-800 truncate flex-1">{v.client_name}<span className="text-slate-400 font-normal">{v.company ? ` · ${v.company}` : ''}</span></span>
                <StatusBadge status={v.visit_status} />
                <YesNo value={v.order_received} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
