import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { MapPin, Sun, ShoppingCart, Clock, CalendarClock, Target, ListTodo, ArrowRight, Sparkles } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useCollection } from '../hooks/useCollection';
import KpiCard from '../components/KpiCard';
import ProgressRing from '../components/ProgressRing';
import ContactActions from '../components/ContactActions';
import AdminDashboard from './AdminDashboard';
import { StatusBadge, YesNo } from '../components/Badge';
import EmptyState from '../components/EmptyState';
import { scoreClient, TIER_STYLE, URGENCY_DOT } from '../lib/leadScore';
import { VISIT_STATUSES, STATUS_COLORS, todayISO, fmtShortDate, fmtCompact, daysUntil, classNames } from '../lib/utils';

const URGENCY_RANK = { high: 0, medium: 1, low: 2 };

export default function Dashboard() {
  const { isAdmin } = useAuth();
  if (isAdmin) return <AdminDashboard />;
  return <RepDashboard />;
}

function RepDashboard() {
  const { visits, clients, loading } = useData();
  const { rows: tasks } = useCollection('tasks', { orderBy: 'due_date', ascending: true });
  const { rows: targetRows } = useCollection('targets', { orderBy: 'period', ascending: false });
  const period = format(new Date(), 'yyyy-MM');
  const target = targetRows.find((t) => t.period === period);

  const m = useMemo(() => {
    const today = todayISO();
    const todays = visits.filter((v) => v.visit_date === today);
    const orders = visits.filter((v) => v.order_received);
    const revenue = orders.reduce((s, v) => s + (Number(v.order_value) || 0), 0);
    const pending = visits.filter((v) => {
      const d = daysUntil(v.next_visit_date);
      return d !== null && d >= 0 && !v.order_received;
    }).length;

    const statusCounts = Object.fromEntries(VISIT_STATUSES.map((s) => [s, 0]));
    visits.forEach((v) => { if (v.visit_status in statusCounts) statusCounts[v.visit_status]++; });

    const upcoming = visits
      .filter((v) => { const d = daysUntil(v.next_visit_date); return d !== null && d >= 0 && d <= 7; })
      .sort((a, b) => (a.next_visit_date > b.next_visit_date ? 1 : -1))
      .slice(0, 8);

    const monthVisits = visits.filter((v) => v.visit_date?.startsWith(period));
    const monthRevenue = monthVisits.filter((v) => v.order_received).reduce((s, v) => s + (Number(v.order_value) || 0), 0);

    return { todays, orders: orders.length, revenue, pending, statusCounts, upcoming, monthVisitCount: monthVisits.length, monthRevenue };
  }, [visits, period]);

  const openTasks = useMemo(
    () => tasks.filter((t) => !t.done).sort((a, b) => (a.due_date || '9') > (b.due_date || '9') ? 1 : -1).slice(0, 5),
    [tasks]
  );

  const priorities = useMemo(() => {
    const visitsByName = {};
    visits.forEach((v) => { (visitsByName[v.client_name] ||= []).push(v); });
    return clients
      .map((c) => ({ client: c, ...scoreClient(c, visitsByName[c.name] || []) }))
      .filter((p) => p.urgency !== 'low' && p.client.category !== 'Blacklisted')
      .sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] || b.score - a.score)
      .slice(0, 6);
  }, [clients, visits]);

  const pieData = VISIT_STATUSES.map((s) => ({ name: s, value: m.statusCounts[s] })).filter((d) => d.value > 0);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={MapPin} tone="brand" label="Total Visits" value={visits.length} />
        <KpiCard icon={Sun} tone="emerald" label="Visits Today" value={m.todays.length} />
        <KpiCard icon={ShoppingCart} tone="violet" label="Orders Received" value={m.orders} hint={'₹' + m.revenue.toLocaleString('en-IN')} />
        <KpiCard icon={Clock} tone="amber" label="Pending Follow-ups" value={m.pending} />
      </div>

      {/* Targets + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><Target className="h-4 w-4 text-accent-600" /> {format(new Date(), 'MMMM')} Target</h3>
            <Link to="/settings" className="text-xs text-brand-600 font-semibold hover:text-brand-700">Set goal</Link>
          </div>
          {target && (target.visit_goal > 0 || target.revenue_goal > 0) ? (
            <div className="flex flex-wrap gap-6">
              <ProgressRing
                value={target.visit_goal ? (m.monthVisitCount / target.visit_goal) * 100 : 0}
                label="Visits" sub={`${m.monthVisitCount} / ${target.visit_goal || 0}`}
              />
              <ProgressRing
                color="#10B981"
                value={target.revenue_goal ? (m.monthRevenue / target.revenue_goal) * 100 : 0}
                label="Revenue" sub={`${fmtCompact(m.monthRevenue)} / ${fmtCompact(target.revenue_goal || 0)}`}
              />
            </div>
          ) : (
            <EmptyState icon={Target} title="No target set" hint="Set a monthly goal in Settings." />
          )}
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><ListTodo className="h-4 w-4 text-brand-600" /> My Tasks</h3>
            <Link to="/tasks" className="inline-flex items-center gap-1 text-xs text-brand-600 font-semibold hover:text-brand-700">All tasks <ArrowRight className="h-3 w-3" /></Link>
          </div>
          {openTasks.length === 0 ? (
            <EmptyState icon={ListTodo} title="You're all caught up" hint="No open tasks right now." />
          ) : (
            <div className="divide-y divide-slate-100">
              {openTasks.map((t) => {
                const d = daysUntil(t.due_date);
                const overdue = d !== null && d < 0;
                return (
                  <Link key={t.id} to="/tasks" className="flex items-center gap-3 py-2.5 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${t.priority === 'High' ? 'bg-rose-500' : t.priority === 'Low' ? 'bg-slate-300' : 'bg-amber-500'}`} />
                    <span className="text-sm text-slate-800 font-medium truncate flex-1">{t.title}</span>
                    {t.due_date && <span className={`num text-xs shrink-0 ${overdue ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>{overdue ? 'Overdue' : fmtShortDate(t.due_date)}</span>}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Smart priorities — who to contact next (rule-based) */}
      {priorities.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-accent-600" /> Priority Actions</h3>
            <span className="text-xs text-slate-400">who to contact next</span>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {priorities.map(({ client, score, tier, action, urgency }) => (
              <div key={client.id} className="rounded-xl ring-1 ring-slate-200 p-3.5 hover:ring-brand-200 transition">
                <div className="flex items-center justify-between gap-2">
                  <Link to={`/clients/${client.id}`} className="font-semibold text-slate-900 truncate hover:text-brand-700">{client.name}</Link>
                  <span className={classNames('shrink-0 text-[10px] font-bold rounded-full px-1.5 py-0.5 ring-1', TIER_STYLE[tier])}>{score}</span>
                </div>
                <div className="mt-1.5 flex items-start gap-1.5">
                  <span className={classNames('h-2 w-2 rounded-full mt-1 shrink-0', URGENCY_DOT[urgency])} />
                  <span className="text-[13px] text-slate-600 leading-snug">{action}</span>
                </div>
                <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                  <ContactActions phone={client.phone} email={client.email} address={client.address || client.city} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Status breakdown */}
        <div className="card p-5 xl:col-span-1">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Visit Status Breakdown</h3>
          {pieData.length === 0 ? (
            <EmptyState title="No visits yet" hint="Add your first visit to see the breakdown." />
          ) : (
            <>
              <div className="h-52 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" innerRadius={62} outerRadius={88} paddingAngle={2} stroke="none">
                      {pieData.map((d) => <Cell key={d.name} fill={STATUS_COLORS[d.name]} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12, boxShadow: '0 8px 24px -8px rgba(15,23,42,0.18)' }}
                      itemStyle={{ color: '#334155' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 grid place-items-center pointer-events-none">
                  <div className="text-center">
                    <div className="num text-2xl font-bold text-slate-900">{visits.length}</div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">Total</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                {VISIT_STATUSES.map((s) => (
                  <div key={s} className="flex items-center gap-2 text-[13px]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[s] }} />
                    <span className="text-slate-400">{s}</span>
                    <span className="ml-auto num font-semibold text-slate-700">{m.statusCounts[s]}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Today's visits */}
        <div className="card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Today's Visits</h3>
            <span className="text-xs text-slate-500 num">{m.todays.length} logged</span>
          </div>
          {m.todays.length === 0 ? (
            <EmptyState icon={Sun} title="No visits logged today" hint="Use “Add Visit” to log one." />
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <th className="py-2 px-1 font-medium">Client</th>
                    <th className="py-2 px-1 font-medium">Company</th>
                    <th className="py-2 px-1 font-medium">Status</th>
                    <th className="py-2 px-1 font-medium">Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {m.todays.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-1 font-semibold text-slate-900">{v.client_name}</td>
                      <td className="py-2.5 px-1 text-slate-400">{v.company || '—'}</td>
                      <td className="py-2.5 px-1"><StatusBadge status={v.visit_status} /></td>
                      <td className="py-2.5 px-1"><YesNo value={v.order_received} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming follow-ups */}
      <div className="card p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Upcoming Follow-ups · next 7 days</h3>
        {m.upcoming.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Nothing scheduled" hint="No follow-ups in the next 7 days." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {m.upcoming.map((v) => {
              const d = daysUntil(v.next_visit_date);
              const tone = d === 0 ? 'text-rose-700 bg-rose-50 ring-rose-200'
                : d <= 2 ? 'text-amber-700 bg-amber-50 ring-amber-200'
                : 'text-slate-600 bg-slate-100 ring-slate-200';
              return (
                <div key={v.id} className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="num text-xs text-slate-400">{fmtShortDate(v.next_visit_date)}</span>
                    <span className={`num text-[11px] font-semibold rounded-full px-2 py-0.5 ring-1 ${tone}`}>
                      {d === 0 ? 'Today' : `${d}d`}
                    </span>
                  </div>
                  <div className="mt-2 font-semibold text-slate-900 truncate">{v.client_name}</div>
                  <div className="text-xs text-slate-500 truncate">{v.company || '—'}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="card p-5 h-32 animate-pulse" />)}
      </div>
      <div className="grid xl:grid-cols-3 gap-6">
        <div className="card h-96 animate-pulse" />
        <div className="card h-96 xl:col-span-2 animate-pulse" />
      </div>
    </div>
  );
}
