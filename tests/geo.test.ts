import { describe, expect, it } from 'vitest';
import { centroid, distance, perimeter, polygonArea, selfIntersects, type LatLng } from '../src/lib/geo';

// A square ~100 m on a side near Ibadan: 0.000899° latitude ≈ 100 m; longitude scaled by cos(lat).
const lat = 7.4;
const dLat = 100 / 111_195;
const dLng = 100 / (111_195 * Math.cos((lat * Math.PI) / 180));
const square: LatLng[] = [[lat, 3.9], [lat, 3.9 + dLng], [lat + dLat, 3.9 + dLng], [lat + dLat, 3.9]];

describe('field geometry', () => {
  it('measures a 100 m square as about one hectare', () => {
    expect(polygonArea(square) / 10_000).toBeCloseTo(1, 1);
    expect(perimeter(square)).toBeCloseTo(400, -1);
  });
  it('ignores point order direction and needs at least 3 points', () => {
    expect(polygonArea([...square].reverse())).toBeCloseTo(polygonArea(square), 3);
    expect(polygonArea(square.slice(0, 2))).toBe(0);
  });
  it('measures distance and centre', () => {
    expect(distance(square[0], square[1])).toBeCloseTo(100, -0.5);
    expect(centroid(square)[0]).toBeCloseTo(lat + dLat / 2, 6);
  });
  it('spots a bow-tie boundary', () => {
    expect(selfIntersects(square)).toBe(false);
    expect(selfIntersects([square[0], square[2], square[1], square[3]])).toBe(true);
  });
});
