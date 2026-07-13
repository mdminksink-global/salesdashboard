import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Plus, Users, MoreHorizontal, ShieldCheck, Trophy } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { classNames } from '../lib/utils';

const REP_ITEMS = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/visits', label: 'Visits', icon: ClipboardList },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/more', label: 'More', icon: MoreHorizontal },
];

const ADMIN_ITEMS = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Team', icon: ShieldCheck },
  { to: '/team', label: 'Ranking', icon: Trophy },
  { to: '/more', label: 'More', icon: MoreHorizontal },
];

export default function BottomNav() {
  const { openVisitModal } = useData();
  const { isAdmin } = useAuth();

  // Admins: simple 4-tab bar (no Add-Visit FAB — that's a sales-rep action).
  if (isAdmin) {
    return (
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4 h-16">
          {ADMIN_ITEMS.map((it) => <Item key={it.to} {...it} />)}
        </div>
      </nav>
    );
  }

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 items-end h-16">
        {REP_ITEMS.slice(0, 2).map((it) => <Item key={it.to} {...it} />)}
        <div className="flex justify-center">
          <button
            onClick={() => openVisitModal(null)}
            aria-label="Add visit"
            className="h-14 w-14 -mt-6 rounded-2xl bg-brand-600 text-white grid place-items-center shadow-glow ring-4 ring-white cursor-pointer active:scale-95 transition-transform"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
        {REP_ITEMS.slice(2).map((it) => <Item key={it.to} {...it} />)}
      </div>
    </nav>
  );
}

function Item({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        classNames(
          'flex flex-col items-center justify-center gap-1 h-16 text-[11px] font-medium transition-colors',
          isActive ? 'text-brand-700' : 'text-slate-500'
        )
      }
    >
      <Icon className="h-5 w-5" />
      {label}
    </NavLink>
  );
}
