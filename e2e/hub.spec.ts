import { expect, test, type Page } from '@playwright/test';
import { mockApi, nav, openRecord, startSample } from './mocks';
import { readFile } from 'node:fs/promises';

const errorsOf = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource/.test(m.text())) errors.push(m.text());
  });
  return errors;
};

/** Lagos date `n` days ago, matching the browser's time zone in these tests. */
const daysAgo = (n: number) => new Date(Date.now() + 3600_000 - n * 864e5).toISOString().slice(0, 10);

test.describe('home', () => {
  test('shows the whole farm: weather, alerts, this week’s work across crops and animals, and a summary', async ({ page }) => {
    const errors = errorsOf(page);
    await mockApi(page);
    await startSample(page, 'Home');

    await expect(page.getByText('Next spray window:')).toBeVisible();
    const attention = page.getByRole('region', { name: 'Needs attention' });
    await expect(attention).toContainText('Not enough Urea in the store');
    const work = page.getByRole('list', { name: "This week's work" });
    await expect(work).toContainText('Worm check and deworming');
    await expect(work).toContainText('Sample goats');
    await expect(work).toContainText('Top-dress with urea');
    await expect(page.getByRole('list', { name: 'Animals' })).toContainText('298 birds');
    await expect(page.getByRole('list', { name: 'Animals' })).toContainText('9 goats');
    await expect(page.getByText('1 running low')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('ticking an animal job records it, and Undo takes it back', async ({ page }) => {
    await mockApi(page);
    await startSample(page, 'Home');
    const work = page.getByRole('list', { name: "This week's work" });
    await work.getByRole('button', { name: 'Mark "Worm check and deworming" as done' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Done today: Worm check and deworming' })).toBeVisible();
    await expect(work).not.toContainText('Worm check and deworming');
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(work).toContainText('Worm check and deworming');
  });

  test('a field on Home opens its plan', async ({ page }) => {
    await mockApi(page);
    await startSample(page, 'Home');
    await page.getByRole('list', { name: 'Fields' }).getByRole('button', { name: /Sample: maize near Ibadan/ }).click();
    await expect(page.getByRole('heading', { name: "This week's plan" })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Plan' })).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('animals', () => {
  test('a new broiler flock gets its vaccines by age; doses, losses and feed are tracked', async ({ page }) => {
    const errors = errorsOf(page);
    await mockApi(page);
    await startSample(page, 'Home');
    await nav(page, 'Animals');
    await page.getByRole('button', { name: 'Add animals' }).first().click();

    const form = page.getByRole('form', { name: 'Add animals' });
    await form.getByRole('radio', { name: 'Broilers' }).click();
    await form.getByLabel('Number of birds').fill('100');
    await form.getByLabel('Name').fill('Pen B broilers');
    await form.locator('input[type=date]').fill(daysAgo(10));
    await form.getByLabel('Cost in naira').fill('85000');
    await form.getByRole('button', { name: 'Add birds' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Pen B broilers' })).toBeVisible();
    await expect(page.getByText('100 birds, 10 days old')).toBeVisible();
    const schedule = page.getByRole('region', { name: 'Health schedule' });
    const lasota = schedule.getByRole('listitem').filter({ hasText: 'Newcastle (La Sota) in drinking water' });
    await expect(lasota).toContainText('Due now');

    await lasota.getByRole('button', { name: 'Mark "Newcastle (La Sota) in drinking water" as done' }).click();
    const doneForm = page.getByRole('form', { name: 'Done: Newcastle (La Sota) in drinking water' });
    await doneForm.getByPlaceholder('Name on the pack').fill('La Sota (NVRI)');
    await doneForm.getByRole('button', { name: 'Save' }).click();
    await expect(lasota).toContainText(/Done \d+ \w+/);

    // Losses: can't lose more birds than there are; the count follows.
    await page.getByRole('button', { name: 'Losses', exact: true }).click();
    const loss = page.getByRole('form', { name: 'Record died' });
    await loss.getByLabel('How many birds').fill('120');
    await loss.getByRole('button', { name: 'Save' }).click();
    await expect(loss.getByRole('alert')).toContainText('only 100 birds');
    await loss.getByLabel('How many birds').fill('5');
    await loss.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('95 birds, 10 days old')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Record' })).toContainText('5 birds died: Sickness');

    // Feed for the week from the bird count and age.
    await expect(page.getByRole('region', { name: 'Feed and care' })).toContainText('Broiler starter');
    await expect(page.getByRole('region', { name: 'Money' })).toContainText('₦85k');

    // A 5% loss in a week is an urgent alert.
    await nav(page, 'Alerts');
    await expect(page.getByRole('region', { name: 'Act now' })).toContainText('5 birds died this week');
    expect(errors).toEqual([]);
  });

  test('egg records give the laying rate, and refuse more eggs than hens', async ({ page }) => {
    await mockApi(page);
    await startSample(page, 'Home');
    await page.getByRole('list', { name: 'Animals' }).getByRole('button', { name: /Sample layers/ }).click();
    await expect(page.getByRole('region', { name: 'Eggs' })).toContainText('Laying this week');
    await expect(page.getByRole('region', { name: 'Eggs' })).toContainText('88%');

    await page.getByRole('button', { name: 'Eggs collected', exact: true }).click();
    const form = page.getByRole('form', { name: 'Record eggs' });
    await form.getByLabel('Eggs collected').fill('400');
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form.getByRole('alert')).toContainText('more eggs than hens (298)');
  });

  test('a treatment with an egg withdrawal period shows on Health until it ends', async ({ page }) => {
    await mockApi(page);
    await startSample(page, 'Home');
    await page.getByRole('list', { name: 'Animals' }).getByRole('button', { name: /Sample layers/ }).click();
    await page.getByRole('button', { name: 'Treatment', exact: true }).click();
    const form = page.getByRole('form', { name: 'Record health' });
    await form.getByPlaceholder('Name on the pack').fill('Amprolium');
    await form.getByLabel('Egg withdrawal days').fill('5');
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Amprolium' })).toContainText('Do not sell or eat eggs before');

    await nav(page, 'Health');
    await expect(page.getByRole('region', { name: 'Do not sell or eat yet' })).toContainText('Sample layers: Amprolium');
  });

  test('a farmer with only animals can use the app without a field', async ({ page }) => {
    const errors = errorsOf(page);
    await mockApi(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Add animals' }).click();
    // Straight into the form: no empty list to tap through first.
    const form = page.getByRole('form', { name: 'Add animals' });
    await form.getByRole('radio', { name: 'Goats' }).click();
    await form.getByLabel('Number of goats').fill('6');
    await form.getByRole('button', { name: 'Add goats' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Goats 1' })).toBeVisible();
    // Unknown vaccination history on arrival: PPR is due now.
    await expect(page.getByRole('region', { name: 'Health schedule' }).getByRole('listitem').filter({ hasText: 'PPR vaccine' })).toContainText('Due now');

    await nav(page, 'Home');
    await expect(page.getByRole('list', { name: "This week's work" })).toContainText('PPR vaccine');
    await nav(page, 'Crops');
    await expect(page.getByRole('heading', { name: 'No fields yet' })).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe('store', () => {
  test('buying fertilizer updates the store, clears the shortfall alert and goes in the record book', async ({ page }) => {
    await mockApi(page);
    await startSample(page, 'Home');
    await nav(page, 'Alerts');
    await expect(page.getByText('Not enough Urea in the store')).toBeVisible();

    await nav(page, 'Store');
    const urea = page.locator('#item-sample-urea');
    await urea.getByRole('button', { name: /Urea/ }).click();
    await urea.getByRole('button', { name: 'Bought' }).click();
    const bought = urea.getByRole('form', { name: 'Bought' });
    await bought.getByLabel('Quantity').fill('2');
    await bought.getByLabel('Paid').fill('84000');
    await bought.getByLabel('Count the cost under').selectOption({ label: 'Sample: maize near Ibadan record book' });
    await bought.getByRole('button', { name: 'Save' }).click();
    await expect(urea.locator('.num').first()).toHaveText('6');
    await expect(urea.getByRole('list', { name: 'Urea history' })).toContainText('+2 in, ₦84,000');

    // Using more than the store holds is refused.
    await urea.getByRole('button', { name: 'Used' }).click();
    const used = urea.getByRole('form', { name: 'Used' });
    await used.getByLabel('Quantity').fill('10');
    await used.getByRole('button', { name: 'Save' }).click();
    await expect(used.getByRole('alert')).toContainText('only has 6');

    await nav(page, 'Alerts');
    await expect(page.getByText('Not enough Urea in the store')).toHaveCount(0);

    await nav(page, 'Money');
    await page.getByRole('radio', { name: 'Records' }).click();
    await expect(page.locator('#entries li').filter({ hasText: 'Urea: 2 bags (50 kg)' })).toContainText('₦84,000');
  });

  test('a new item with a warning level raises a low-stock alert', async ({ page }) => {
    await mockApi(page);
    await startSample(page, 'Home');
    await nav(page, 'Store');
    await page.getByRole('button', { name: 'Add an item' }).click();
    const form = page.getByRole('form', { name: 'New store item' });
    await form.getByPlaceholder('e.g. Urea, Layer mash').fill('Glyphosate');
    await form.getByLabel('Kind').selectOption('chemical');
    await form.getByLabel('How many now').fill('2');
    await form.getByLabel('Warn me at').fill('2');
    await form.getByRole('button', { name: 'Add to the store' }).click();
    await expect(page.getByRole('region', { name: 'Chemicals' })).toContainText('Glyphosate');
    await expect(page.getByRole('region', { name: 'Chemicals' })).toContainText('Running low');
    await nav(page, 'Alerts');
    await expect(page.getByText('Running low: Glyphosate')).toBeVisible();
  });
});

test.describe('tasks and alerts', () => {
  test('own tasks repeat, and finished ones can be undone', async ({ page }) => {
    await mockApi(page);
    await startSample(page, 'Home');
    await page.getByRole('button', { name: 'Add a task' }).click();
    const form = page.getByRole('form', { name: 'New task' });
    await form.getByPlaceholder(/Fix the pen door/).fill('Pay the labourers');
    await form.getByLabel('Repeat').selectOption('weekly');
    await form.getByRole('button', { name: 'Save task' }).click();

    const today = page.getByRole('list', { name: 'Today' });
    await expect(today).toContainText('Pay the labourers');
    await expect(today).toContainText('every week');
    await today.getByRole('button', { name: 'Mark "Pay the labourers" as done' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Next one is set' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'This week' })).toContainText('Pay the labourers');

    await page.getByRole('radio', { name: 'Mine' }).click();
    await expect(page.getByRole('list', { name: 'This week' })).toContainText('Pay the labourers');
    await expect(page.getByText('Top-dress with urea')).toHaveCount(0);
  });

  test('dismissed alerts drop out of the bell count and can be shown again', async ({ page }) => {
    await mockApi(page);
    await startSample(page, 'Home');
    await nav(page, 'Alerts');
    const bellCount = async () => Number((await page.getByRole('button', { name: /^Alerts/ }).filter({ visible: true }).first().getAttribute('aria-label'))?.match(/(\d+) need/)?.[1] ?? 0);
    const before = await bellCount();
    await page.getByRole('button', { name: 'Dismiss "Not enough Urea in the store"' }).click();
    await expect(page.getByText('Not enough Urea in the store')).toHaveCount(0);
    await expect.poll(bellCount).toBe(before - 1);
    await page.getByRole('button', { name: 'Show 1 hidden alert again' }).click();
    await expect(page.getByText('Not enough Urea in the store')).toBeVisible();
  });

  test('removing the sample leaves a clean phone', async ({ page }) => {
    await mockApi(page);
    await startSample(page, 'Home');
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Remove sample data' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('What your farm');
    const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => /sample/.test(k) || (k.startsWith('na:') && /sample/.test(localStorage.getItem(k) ?? ''))));
    expect(keys).toEqual([]);
  });
});

test.describe('menu and farm details', () => {
  test('the farm card names the farm and greets the farmer', async ({ page }) => {
    await mockApi(page);
    await startSample(page, 'Home');
    const isPhone = (page.viewportSize()?.width ?? 1280) < 1024;
    if (isPhone) await page.getByRole('button', { name: 'Open menu' }).click();
    const scope = isPhone ? page.getByRole('dialog', { name: 'Menu' }) : page.locator('aside');
    await scope.getByRole('button', { name: 'Add farm details' }).click();
    const form = scope.getByRole('form', { name: 'Farm details' });
    await form.getByLabel('Farm name').fill('Adebayo Farms');
    await form.getByLabel('Your name').fill('Bola Adebayo');
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(scope.getByText('Adebayo Farms')).toBeVisible();
    if (isPhone) {
      // While the menu is open the page behind it is out of reach.
      await expect(page.locator('nav[aria-label=Main][inert]')).toHaveCount(1);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog', { name: 'Menu' })).toHaveCount(0);
      await expect(page.locator('[inert]')).toHaveCount(0);
    }
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/, Bola$/);
  });
});

test.describe('buy list and store', () => {
  test('the buy list shows what the store already has, and a purchase there fills the store and the record book', async ({ page }) => {
    await mockApi(page);
    await startSample(page);
    await nav(page, 'Money');
    await page.getByRole('radio', { name: 'Buy list' }).click();
    const urea = page.locator('li').filter({ hasText: 'Urea' }).filter({ hasText: 'Needed' });
    await expect(urea).toContainText('In your store: 4 bags (50 kg)');

    await urea.getByRole('button', { name: 'Bought some? Add it to the store' }).click();
    const form = urea.getByRole('form', { name: 'Bought Urea' });
    await form.getByLabel('How many bags (50 kg)').fill('2');
    await form.getByLabel('Paid in total').fill('84000');
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(urea).toContainText('In your store: 6 bags (50 kg)');

    await page.getByRole('radio', { name: 'Records' }).click();
    await expect(page.locator('#entries li').filter({ hasText: 'Urea: 2 bags (50 kg)' })).toContainText('₦84,000');
    await nav(page, 'Store');
    await expect(page.locator('#item-sample-urea .num').first()).toHaveText('6');
  });
});

test.describe('record sheet', () => {
  test('eggs recorded from the Record button land in the flock, adding to today, with undo', async ({ page }) => {
    const errors = errorsOf(page);
    await mockApi(page);
    await startSample(page, 'Home');
    await openRecord(page);
    const sheet = page.getByRole('dialog', { name: 'Record' });
    await sheet.getByRole('button', { name: /^Eggs collected/ }).click();
    const form = sheet.getByRole('form', { name: 'Eggs collected' });
    await expect(form).toContainText('Already 264 recorded for this day');
    await form.getByLabel('How many eggs').fill('20');
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved 20 eggs for Sample layers' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Animals' })).toContainText('284 eggs today');
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByRole('list', { name: 'Animals' })).toContainText('264 eggs today');
    expect(errors).toEqual([]);
  });

  test('money is filed where it belongs and adds up in the whole-farm money view', async ({ page }) => {
    await mockApi(page);
    await startSample(page, 'Home');

    // Transport belongs to no one field or flock: the whole farm.
    await openRecord(page);
    await page.getByRole('dialog', { name: 'Record' }).getByRole('button', { name: /^Money spent/ }).click();
    let form = page.getByRole('form', { name: 'Money spent' });
    await form.getByLabel('Amount in naira').fill('15000');
    await form.getByRole('radio', { name: 'Transport' }).click();
    await expect(form.getByLabel('Which part of the farm')).toHaveValue('farm');
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Spent ₦15,000: Transport, the whole farm' })).toBeVisible();

    // Feed goes to the flock by default.
    await openRecord(page);
    await page.getByRole('dialog', { name: 'Record' }).getByRole('button', { name: /^Money spent/ }).click();
    form = page.getByRole('form', { name: 'Money spent' });
    await form.getByLabel('Amount in naira').fill('39000');
    await form.getByRole('radio', { name: 'Feed' }).click();
    await expect(form.getByLabel('Which part of the farm')).toHaveValue('g:sample-layers');
    await form.getByRole('button', { name: 'Save' }).click();

    // A crop sale goes in the field's record book.
    await openRecord(page);
    await page.getByRole('dialog', { name: 'Record' }).getByRole('button', { name: /^Money received/ }).click();
    form = page.getByRole('form', { name: 'Money received' });
    await form.getByLabel('Amount in naira').fill('60000');
    await form.getByRole('radio', { name: 'Crops' }).click();
    await form.getByLabel('Kilograms sold').fill('200');
    await form.getByRole('button', { name: 'Save' }).click();

    await nav(page, 'Money');
    await page.getByRole('radio', { name: 'This month' }).click();
    const parts = page.getByRole('list', { name: 'Money by part of the farm' });
    // The whole-farm line also holds the sample's store purchases, so check it is there rather than its total.
    await expect(parts.getByRole('listitem').filter({ hasText: 'Whole farm' })).toBeVisible();
    await expect(parts.getByRole('listitem').filter({ hasText: 'Sample: maize near Ibadan' })).toContainText('In ₦60k');
    await expect(page.getByRole('list', { name: 'Spending by kind' })).toContainText('Transport');
    const latest = page.getByRole('list', { name: 'Latest money entries' });
    await expect(latest).toContainText('Transport');
    await expect(latest).toContainText('−₦15,000');
    await expect(latest).toContainText('+₦60,000');

    await page.getByRole('radio', { name: 'Records' }).click();
    await expect(page.locator('#entries li').filter({ hasText: 'Crop sale' })).toContainText('₦60,000');
    await nav(page, 'Animals');
    await page.getByRole('button', { name: /Sample layers/ }).click();
    await expect(page.getByRole('list', { name: 'Record' })).toContainText('Feed for ₦39,000');
  });

  test('rain from the Record sheet goes into the field’s water balance', async ({ page }) => {
    await mockApi(page);
    await startSample(page, 'Home');
    await openRecord(page);
    await page.getByRole('dialog', { name: 'Record' }).getByRole('button', { name: /^Rain at a field/ }).click();
    const form = page.getByRole('form', { name: 'Rain at a field' });
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form.getByRole('alert')).toContainText('Enter the gauge reading');
    await form.getByRole('button', { name: 'Heavy storm ≈ 30 mm' }).click();
    await form.getByRole('button', { name: 'Yesterday' }).click();
    await form.getByRole('button', { name: 'Save' }).click();
    await nav(page, 'Field');
    await expect(page.getByRole('list', { name: 'Your water log' })).toContainText('30 mm');
  });

  test('store purchases from the sheet count once in the money', async ({ page }) => {
    await mockApi(page);
    await startSample(page, 'Home');
    await openRecord(page);
    await page.getByRole('dialog', { name: 'Record' }).getByRole('button', { name: /^Store in or out/ }).click();
    const form = page.getByRole('form', { name: 'Store in or out' });
    await form.getByLabel('Item').selectOption({ label: 'Layer mash' });
    await form.getByRole('radio', { name: 'Bought or harvested' }).click();
    await form.getByLabel('Quantity').fill('3');
    await form.getByLabel('Paid').fill('39000');
    await form.getByLabel('Count the cost under').selectOption({ label: 'Sample layers' });
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Added 3 bags (25 kg) of Layer mash' })).toBeVisible();

    await nav(page, 'Money');
    await page.getByRole('radio', { name: 'This month' }).click();
    const latest = page.getByRole('list', { name: 'Latest money entries' });
    // Filed with the flock, so it appears once: as the flock's cost, not again as a store purchase.
    await expect(latest.getByRole('listitem').filter({ hasText: '−₦39,000' })).toHaveCount(1);
    await expect(latest.getByRole('listitem').filter({ hasText: '−₦39,000' })).toContainText('Sample layers');
  });
});

test.describe('weekly report', () => {
  test('the last 7 days can be sent as a picture or as text', async ({ page }) => {
    await mockApi(page);
    await startSample(page, 'Home');
    const week = page.getByRole('region', { name: 'The last 7 days' });
    await expect(week).toContainText('Eggs');
    await expect(week).toContainText('Animals lost');
    const download = page.waitForEvent('download');
    await week.getByRole('button', { name: 'Send the week as a picture' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^nexus-agri-week-\d{4}-\d{2}-\d{2}\.png$/);
    const bytes = await readFile((await file.path())!);
    expect(bytes.subarray(1, 4).toString()).toBe('PNG');
    expect(bytes.length).toBeGreaterThan(20_000);
    await expect(page.getByRole('status').filter({ hasText: /Saved nexus-agri-week/ })).toBeVisible();
  });
});
