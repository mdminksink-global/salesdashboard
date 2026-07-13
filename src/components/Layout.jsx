import { Outlet, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import VisitModal from './VisitModal';
import ClientModal from './ClientModal';
import { useAuth } from '../context/AuthContext';
import { DataProvider, useData } from '../context/DataContext';

const TITLES = {
  '/': 'Dashboard',
  '/visits': 'Visit Log',
  '/clients': 'Clients',
  '/map': 'Client Map',
  '/pipeline': 'Deal Pipeline',
  '/quotes': 'Quotations',
  '/tasks': 'Tasks & Reminders',
  '/products': 'Product Catalog',
  '/monthly': 'Monthly Summary',
  '/team': 'Leaderboard',
  '/admin/users': 'Team & Users',
  '/settings': 'Settings',
  '/more': 'More',
};

function titleFor(pathname) {
  if (pathname.startsWith('/clients/')) return 'Client Details';
  if (pathname.startsWith('/admin/reps/')) return 'Salesperson Report';
  return TITLES[pathname] || 'Dashboard';
}

function Topbar() {
  const { pathname } = useLocation();
  const { openVisitModal } = useData();
  const { isAdmin } = useAuth();
  return (
    <header className="sticky top-0 z-20 h-16 flex items-center gap-3 px-4 sm:px-6 bg-white/80 backdrop-blur-xl border-b border-slate-200">
      <h1 className="text-lg font-bold text-slate-900 tracking-tight">{titleFor(pathname)}</h1>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
        </span>
        <span className="hidden md:inline num text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
          {format(new Date(), 'EEE, dd MMM yyyy')}
        </span>
        {!isAdmin && (
          <button className="btn-primary btn-sm" onClick={() => openVisitModal(null)}>
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add Visit</span>
          </button>
        )}
      </div>
    </header>
  );
}

function Shell() {
  return (
    <div className="h-dvh overflow-hidden flex">
      {/* Desktop sidebar only; mobile navigates via the bottom bar + More. */}
      {/* Sidebar + topbar stay fixed; only <main> scrolls. */}
      <Sidebar open={false} onClose={() => {}} />
      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4 sm:p-6 pb-24 lg:pb-6 max-w-[1500px] w-full mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
      <VisitModal />
      <ClientModal />
    </div>
  );
}

export default function Layout() {
  return (
    <DataProvider>
      <Shell />
    </DataProvider>
  );
}
