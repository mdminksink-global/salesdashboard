import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Visits from './pages/Visits';
import Clients from './pages/Clients';
import Monthly from './pages/Monthly';
import Team from './pages/Team';
import AdminUsers from './pages/AdminUsers';
import RepReport from './pages/RepReport';
import ClientDetail from './pages/ClientDetail';
import Pipeline from './pages/Pipeline';
import Tasks from './pages/Tasks';
import Products from './pages/Products';
import Quotes from './pages/Quotes';
const MapView = lazy(() => import('./pages/MapView')); // Leaflet loads only on /map
import Settings from './pages/Settings';
import More from './pages/More';
import ConfigMissing from './components/ConfigMissing';

function Splash() {
  return (
    <div className="min-h-screen grid place-items-center bg-slate-50">
      <div className="h-9 w-9 rounded-full border-2 border-slate-200 border-t-brand-600 animate-spin" />
    </div>
  );
}

export default function App() {
  const { session, loading, hasSupabaseCreds } = useAuth();

  if (!hasSupabaseCreds) return <ConfigMissing />;
  if (loading) return <Splash />;

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/visits" element={<Visits />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/:id" element={<ClientDetail />} />
        <Route path="/map" element={<Suspense fallback={<div className="h-[60vh] grid place-items-center"><div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-brand-600 animate-spin" /></div>}><MapView /></Suspense>} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/quotes" element={<Quotes />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/products" element={<Products />} />
        <Route path="/monthly" element={<Monthly />} />
        <Route path="/team" element={<Team />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/reps/:id" element={<RepReport />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/more" element={<More />} />
      </Route>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
