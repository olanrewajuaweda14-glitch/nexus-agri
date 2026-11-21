import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const pin = L.divIcon({
  className: '',
  html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#a03c27;border:3px solid #fff;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

/** Satellite basemap with a draggable pin. Tapping the map moves the pin. */
export function MapPicker({ lat, lng, onChange, hasPoint }: { lat: number; lng: number; hasPoint: boolean; onChange: (lat: number, lng: number) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: true, attributionControl: true }).setView([lat, lng], hasPoint ? 15 : 6);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18,
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
    }).addTo(m);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18 }).addTo(m);
    m.on('click', (e: L.LeafletMouseEvent) => cb.current(e.latlng.lat, e.latlng.lng));
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      marker.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const m = map.current;
    if (!m || !hasPoint) return;
    if (!marker.current) {
      marker.current = L.marker([lat, lng], { icon: pin, draggable: true, keyboard: true, title: 'Farm location' }).addTo(m);
      marker.current.on('dragend', () => {
        const p = marker.current!.getLatLng();
        cb.current(p.lat, p.lng);
      });
      m.setView([lat, lng], Math.max(m.getZoom(), 14));
    } else {
      marker.current.setLatLng([lat, lng]);
      if (!m.getBounds().pad(-0.2).contains([lat, lng])) m.panTo([lat, lng]);
    }
  }, [lat, lng, hasPoint]);

  return <div ref={el} className="h-72 w-full overflow-hidden rounded-xl border border-line sm:h-80" aria-label="Map — tap to place your farm" />;
}
