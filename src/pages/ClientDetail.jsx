import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Building2, MapPin, Mail, Phone, MapPinned, ShoppingCart, TrendingUp, CalendarClock } from 'lucide-react';
import { useData } from '../context/DataContext';
import ContactActions from '../components/ContactActions';
import AIAssist from '../components/AIAssist';
import { CategoryBadge, StatusBadge, YesNo } from '../components/Badge';
import EmptyState from '../components/EmptyState';
import { fmtDate, fmtCurrency, initials, classNames } from '../lib/utils';
import { scoreClient, TIER_STYLE, URGENCY_DOT } from '../lib/leadScore';

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clients, visits, openClientModal } = useData();

  const client = clients.find((c) => c.id === id);

  const clientVisits = useMemo(
    () => (client ? visits.filter((v) => v.client_name === client.name) : []),
    [visits, client]
  );

  const stats = useMemo(() => {
    const orders = clientVisits.filter((v) => v.order_received);
    return {
      visits: clientVisits.length,
      orders: orders.length,
      revenue: orders.reduce((s, v) => s + (Number(v.order_value) || 0), 0),
      last: clientVisits[0]?.visit_date,
    };
  }, [clientVisits]);

  const lead = useMemo(() => (client ? scoreClient(client, clientVisits) : null), [client, clientVisits]);

  if (!client) {
    return (
      <div className="card"><EmptyState title="Client not found" hint="It may have been deleted." /></div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <Link to="/clients" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 cursor-pointer">
        <ArrowLeft className="h-4 w-4" /> Back to clients
      </Link>

      {/* Header */}
      <div className="card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-lg font-bold text-white shrink-0">
            {initials(client.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900">{client.name}</h2>
              <CategoryBadge category={client.category} />
              {lead && (
                <span className={classNames('inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 ring-1', TIER_STYLE[lead.tier])}>
                  {lead.tier} · {lead.score}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
              {client.company && <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {client.company}</span>}
              {client.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {client.city}</span>}
              {client.phone && <span className="inline-flex items-center gap-1 num"><Phone className="h-3.5 w-3.5" /> {client.phone}</span>}
              {client.email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {client.email}</span>}
            </div>
            {client.address && <div className="mt-1 text-sm text-slate-500 inline-flex items-center gap-1"><MapPinned className="h-3.5 w-3.5" /> {client.address}</div>}
          </div>
          <button className="btn-ghost btn-sm shrink-0" onClick={() => openClientModal(client)}><Pencil className="h-4 w-4" /> Edit</button>
        </div>

        {lead && (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-brand-50 ring-1 ring-brand-200 px-3.5 py-2.5">
            <span className={classNames('h-2.5 w-2.5 rounded-full shrink-0', URGENCY_DOT[lead.urgency])} />
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">Next best action</div>
              <div className="text-sm font-medium text-slate-800">{lead.action}</div>
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-200">
          <ContactActions phone={client.phone} email={client.email} address={client.address || client.city} size="lg" />
        </div>
      </div>

      {/* AI Assist */}
      <AIAssist client={client} visits={clientVisits} />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Mini icon={CalendarClock} label="Total Visits" value={stats.visits} />
        <Mini icon={ShoppingCart} label="Orders" value={stats.orders} tone="text-violet-600 bg-violet-50" />
        <Mini icon={TrendingUp} label="Lifetime Value" value={fmtCurrency(stats.revenue)} tone="text-emerald-600 bg-emerald-50" />
        <Mini icon={CalendarClock} label="Last Visit" value={stats.last ? fmtDate(stats.last) : '—'} small />
      </div>

      {client.notes && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-2">Notes</h3>
          <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{client.notes}</p>
        </div>
      )}

      {/* Visit timeline */}
      <div className="card p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Visit History</h3>
        {clientVisits.length === 0 ? (
          <EmptyState icon={CalendarClock} title="No visits logged" hint="Visits for this client will appear here." />
        ) : (
          <ol className="relative border-l border-slate-200 ml-2 space-y-5">
            {clientVisits.map((v) => (
              <li key={v.id} className="ml-5">
                <span className="absolute -left-[7px] h-3.5 w-3.5 rounded-full bg-brand-500 ring-4 ring-white" />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="num text-xs text-slate-400">{fmtDate(v.visit_date)}</span>
                  <StatusBadge status={v.visit_status} />
                  {v.order_received && <span className="num text-xs text-emerald-600 font-semibold">{fmtCurrency(v.order_value)}</span>}
                </div>
                {v.requirement && <p className="text-sm text-slate-600 mt-1">{v.requirement}</p>}
                {v.next_visit_date && <p className="text-xs text-slate-400 mt-0.5 num">Next: {fmtDate(v.next_visit_date)}</p>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function Mini({ icon: Icon, label, value, tone = 'text-brand-600 bg-brand-50', small }) {
  return (
    <div className="card p-4">
      <div className={`h-9 w-9 rounded-lg grid place-items-center ${tone}`}><Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" /></div>
      <div className={`mt-3 num font-bold text-slate-900 ${small ? 'text-base' : 'text-2xl'}`}>{value}</div>
      <div className="text-[12px] text-slate-500">{label}</div>
    </div>
  );
}
