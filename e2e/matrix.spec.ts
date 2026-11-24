import { expect, test } from '@playwright/test';
import { lagosToday, mockApi, nav } from './mocks';

const CROPS = ['maize', 'rice', 'sorghum', 'soybean', 'cowpea', 'tomato', 'cassava'] as const;
const STAGES = [{ label: 'before planting', dap: -12 }, { label: 'mid-season', dap: 45 }, { label: 'after maturity', dap: 330 }];
const BAD = /\bNaN\b|\bundefined\b|\bInfinity\b|\[object Object\]/;

const addDays = (d: string, n: number) => new Date(Date.parse(d) + n * 864e5).toISOString().slice(0, 10);

test.describe.configure({ mode: 'parallel' });

for (const crop of CROPS) {
  test(`${crop}: every screen renders cleanly at every stage`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await mockApi(page);
    for (const stage of STAGES) {
      const farm = { id: `${crop}-${stage.dap}`, name: `${crop} ${stage.label}`, lat: 7.43, lng: 3.93, crop, plantingDate: addDays(lagosToday(), -stage.dap), maturity: 'medium', sizeHa: 0.8, water: stage.dap === 45 ? 'irrigated' : 'rainfed', createdAt: '' };
      await page.addInitScript((f) => {
        localStorage.setItem('na:farms', JSON.stringify([f]));
        localStorage.setItem('na:active', JSON.stringify(f.id));
        sessionStorage.setItem('na:session', '1');
      }, farm);
      await page.goto('/#plan');
      await page.getByRole('heading', { name: "This week's plan" }).waitFor();
      const screens: [string, string | null][] = [['Plan', null], ['Weather', null], ['Field', null], ['Money', 'Budget'], ['Money', 'Buy list'], ['Money', 'Records'], ['Money', 'Sell or store'], ['Ask', null], ['Home', null], ['Tasks', null], ['Alerts', null]];
      for (const [tab, sub] of screens) {
        await nav(page, tab);
        if (sub) await page.getByRole('radio', { name: sub }).click();
        await page.waitForTimeout(150);
        const text = await page.locator('main').innerText();
        expect(text, `${crop} ${stage.label} › ${tab}${sub ? ' › ' + sub : ''}`).not.toMatch(BAD);
      }
    }
    expect(errors).toEqual([]);
  });
}
