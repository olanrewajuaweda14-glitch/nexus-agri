import { expect, test, type Page } from '@playwright/test';
import { mockApi, nav, rawSources, startSample } from './mocks';

const errorsOf = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource/.test(m.text())) errors.push(m.text());
  });
  return errors;
};

test.describe('plan', () => {
  test('sample farm shows the week, the sky and the crop', async ({ page }) => {
    const errors = errorsOf(page);
    await mockApi(page);
    await startSample(page);

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Maize, day');
    await expect(page.getByRole('img', { name: /Maize drawing at day 38/ })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: /spray/i }).first()).toBeVisible();
    await expect(page.getByText('Do now', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'First weeding' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Top-dress with urea' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Next 8 days' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Later this season' })).toBeVisible();
    await expect(page.getByRole('img', { name: /0 of \d+ jobs done/ })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('fertilizer card gives the amount for this farm', async ({ page }) => {
    await mockApi(page);
    await startSample(page);
    await page.getByRole('button', { name: /^Top-dress with urea/ }).click();
    await expect(page.getByText('For your 2 ha: 260 kg of urea — 5¼ bags (50 kg).', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: /^Top-dress with urea/ }).click();
    // Closed details are inert: out of the tab order, hidden from screen readers and find-in-page.
    const details = page.locator('[inert]').filter({ hasText: 'For your 2 ha: 260 kg of urea' });
    await expect(details).toHaveCount(1);
  });

  test('ticking a job fills the ring and survives a reload', async ({ page }) => {
    await mockApi(page);
    await startSample(page);
    const ring = page.getByRole('img', { name: /jobs done this week/ });
    const total = Number((await ring.getAttribute('aria-label'))!.match(/of (\d+)/)![1]);

    await page.getByRole('button', { name: 'Mark "Top-dress with urea" as done' }).click();
    await expect(ring).toHaveAttribute('aria-label', `1 of ${total} jobs done this week`);
    await expect(page.getByRole('button', { name: 'Mark "Top-dress with urea" as not done' })).toHaveAttribute('aria-pressed', 'true');

    await page.reload();
    await page.getByRole('heading', { name: "This week's plan" }).waitFor();
    await expect(page.getByRole('img', { name: /jobs done this week/ })).toHaveAttribute('aria-label', `1 of ${total} jobs done this week`);

    await page.getByRole('button', { name: 'Mark "Top-dress with urea" as not done' }).click();
    await expect(page.getByRole('img', { name: /jobs done this week/ })).toHaveAttribute('aria-label', `0 of ${total} jobs done this week`);
  });

  test('a failed forecast still shows calendar jobs with honest guidance', async ({ page }) => {
    await mockApi(page, { weatherFails: true });
    await startSample(page);
    await expect(page.getByRole('alert')).toContainText("Couldn't load the forecast");
    await page.getByRole('button', { name: /^Top-dress with urea/ }).click();
    await expect(page.getByText(/No forecast loaded/).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Next 8 days' })).toHaveCount(0);
  });

  test('offline after a good load keeps the saved forecast', async ({ page }) => {
    await mockApi(page);
    await startSample(page);
    // Later routes take priority: cut the network for weather.
    await page.route('**/api/weather**', (r) => r.abort());
    await page.route('**/api.open-meteo.com/**', (r) => r.abort());
    await page.getByRole('button', { name: 'Refresh data' }).click();
    await expect(page.getByText(/Offline — using the forecast saved/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Top-dress with urea' })).toBeVisible();
  });
});

test.describe('tabs', () => {
  test('weather: spray windows, 8 forecast rows, rainfall normals', async ({ page }) => {
    const errors = errorsOf(page);
    await mockApi(page);
    await startSample(page);
    await nav(page, 'Weather');
    await expect(page.getByRole('heading', { name: 'Spray windows' })).toBeVisible();
    await expect(page.getByText(/Best next window/)).toBeVisible();
    await expect(page.locator('#forecast ol > li')).toHaveCount(8);
    await expect(page.getByText('80% of normal')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('field: water tank, soil findings and lab results with validation', async ({ page }) => {
    await mockApi(page);
    await startSample(page);
    await nav(page, 'Field');
    await expect(page.getByRole('img', { name: /Root zone \d+% full/ })).toBeVisible();
    await expect(page.getByText('pH 5.3 is too acidic for maize')).toBeVisible();
    await expect(page.getByText('Sandy loam')).toBeVisible();

    await page.getByRole('button', { name: /Enter lab results/ }).click();
    await page.getByLabel(/^Sand/).fill('70');
    await page.getByLabel(/^Clay/).fill('40');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('alert')).toContainText('cannot be more than 100%');

    await page.getByLabel(/^Clay/).fill('20');
    await page.getByLabel(/^pH/).fill('6.2');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('lab results + SoilGrids')).toBeVisible();
    await expect(page.getByText('pH 6.2 suits maize')).toBeVisible();
  });

  test('money: editing price updates profit; reset restores the example', async ({ page }) => {
    await mockApi(page);
    await startSample(page);
    await nav(page, 'Money');
    await expect(page.getByText(/example figures/)).toBeVisible();
    const price = page.getByRole('textbox').nth(1);
    await price.fill('300000');
    await price.blur();
    // 3 t/ha × ₦300,000 × 2 ha = ₦1.8m revenue against ₦1.93m cost → a loss.
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Expected loss', { timeout: 3000 });
    await expect(page.getByText(/example figures/)).toHaveCount(0);
    await page.getByRole('button', { name: 'Reset to example' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Expected profit');
  });

  test('ask: says plainly when the advisor is off', async ({ page }) => {
    await mockApi(page, { ai: false });
    await startSample(page);
    await nav(page, 'Ask');
    await expect(page.getByText('The AI advisor is switched off on this server.')).toBeVisible();
    await expect(page.getByLabel('Your question')).toBeDisabled();
  });

  test('ask: answers a question from the farm data and checks a photo', async ({ page }) => {
    await mockApi(page, { ai: true });
    let sent: any;
    await page.route('**/api/ask', (r) => {
      sent = r.request().postDataJSON();
      r.fulfill({ json: { answer: 'Apply the urea before Monday’s rain.', steps: ['130 kg/ha, 5 cm from the plant.'], basedOn: ['18 mm Monday'], confidence: 'high', missing: '' } });
    });
    await page.route('**/api/diagnose', (r) =>
      r.fulfill({ json: { usable: true, problemIfUnusable: '', summary: 'Likely nitrogen deficiency.', findings: [{ name: 'Nitrogen deficiency', type: 'nutrient', likelihood: 'likely', evidence: 'V-shaped yellowing.' }], confirmBy: ['Oldest leaves first?'], actions: ['Top-dress this week.'], urgent: false } }),
    );
    await startSample(page);
    await nav(page, 'Ask');
    await page.getByLabel('Answer in').selectOption('ha');
    await page.getByLabel('Your question').fill('Should I top-dress now?');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByText('Apply the urea before Monday’s rain.')).toBeVisible();
    expect(sent.language).toBe('ha');
    expect(sent.context.stage.dap).toBe(38);
    expect(sent.context.plan.length).toBeGreaterThan(0);

    await page.getByRole('radio', { name: 'Check a photo' }).click();
    // A real JPEG so the in-browser resize path runs.
    const jpeg = await page.evaluate(async () => {
      const c = document.createElement('canvas');
      c.width = 1600;
      c.height = 1200;
      const g = c.getContext('2d')!;
      g.fillStyle = '#4a7a32';
      g.fillRect(0, 0, 1600, 1200);
      return c.toDataURL('image/jpeg', 0.9).split(',')[1];
    });
    await page.locator('input[type=file]').setInputFiles({ name: 'leaf.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(jpeg, 'base64') });
    await page.getByRole('button', { name: 'Check this maize photo' }).click();
    await expect(page.getByText('Likely nitrogen deficiency.')).toBeVisible();
  });
});

test.describe('farms', () => {
  test('add a field, switch between fields, delete one', async ({ page }) => {
    const errors = errorsOf(page);
    await mockApi(page);
    await startSample(page);

    const switcher = page.locator('button[aria-haspopup=listbox]');
    await switcher.click();
    await page.getByRole('button', { name: 'Add a field' }).click();
    await expect(page.getByRole('heading', { name: 'Add a field' })).toBeVisible();

    const map = page.locator('.leaflet-container');
    await map.waitFor();
    await map.click({ position: { x: 150, y: 120 } });
    await expect(page.getByText(/Ibadan, Oyo State ·/)).toBeVisible({ timeout: 5000 });

    await page.getByRole('radio', { name: /Cowpea/ }).click();
    await page.locator('input[type=date]').fill('2062-01-01');
    await page.getByPlaceholder('e.g. Back plot by the stream').fill('Cowpea plot');
    await expect(page.getByRole('status').filter({ hasText: 'more than a year away' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Build my plan' })).toBeDisabled();

    const d = new Date(Date.now() + 3600_000 - 40 * 864e5).toISOString().slice(0, 10);
    await page.locator('input[type=date]').fill(d);
    await page.getByRole('button', { name: 'Build my plan' }).click();

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Cowpea, day 40');
    await expect(page.getByRole('heading', { name: /Insecticide spray at flower-bud stage/ })).toBeVisible();

    await switcher.click();
    await page.getByRole('option', { name: /Sample: maize near Ibadan/ }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Maize');

    await switcher.click();
    await page.getByRole('option', { name: /Cowpea plot/ }).click();
    await page.getByRole('button', { name: 'Edit Cowpea plot' }).click();
    page.once('dialog', (dlg) => dlg.accept());
    await page.getByRole('button', { name: 'Delete farm' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Maize');
    await switcher.click();
    await expect(page.getByRole('option')).toHaveCount(1);
    expect(errors).toEqual([]);
  });
});

test.describe('deployment modes', () => {
  test('static hosting with no /api server fetches the public sources directly', async ({ page }) => {
    const raw = rawSources();
    const cors = { 'access-control-allow-origin': '*' };
    await page.route('**/server.arcgisonline.com/**', (r) => r.abort());
    // What Vercel/Netlify return for an unknown path in a single-page app: the HTML page.
    await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>app</title>' }));
    const hits = new Set<string>();
    await page.route('**/api.open-meteo.com/**', (r) => { hits.add('forecast'); r.fulfill({ json: raw.forecast, headers: cors }); });
    await page.route('**/archive-api.open-meteo.com/**', (r) => { hits.add('archive'); r.fulfill({ json: raw.archive, headers: cors }); });
    await page.route('**/rest.isric.org/**', (r) => { hits.add('soil'); r.fulfill({ json: raw.soilgrids, headers: cors }); });

    await startSample(page);
    await expect(page.getByRole('heading', { name: 'Next 8 days' })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect([...hits].sort()).toEqual(['archive', 'forecast', 'soil']);

    await nav(page, 'Ask');
    await expect(page.getByText('The AI advisor needs the Nexus Agri server.')).toBeVisible();
  });
});

test.describe('quality', () => {
  for (const reducedMotion of ['reduce', 'no-preference'] as const) {
    test(`nothing is left invisible (${reducedMotion} motion)`, async ({ browser }) => {
      const ctx = await browser.newContext({ reducedMotion, viewport: { width: 412, height: 915 } });
      const page = await ctx.newPage();
      await mockApi(page);
      await startSample(page);
      for (const tab of ['Plan', 'Weather', 'Field', 'Money', 'Ask']) {
        await nav(page, tab);
        await page.waitForTimeout(reducedMotion === 'reduce' ? 100 : 2200);
        const hidden = await page.evaluate(() =>
          [...document.querySelectorAll('main *')]
            .filter((el) => el.getClientRects().length && parseFloat(getComputedStyle(el).opacity) < 0.05 && !el.closest('[aria-hidden="true"], [inert]') && el.textContent?.trim())
            .map((el) => el.textContent!.trim().slice(0, 40)),
        );
        expect(hidden, `${tab} tab`).toEqual([]);
      }
      await ctx.close();
    });
  }

  test('no sideways scrolling on a 360 px phone', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await mockApi(page);
    await startSample(page);
    for (const tab of ['Plan', 'Weather', 'Field', 'Money', 'Ask']) {
      await nav(page, tab);
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${tab} tab overflows by ${overflow}px`).toBeLessThanOrEqual(0);
    }
    await ctx.close();
  });
});
