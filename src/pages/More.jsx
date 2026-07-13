import { Link } from 'react-router-dom';
import { CalendarRange, KanbanSquare, FileText, ListTodo, Package, Map as MapIcon, UsersRound, ShieldCheck, Settings as SettingsIcon, ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const REP_LINKS = [
  { to: '/map', label: 'Client Map', desc: 'Visits & clients on a map', icon: MapIcon },
  { to: '/pipeline', label: 'Deal Pipeline', desc: 'Track orders through stages', icon: KanbanSquare },
  { to: '/quotes', label: 'Quotations', desc: 'Build & send branded quotes', icon: FileText },
  { to: '/tasks', label: 'Tasks & Reminders', desc: 'Your to-dos and follow-ups', icon: ListTodo },
  { to: '/products', label: 'Product Catalog', desc: 'Items, SKUs and pricing', icon: Package },
  { to: '/monthly', label: 'Monthly Summary', desc: 'Charts and conversion', icon: CalendarRange },
];

const ADMIN_LINKS = [
  { to: '/admin/users', label: 'Team & Users', desc: 'Create reps, set targets', icon: ShieldCheck },
  { to: '/team', label: 'Leaderboard', desc: 'Ranking across reps', icon: UsersRound },
];

export default function More() {
  const { isAdmin, signOut } = useAuth();
  const links = [...(isAdmin ? ADMIN_LINKS : REP_LINKS)];
  links.push({ to: '/settings', label: 'Settings', desc: 'Profile and targets', icon: SettingsIcon });

  return (
    <div className="space-y-2 animate-fade-in">
      {links.map(({ to, label, desc, icon: Icon }) => (
        <Link key={to} to={to} className="card p-4 flex items-center gap-3 hover:ring-1 hover:ring-brand-200 transition">
          <div className="h-10 w-10 rounded-xl bg-brand-50 text-brand-600 grid place-items-center shrink-0"><Icon className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-slate-900">{label}</div>
            <div className="text-xs text-slate-500 truncate">{desc}</div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-300" />
        </Link>
      ))}
      <button onClick={signOut} className="w-full card p-4 flex items-center gap-3 text-left hover:ring-1 hover:ring-rose-200 transition cursor-pointer">
        <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 grid place-items-center shrink-0"><LogOut className="h-5 w-5" /></div>
        <div className="font-semibold text-slate-900">Sign out</div>
      </button>
    </div>
  );
}
