import { describe, expect, it } from 'vitest';
import { csvUrlFromPackage, parseCsv, parseWfp, seasonalForecast, seasonalIndex, summarizePrices, unitKg } from '../src/lib/data/prices';

const HEAD = 'date,admin1,admin2,market,market_id,latitude,longitude,category,commodity,commodity_id,unit,unit_id,priceflag,pricetype,currency,price,usdprice';
const HXL = '#date,#adm1+name,#adm2+name,#loc+market+name,#loc+market+code,#geo+lat,#geo+lon,#item+type,#item+name,#item+code,#item+unit+name,#item+unit+code,#item+price+flag,#item+price+type,#currency+code,#value,#value+usd';
const y = new Date().getUTCFullYear();

/** Maize at two markets, three years, low after harvest (Oct–Nov), high in the lean season (Jun–Jul). */
function sampleCsv() {
  const shape = [1.0, 1.05, 1.1, 1.15, 1.2, 1.3, 1.3, 1.15, 1.0, 0.85, 0.8, 0.9];
  const lines = [HEAD, HXL];
  for (const yr of [y - 3, y - 2, y - 1]) {
    for (let m = 0; m < 12; m++) {
      const d = `${yr}-${String(m + 1).padStart(2, '0')}-15`;
      const p = Math.round(50_000 * shape[m] * (1 + (yr - (y - 3)) * 0.1));
      lines.push(`${d},Oyo,Ibadan North,Bodija,1,7.4352,3.9133,cereals and tubers,Maize (white),1,100 KG,1,actual,Wholesale,NGN,${p},30`);
      lines.push(`${d},Kano,Dala,"Dawanau, Kano",2,12.0,8.5,cereals and tubers,Maize (white),1,100 KG,1,actual,Wholesale,NGN,${p - 5000},28`);
      lines.push(`${d},Oyo,Ibadan North,Bodija,1,7.4352,3.9133,cereals and tubers,Maize (white),1,KG,5,actual,Retail,NGN,${Math.round(p / 80)},0.4`);
    }
  }
  lines.push(`${y - 1}-12-15,Oyo,Ibadan North,Bodija,1,7.4352,3.9133,cereals and tubers,Maize (white),1,Bowl,9,actual,Retail,NGN,900,0.5`);
  lines.push(`${y - 1}-12-15,Oyo,Ibadan North,Bodija,1,7.4352,3.9133,pulses and nuts,Cowpeas (white),2,100 KG,1,actual,Wholesale,USD,90,90`);
  return lines.join('\r\n');
}

describe('price file parsing', () => {
  it('parses quoted CSV fields and units', () => {
    expect(parseCsv('a,"b, c","say ""hi"""\r\n1,2,3')).toEqual([['a', 'b, c', 'say "hi"'], ['1', '2', '3']]);
    expect(unitKg('KG')).toBe(1);
    expect(unitKg('100 KG')).toBe(100);
    expect(unitKg('Bowl')).toBeNull();
  });
  it('keeps naira prices per kg, skips the tag row, other units and other currencies', () => {
    const rows = parseWfp(sampleCsv());
    expect(rows.every((r) => r.perKg > 0)).toBe(true);
    expect(rows.some((r) => r.commodity.startsWith('Cowpeas'))).toBe(false); // USD row dropped
    expect(rows.some((r) => r.market === 'Dawanau, Kano')).toBe(true);
    expect(rows.find((r) => r.pricetype === 'Wholesale' && r.market === 'Bodija')!.perKg).toBeCloseTo(500, -1);
  });
  it('rejects a file with the wrong columns', () => {
    expect(() => parseWfp('foo,bar\n1,2')).toThrow(/format/);
  });
  it('finds the CSV link in the dataset metadata', () => {
    expect(csvUrlFromPackage({ result: { resources: [{ url: 'https://x/qc.csv', format: 'CSV' }, { url: 'https://data.humdata.org/dataset/abc/resource/def/download/wfp_food_prices_nga.csv', format: 'CSV' }] } })).toMatch(/wfp_food_prices_nga\.csv$/);
  });
});

describe('price summary', () => {
  const rows = parseWfp(sampleCsv());
  it('picks the nearest monitored market and wholesale prices', () => {
    const s = summarizePrices(rows, 'maize', 7.43, 3.93, `${y}-01-20`)!;
    expect(s.market).toBe('Bodija');
    expect(s.pricetype).toBe('Wholesale');
    expect(s.distanceKm).toBeLessThan(5);
    expect(s.latest.month).toBe(`${y - 1}-12`);
    expect(s.latest.perTon).toBe(Math.round(50_000 * 0.9 * 1.2 * 10));
    expect(s.history).toHaveLength(24);
    expect(s.nearby[0].market).toBe('Dawanau, Kano');
    expect(s.ageMonths).toBe(1);
  });
  it('recovers the seasonal shape: cheapest after harvest, dearest in the lean season', () => {
    const s = summarizePrices(rows, 'maize', 7.43, 3.93, `${y}-01-20`)!;
    expect(s.seasonalSource).toBe('market');
    const idx = s.seasonal!;
    expect(idx.indexOf(Math.min(...idx))).toBe(10); // November
    expect([5, 6]).toContain(idx.indexOf(Math.max(...idx))); // June/July
    // Storing from November to June: ~1.3 / 0.8 → about 60% higher.
    const nov = { ...s, latest: { month: `${y - 1}-11`, perTon: 400_000 } };
    expect(seasonalForecast(nov, 7, `${y - 1}-11-15`)! / 400_000).toBeCloseTo(1.3 / 0.8, 1);
  });
  it('returns null for crops with no data and needs two full years for a seasonal pattern', () => {
    expect(summarizePrices(rows, 'tomato', 7.4, 3.9)).toBeNull();
    expect(seasonalIndex([{ date: `${y}-01-01`, perKg: 1 }])).toBeNull();
  });
});
