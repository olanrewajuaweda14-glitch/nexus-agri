import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { mockApi, nav, startSample } from './mocks';

const errorsOf = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource/.test(m.text())) errors.push(m.text());
  });
  return errors;
};

/** Farm-local (Lagos) date `n` days ago. */
const daysAgo = (n: number) => new Date(Date.now() + 3600_000 - n * 864e5).toISOString().slice(0, 10);

async function logCost(page: Page, job: string, amount: string) {
  await page.getByRole('button', { name: `Mark "${job}" as done` }).click();
  const prompt = page.getByRole('form', { name: `Record ${job}` });
  await prompt.getByLabel('Amount spent').fill(amount);
  await prompt.getByRole('button', { name: 'Save to records' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved to your record book' })).toBeVisible();
}

/** A Stat's final value (the screen-reader copy, not the counting animation). */
const statValue = (page: Page, label: string) => page.locator('.eyebrow', { hasText: new RegExp(`^${label}$`) }).locator('xpath=..').locator('.num .sr-only');

test.describe('seasons', () => {
  test('fixing the planting date keeps the records; the next season files them as a past season', async ({ page }) => {
    const errors = errorsOf(page);
    await mockApi(page);
    await startSample(page);
    await logCost(page, 'Top-dress with urea', '252000');

    // Correct the planting date: the maize is now past maturity.
    await page.getByRole('button', { name: 'Edit Sample: maize near Ibadan' }).filter({ visible: true }).click();
    await page.locator('input[type=date]').fill(daysAgo(130));
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Maize is mature');

    // Same season, same records.
    const wrap = page.getByRole('region', { name: 'Maize season: wrapping up' });
    await expect(wrap).toContainText('₦252k');

    await wrap.getByRole('button', { name: 'Start next season' }).click();
    await expect(page.getByRole('heading', { name: 'Next season on Sample: maize near Ibadan' })).toBeInViewport();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    const deviceToday = await page.evaluate(() => {
      const n = new Date();
      return new Date(n.getTime() - n.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    });
    await expect(page.locator('input[type=date]')).toHaveValue(deviceToday);
    await page.getByRole('radio', { name: /Cowpea/ }).click();
    await page.getByRole('button', { name: 'Start the new season' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Cowpea');

    // A clean record book for the new season, and the maize season kept as history.
    await nav(page, 'Money');
    await page.getByRole('radio', { name: 'Records' }).click();
    await expect(page.locator('#entries li')).toHaveCount(0);
    const past = page.getByRole('region', { name: 'Past seasons' });
    await expect(past).toContainText('Maize');
    await expect(past).toContainText('₦252k');

    const download = page.waitForEvent('download');
    await past.getByRole('button', { name: 'Spreadsheet' }).click();
    const csv = await readFile((await (await download).path())!, 'utf8');
    expect(csv).toContain('252000');

    // Survives a reload.
    await page.reload();
    await nav(page, 'Money');
    await page.getByRole('radio', { name: 'Records' }).click();
    await expect(page.getByRole('region', { name: 'Past seasons' })).toContainText('Maize');
    expect(errors).toEqual([]);
  });
});

test.describe('water log', () => {
  test('logging a full irrigation refills the root zone; deleting it undoes that', async ({ page }) => {
    await mockApi(page);
    await startSample(page);
    await nav(page, 'Field');

    const short = statValue(page, 'Short of full');
    await expect(short).not.toHaveText('0');
    const before = await short.textContent();

    const form = page.getByRole('form', { name: 'Log rain or irrigation' });
    await form.getByRole('button', { name: 'Add to the water balance' }).click();
    // An empty box is not "0 mm": it must not wipe out the model's rain for the day.
    await expect(form.getByRole('alert')).toContainText('Enter the gauge reading');
    await expect(page.getByRole('list', { name: 'Your water log' })).toHaveCount(0);

    await form.getByRole('radio', { name: 'Irrigation' }).click();
    await form.getByRole('radio', { name: 'Watered fully' }).click();
    await form.getByRole('button', { name: 'Add to the water balance' }).click();
    await expect(short).toHaveText('0');
    await expect(statValue(page, 'Available water')).toHaveText('100');
    await expect(page.getByText('Irrigation (your log)')).toBeVisible();

    await page.reload();
    await nav(page, 'Field');
    await expect(statValue(page, 'Short of full')).toHaveText('0');

    await page.getByRole('list', { name: 'Your water log' }).getByRole('button', { name: 'Delete this entry' }).click();
    await expect(statValue(page, 'Short of full')).toHaveText(before!);
  });

  test('a rain-gauge reading replaces the model’s rain for that day', async ({ page }) => {
    await mockApi(page);
    await startSample(page);
    await nav(page, 'Field');
    const short = statValue(page, 'Short of full');
    await expect(short).not.toHaveText('0');
    const before = Number(await short.textContent());

    const form = page.getByRole('form', { name: 'Log rain or irrigation' });
    await form.locator('input[type=date]').fill(daysAgo(1));
    await form.getByRole('button', { name: 'Heavy storm ≈ 30 mm' }).click();
    await form.getByRole('button', { name: 'Add to the water balance' }).click();
    await expect(page.getByRole('list', { name: 'Your water log' })).toContainText('30 mm');
    await expect.poll(async () => Number(await short.textContent())).toBeLessThan(before);
  });
});

test.describe('reminders', () => {
  test('the season goes into the phone calendar, and one job can be added to Google Calendar', async ({ page }) => {
    await mockApi(page);
    await startSample(page);

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Put the season in my calendar' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('nexus-agri-sample-maize-near-ibadan-season.ics');
    const ics = await readFile((await file.path())!, 'utf8');
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('SUMMARY:Top-dress with urea — Sample: maize near Ibadan');
    expect(ics).toContain('TRIGGER:PT0M');
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    await expect(page.getByRole('status').filter({ hasText: /Saved \d+ reminders/ })).toBeVisible();

    const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Top-dress with urea' }) });
    if (!(await card.getByRole('link', { name: /Remind me/ }).isVisible())) await page.getByRole('button', { name: /^Top-dress with urea/ }).click();
    const link = card.getByRole('link', { name: /Remind me/ });
    await expect(link).toBeVisible();
    const href = new URL((await link.getAttribute('href'))!);
    expect(href.origin + href.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(href.searchParams.get('action')).toBe('TEMPLATE');
    expect(href.searchParams.get('text')).toBe('Top-dress with urea — Sample: maize near Ibadan');
    expect(href.searchParams.get('dates')).toMatch(/^\d{8}T060000Z\/\d{8}T063000Z$/); // 7:00–7:30 in Lagos
    expect(await link.getAttribute('target')).toBe('_blank');
  });
});

test.describe('backup', () => {
  test('a backup file moves fields and records to a new phone; a wrong file changes nothing', async ({ page, browser }) => {
    const errors = errorsOf(page);
    await mockApi(page);
    await startSample(page);
    await logCost(page, 'Top-dress with urea', '252000');

    await page.locator('button[aria-haspopup=listbox]').click();
    await page.getByRole('button', { name: 'Back up or move phones' }).click();
    await expect(page.getByRole('heading', { name: 'Back up or move to a new phone' })).toBeVisible();
    await expect(page.getByText('Last backup: never')).toBeVisible();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download backup file' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^nexus-agri-backup-\d{4}-\d{2}-\d{2}\.json$/);
    const path = (await file.path())!;
    const json = JSON.parse(await readFile(path, 'utf8'));
    expect(json).toMatchObject({ app: 'nexus-agri', version: 1 });
    expect(Object.keys(json.data).some((k) => k.startsWith('na:cache:'))).toBe(false);
    await expect(page.getByText('Last backup: today')).toBeVisible();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.getByRole('heading', { name: "This week's plan" })).toBeVisible();

    // A new phone: nothing saved yet.
    const ctx = await browser.newContext();
    const phone = await ctx.newPage();
    const phoneErrors = errorsOf(phone);
    await mockApi(phone);
    await phone.goto('/');
    await phone.getByRole('button', { name: 'New phone? Restore from a backup' }).click();

    await phone.getByLabel('Backup file', { exact: true }).setInputFiles({ name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') });
    await expect(phone.getByRole('alert')).toHaveText("This file isn't a Nexus Agri backup.");

    await phone.getByLabel('Backup file', { exact: true }).setInputFiles(path);
    await expect(phone.getByText(/1 field \(Sample: maize near Ibadan\), 2 animal groups \(Sample layers, Sample goats\), 4 store items, 1 record-book entry/)).toBeVisible();
    phone.once('dialog', (d) => d.accept());
    await phone.getByRole('button', { name: "Replace this phone's data with this backup" }).click();

    // A restore lands on Home, with the fields and animals from the backup.
    await expect(phone.getByRole('list', { name: 'Fields' })).toContainText('Sample: maize near Ibadan');
    await nav(phone, 'Plan');
    await expect(phone.getByRole('heading', { level: 1 })).toContainText('Maize, day');
    await expect(phone.getByRole('button', { name: 'Mark "Top-dress with urea" as not done' })).toBeVisible();
    await nav(phone, 'Money');
    await phone.getByRole('radio', { name: 'Records' }).click();
    await expect(phone.locator('#entries li').filter({ hasText: 'Top-dress with urea' })).toContainText('₦252,000');
    expect(phoneErrors).toEqual([]);
    await ctx.close();
    expect(errors).toEqual([]);
  });
});

test.describe('plan in your language', () => {
  test('stays hidden when the advisor is off', async ({ page }) => {
    await mockApi(page);
    await startSample(page);
    await expect(page.getByRole('heading', { name: 'First weeding' })).toBeVisible();
    await expect(page.getByRole('region', { name: "This week's plan in your language" })).toHaveCount(0);
  });

  test('translates the open jobs, keeps a job in English if a figure changed, and works again offline', async ({ page }) => {
    const errors = errorsOf(page);
    await mockApi(page, { ai: true });
    const requests: any[] = [];
    await page.route('**/api/translate', async (r) => {
      const body = r.request().postDataJSON();
      requests.push(body);
      const ha = (s: string) => (s ? `HA ${s}` : '');
      await r.fulfill({
        json: {
          heading: ha(body.heading),
          labels: { now: 'Yi yanzu', week: 'Wannan makon', watch: 'Ku lura da' },
          // One job comes back with a wrong dose: 260 kg → 26 kg.
          items: body.items.map((i: any) => ({ id: i.id, title: ha(i.title), when: ha(i.when), how: ha(i.how).replace('260 kg', '26 kg') })),
        },
      });
    });
    await startSample(page);

    const box = page.getByRole('region', { name: "This week's plan in your language" });
    await box.getByRole('combobox').selectOption('ha');
    await box.getByRole('button', { name: 'Translate' }).click();
    await expect(box.getByRole('heading', { name: 'Yi yanzu' })).toBeVisible();
    await expect(box.getByText('HA First weeding', { exact: true })).toBeVisible();
    expect(requests[0].language).toBe('ha');
    expect(requests[0].items.map((i: any) => i.id)).toContain('topdress');

    // The wrong dose never reaches the farmer.
    const topdress = box.getByRole('listitem').filter({ hasText: 'Top-dress with urea' });
    await expect(topdress).toContainText('Kept in English');
    await expect(topdress).toContainText('260 kg');
    await expect(box).not.toContainText('26 kg');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

    // Ticked jobs drop out without another translation.
    await page.getByRole('button', { name: 'Mark "First weeding" as done' }).click();
    await expect(box.getByText('HA First weeding', { exact: true })).toHaveCount(0);

    // Saved on the phone: shows again after a reload with no network call, even offline.
    await page.route('**/api/health', (r) => r.abort());
    await page.reload();
    // "Do now" held only the ticked job, so only the "this week" group is left.
    await expect(page.getByRole('region', { name: "This week's plan in your language" }).getByRole('heading', { name: 'Wannan makon' })).toBeVisible();
    await expect(page.getByRole('region', { name: "This week's plan in your language" }).getByRole('heading', { name: 'Yi yanzu' })).toHaveCount(0);
    expect(requests).toHaveLength(1);

    const again = page.getByRole('region', { name: "This week's plan in your language" });
    await again.getByRole('button', { name: 'Hide' }).click();
    await expect(again.getByRole('button', { name: 'Show' })).toHaveAttribute('aria-expanded', 'false');
    await expect(again.locator('[inert]')).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test('says clearly when the translation fails', async ({ page }) => {
    await mockApi(page, { ai: true });
    await page.route('**/api/translate', (r) => r.fulfill({ status: 502, json: { error: 'ai_failed', message: 'The advisor is busy — try again in a minute.' } }));
    await startSample(page);
    const box = page.getByRole('region', { name: "This week's plan in your language" });
    await box.getByRole('button', { name: 'Translate' }).click();
    await expect(box.getByRole('alert')).toHaveText('The advisor is busy — try again in a minute.');
    await expect(box.getByRole('button', { name: 'Translate' })).toBeEnabled();
  });
});
