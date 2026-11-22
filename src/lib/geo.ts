/**
 * Geodesic helpers for measuring fields on the map.
 * Area uses the spherical-excess formula on the WGS84 equatorial radius (the
 * same approach as Google's geometry library and Leaflet.draw), accurate to
 * well under 1% for farm-sized polygons.
 */

export type LatLng = [number, number];

const R = 6_378_137;
const rad = (d: number) => (d * Math.PI) / 180;

/** Polygon area in square metres. Points in order around the boundary; need not be closed. */
export function polygonArea(points: LatLng[]): number {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [lat1, lng1] = points[i];
    const [lat2, lng2] = points[(i + 1) % points.length];
    sum += rad(lng2 - lng1) * (2 + Math.sin(rad(lat1)) + Math.sin(rad(lat2)));
  }
  return Math.abs((sum * R * R) / 2);
}

/** Great-circle distance in metres (haversine). */
export function distance(a: LatLng, b: LatLng): number {
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function perimeter(points: LatLng[]): number {
  if (points.length < 2) return 0;
  let p = 0;
  for (let i = 0; i < points.length; i++) p += distance(points[i], points[(i + 1) % points.length]);
  return p;
}

/** Simple centroid (fine for small fields). */
export function centroid(points: LatLng[]): LatLng {
  const n = points.length || 1;
  return [points.reduce((s, p) => s + p[0], 0) / n, points.reduce((s, p) => s + p[1], 0) / n];
}

/** True if any two non-adjacent edges cross — a bow-tie shape gives a wrong area. */
export function selfIntersects(points: LatLng[]): boolean {
  const n = points.length;
  if (n < 4) return false;
  const cross = (a: LatLng, b: LatLng, c: LatLng) => (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]);
  const intersect = (p1: LatLng, p2: LatLng, p3: LatLng, p4: LatLng) => {
    const d1 = cross(p3, p4, p1);
    const d2 = cross(p3, p4, p2);
    const d3 = cross(p1, p2, p3);
    const d4 = cross(p1, p2, p4);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) continue;
      if (intersect(points[i], points[(i + 1) % n], points[j], points[(j + 1) % n])) return true;
    }
  }
  return false;
}

/** Nigerian land units people actually use alongside hectares. */
export const AREA_UNITS = {
  ha: 10_000,
  acre: 4_046.86,
  /** A standard plot (50 × 100 ft) in Nigerian land sales. */
  plot: 464.5,
} as const;
