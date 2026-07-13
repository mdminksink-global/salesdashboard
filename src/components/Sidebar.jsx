import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Users, CalendarRange, UsersRound, KanbanSquare, ListTodo, Package, FileText, Map as MapIcon, ShieldCheck, Settings as SettingsIcon, PenLine, LogOut, X, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { initials, classNames } from '../lib/utils';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/visits', label: 'Visit Log', icon: ClipboardList },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/map', label: 'Map', icon: MapIcon },
  { to: '/pipeline', label: 'Deal Pipeline', icon: KanbanSquare },
  { to: '/quotes', label: 'Quotations', icon: FileText },
  { to: '/tasks', label: 'Tasks', icon: ListTodo },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/monthly', label: 'Monthly Summary', icon: CalendarRange },
];

export default function Sidebar({ open, onClose }) {
  const { profile, user, isAdmin, signOut } = useAuth();
  const name = profile?.full_name || user?.email?.split('@')[0] || 'User';

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === '1');
  const toggle = () => setCollapsed((c) => { localStorage.setItem('sidebar-collapsed', c ? '0' : '1'); return !c; });

  // Admins manage the team; reps get the operational sales tools.
  const nav = isAdmin
    ? [
        { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
        { to: '/admin/users', label: 'Team & Users', icon: ShieldCheck },
        { to: '/team', label: 'Leaderboard', icon: UsersRound },
      ]
    : [
        ...NAV,
        { to: '/settings', label: 'Settings', icon: SettingsIcon },
      ];

  return (
    <>
      {open && <div className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden" onClick={onClose} />}
      <aside
        className={classNames(
          'fixed lg:static z-40 inset-y-0 left-0 w-[264px] shrink-0 flex flex-col',
          'bg-white border-r border-slate-200 transition-[width,transform] duration-200',
          collapsed && 'lg:w-[74px]',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand */}
        <div className={classNames('flex items-center gap-3 h-16 border-b border-slate-200', collapsed ? 'lg:px-0 lg:justify-center px-5' : 'px-5')}>
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 grid place-items-center shadow-glow shrink-0">
            <PenLine className="h-[18px] w-[18px] text-white" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-[15px] font-extrabold text-slate-900 tracking-tight">MDM INKS</div>
              <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-brand-600">Sales CRM</div>
            </div>
          )}
          <button className="ml-auto lg:hidden text-slate-400 cursor-pointer" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {!collapsed && <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Main</p>}
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                classNames(
                  'flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-colors duration-200 cursor-pointer whitespace-nowrap overflow-hidden',
                  collapsed ? 'lg:justify-center lg:px-0 px-3' : 'px-3',
                  isActive
                    ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                )
              }
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={toggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={classNames(
            'hidden lg:flex items-center gap-3 mx-3 mb-1 rounded-xl py-2.5 text-sm font-medium text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap overflow-hidden',
            collapsed ? 'justify-center px-0' : 'px-3'
          )}
        >
          {collapsed ? <ChevronsRight className="h-[18px] w-[18px]" /> : <><ChevronsLeft className="h-[18px] w-[18px]" /> Collapse</>}
        </button>

        {/* User */}
        <div className="p-3 border-t border-slate-200">
          {collapsed ? (
            <div className="hidden lg:flex flex-col items-center gap-2">
              <div title={name} className="h-9 w-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-xs font-bold text-white">
                {initials(name)}
              </div>
              <button onClick={signOut} title="Sign out" className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer p-1">
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 p-2.5">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-xs font-bold text-white shrink-0">
                {initials(name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-900 truncate flex items-center gap-1.5">
                  {name}
                  {isAdmin && (
                    <span className="text-[9px] font-bold uppercase tracking-wide text-accent-700 bg-accent-100 ring-1 ring-accent-200 rounded px-1 py-px">
                      Admin
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
              </div>
              <button onClick={signOut} title="Sign out" className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer p-1">
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
