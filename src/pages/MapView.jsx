import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Loader2, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useData } from '../context/DataContext';

const INDIA = [22.9734, 78.6569];
const CAT_COLOR = {
  'Hot Lead': '#F43F5E', 'Warm Lead': '#F59E0B', 'Cold Lead': '#0EA5E9',
  'Active Client': '#10B981', 'Inactive': '#94A3B8', 'Blacklisted': '#64748B',
};

// Nominatim geocoding — free, no key. Respect the 1 req/sec usage policy.
async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.length) return null;
  return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function MapView() {
  const { clients } = useData();
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const [geocoding, setGeocoding] = useState(false);
  const [progress, setProgress] = useState('');

  const mapped = useMemo(() => clients.filter((c) => c.lat != null && c.lng != null), [clients]);
  const missing = useMemo(
    () => clients.filter((c) => (c.lat == null || c.lng == null) && (c.address || c.city)),
    [clients]
  );

  // Init map once
  useEffect(() => {
    if (mapRef.current || !mapEl.current) return;
    const map = L.map(mapEl.current, { center: INDIA, zoom: 5, scrollWheelZoom: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Redraw markers when data changes
  useEffect(() => {
    const map = mapRef.current, layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const pts = [];
    mapped.forEach((c) => {
      const color = CAT_COLOR[c.category] || '#4F46E5';
      const marker = L.circleMarker([c.lat, c.lng], {
        radius: 8, color: '#fff', weight: 2, fillColor: color, fillOpacity: 0.95,
      });
      const wa = String(c.phone || '').replace(/\D/g, '');
      const waNum = wa.length === 10 ? '91' + wa : wa;
      marker.bindPopup(
        `<div style="font-family:Inter,sans-serif;min-width:150px">
          <div style="font-weight:700;color:#0f172a">${c.name}</div>
          ${c.company ? `<div style="font-size:12px;color:#64748b">${c.company}</div>` : ''}
          ${c.category ? `<div style="font-size:11px;color:${color};margin-top:2px">${c.category}</div>` : ''}
          <div style="margin-top:6px;display:flex;gap:6px">
            ${c.phone ? `<a href="tel:${c.phone}" style="color:#4F46E5;font-size:12px;font-weight:600">Call</a>` : ''}
            ${waNum ? `<a href="https://wa.me/${waNum}" target="_blank" style="color:#059669;font-size:12px;font-weight:600">WhatsApp</a>` : ''}
            <a href="#/clients/${c.id}" style="color:#64748b;font-size:12px;font-weight:600">Open</a>
          </div>
        </div>`
      );
      marker.addTo(layer);
      pts.push([c.lat, c.lng]);
    });
    if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 13 });
  }, [mapped]);

  const runGeocode = async () => {
    setGeocoding(true);
    let done = 0;
    for (const c of missing) {
      setProgress(`Locating ${c.name}… (${done + 1}/${missing.length})`);
      try {
        const hit = await geocode([c.address, c.city, 'India'].filter(Boolean).join(', '));
        if (hit) await supabase.from('clients').update({ lat: hit.lat, lng: hit.lng }).eq('id', c.id);
      } catch { /* skip */ }
      done += 1;
      await sleep(1100); // stay within Nominatim's 1 req/sec policy
    }
    setProgress('');
    setGeocoding(false);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <MapPin className="h-4 w-4 text-brand-600" />
          <span className="num font-semibold text-slate-900">{mapped.length}</span> on map
          {missing.length > 0 && <span className="text-slate-400">· {missing.length} to locate</span>}
        </div>
        <button className="btn-primary btn-sm ml-auto" onClick={runGeocode} disabled={geocoding || missing.length === 0}>
          {geocoding ? <><Loader2 className="h-4 w-4 animate-spin" /> {progress || 'Locating…'}</> : <><Navigation className="h-4 w-4" /> Locate {missing.length || ''} clients</>}
        </button>
      </div>

      {clients.length > 0 && mapped.length === 0 && !geocoding && (
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-brand-50 ring-1 ring-brand-200 rounded-xl px-4 py-2.5">
          <Info className="h-4 w-4 text-brand-600 shrink-0" />
          Tap “Locate clients” to plot everyone with an address on the map. Uses free OpenStreetMap — no API key.
        </div>
      )}

      <div ref={mapEl} className="w-full h-[68vh] rounded-2xl overflow-hidden ring-1 ring-slate-200 shadow-card" style={{ zIndex: 0 }} />

      <div className="flex flex-wrap gap-3">
        {Object.entries(CAT_COLOR).map(([cat, color]) => (
          <span key={cat} className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} /> {cat}
          </span>
        ))}
      </div>
    </div>
  );
}
