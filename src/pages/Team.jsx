import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { Trophy, Medal } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import EmptyState from '../components/EmptyState';
import { fmtCurrency, initials } from '../lib/utils';

export default function Team() {
  const { isAdmin } = useAuth();
  const { visits, profiles, profilesById } = useData();

  const board = useMemo(() => {
    const acc = {};
    for (const p of profiles) acc[p.id] = { id: p.id, name: p.full_name || p.email, visits: 0, orders: 0, revenue: 0 };
    for (const v of visits) {
      const r = acc[v.owner_id] || (acc[v.owner_id] = { id: v.owner_id, name: profilesById[v.owner_id]?.full_name || 'Unknown', visits: 0, orders: 0, revenue: 0 });
      r.visits++;
      if (v.order_received) { r.orders++; r.revenue += Number(v.order_value) || 0; }
    }
    return Object.values(acc)
      .map((r) => ({ ...r, conv: r.visits ? (r.orders / r.visits) * 100 : 0 }))
      .sort((a, b) => b.revenue - a.revenue || b.visits - a.visits);
  }, [visits, profiles, profilesById]);

  if (!isAdmin) return <Navigate to="/" replace />;

  const maxRevenue = Math.max(...board.map((r) => r.revenue), 1);
  const medalTone = ['text-amber-400', 'text-slate-600', 'text-orange-400'];

  return (
    <div className="space-y-5 animate-fade-in">
      <p className="text-sm text-slate-400">Ranked by revenue, then visit volume — across all reps.</p>

      {board.length === 0 ? (
        <div className="card"><EmptyState icon={Trophy} title="No reps yet" hint="Reps appear here once they log visits." /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200">
                  <th className="py-3 px-5 font-medium">Rank</th>
                  <th className="py-3 px-4 font-medium">Rep</th>
                  <th className="py-3 px-4 font-medium">Visits</th>
                  <th className="py-3 px-4 font-medium">Orders</th>
                  <th className="py-3 px-4 font-medium">Conversion</th>
                  <th className="py-3 px-4 font-medium">Revenue</th>
                  <th className="py-3 px-4 font-medium w-40">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {board.map((r, i) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-3 px-5">
                      {i < 3 ? <Medal className={`h-5 w-5 ${medalTone[i]}`} /> : <span className="num text-slate-500">{i + 1}</span>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-[11px] font-bold text-white">{initials(r.name)}</div>
                        <span className="font-semibold text-slate-900">{r.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 num font-semibold text-slate-700">{r.visits}</td>
                    <td className="py-3 px-4 num text-emerald-600 font-semibold">{r.orders}</td>
                    <td className="py-3 px-4 num text-slate-600">{r.conv.toFixed(1)}%</td>
                    <td className="py-3 px-4 num font-semibold text-slate-900">{fmtCurrency(r.revenue)}</td>
                    <td className="py-3 px-4">
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500" style={{ width: `${(r.revenue / maxRevenue) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
