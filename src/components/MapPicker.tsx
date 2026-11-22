import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { LatLng } from '../lib/geo';

const pin = L.divIcon({
  className: '',
  html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#a03c27;border:3px solid #fff;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

const vertex = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#f2ede2;border:3px solid #2c6a3c;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const me = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#2b5b89;border:3px solid #fff;box-shadow:0 0 0 6px rgba(43,91,137,.25)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

interface Props {
  lat: number;
  lng: number;
  hasPoint: boolean;
  onChange: (lat: number, lng: number) => void;
  /** Field boundary being drawn or already saved. */
  boundary?: LatLng[];
  /** While true, taps add boundary corners instead of moving the pin. */
  measuring?: boolean;
  onBoundary?: (points: LatLng[]) => void;
  /** Live GPS position while walking the boundary. */
  position?: LatLng | null;
}

/** Satellite basemap with a draggable pin, or a field boundary you tap out corner by corner. */
export function MapPicker({ lat, lng, onChange, hasPoint, boundary = [], measuring = false, onBoundary, position }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const shape = useRef<L.LayerGroup | null>(null);
  const meMarker = useRef<L.Marker | null>(null);
  const state = useRef({ onChange, onBoundary, measuring, boundary });
  state.current = { onChange, onBoundary, measuring, boundary };

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: true, attributionControl: true }).setView([lat, lng], hasPoint ? 16 : 6);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      maxNativeZoom: 18,
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
    }).addTo(m);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, maxNativeZoom: 18 }).addTo(m);
    m.on('click', (e: L.LeafletMouseEvent) => {
      const s = state.current;
      if (s.measuring) s.onBoundary?.([...s.boundary, [e.latlng.lat, e.latlng.lng]]);
      else s.onChange(e.latlng.lat, e.latlng.lng);
    });
    shape.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      marker.current = null;
      shape.current = null;
      meMarker.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pin
  useEffect(() => {
    const m = map.current;
    if (!m || !hasPoint) return;
    if (!marker.current) {
      marker.current = L.marker([lat, lng], { icon: pin, draggable: true, keyboard: true, title: 'Farm location' }).addTo(m);
      marker.current.on('dragend', () => {
        const p = marker.current!.getLatLng();
        state.current.onChange(p.lat, p.lng);
      });
      if (!boundary.length) m.setView([lat, lng], Math.max(m.getZoom(), 15));
    } else {
      marker.current.setLatLng([lat, lng]);
      if (!measuring && !m.getBounds().pad(-0.2).contains([lat, lng])) m.panTo([lat, lng]);
    }
    marker.current.setOpacity(measuring ? 0.35 : 1);
  }, [lat, lng, hasPoint, measuring]); // eslint-disable-line react-hooks/exhaustive-deps

  // Starting to measure: zoom in close so corners land where the farmer means.
  useEffect(() => {
    const m = map.current;
    if (!m || !measuring || boundary.length) return;
    if (m.getZoom() < 17) m.setView(hasPoint ? [lat, lng] : m.getCenter(), 17);
  }, [measuring]); // eslint-disable-line react-hooks/exhaustive-deps

  // Boundary
  useEffect(() => {
    const g = shape.current;
    const m = map.current;
    if (!g || !m) return;
    g.clearLayers();
    if (!boundary.length) return;
    // Not interactive: taps on the outline must reach the map so they add corners.
    const style = { color: '#f5d36b', weight: 3, fillColor: '#f5d36b', fillOpacity: 0.18, interactive: false };
    if (boundary.length >= 3) L.polygon(boundary, style).addTo(g);
    else if (boundary.length === 2) L.polyline(boundary, style).addTo(g);
    if (measuring) {
      boundary.forEach((p, i) => {
        const v = L.marker(p, { icon: vertex, draggable: true, keyboard: false, title: `Corner ${i + 1}` }).addTo(g);
        v.on('dragend', () => {
          const ll = v.getLatLng();
          const next = [...state.current.boundary];
          next[i] = [ll.lat, ll.lng];
          state.current.onBoundary?.(next);
        });
      });
    } else if (boundary.length >= 3) {
      m.fitBounds(L.latLngBounds(boundary).pad(0.3), { maxZoom: 18 });
    }
  }, [boundary, measuring]);

  // GPS position while walking
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!position) {
      meMarker.current?.remove();
      meMarker.current = null;
      return;
    }
    if (!meMarker.current) meMarker.current = L.marker(position, { icon: me, interactive: false }).addTo(m);
    else meMarker.current.setLatLng(position);
    m.panTo(position);
  }, [position]);

  // Leaflet adds its own classes to the map element, so React must never re-render
  // that element's className. Styling that changes lives on the wrapper.
  return (
    <div className={`overflow-hidden rounded-xl border transition-shadow ${measuring ? 'border-sun ring-2 ring-sun/40' : 'border-line'}`}>
      <div ref={el} className="h-72 w-full sm:h-80" aria-label={measuring ? 'Map — tap each corner of the field' : 'Map — tap to place your farm'} />
    </div>
  );
}
