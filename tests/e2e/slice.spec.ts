import { expect, test, type Page } from '@playwright/test';

const dock = (page: Page) => page.locator('#dock');

/** The experiment must fit the classroom board without scrolling the lesson panel. */
async function expectNoDockScroll(page: Page) {
  const overflow = await page.locator('.dock-body').evaluate((el) => el.scrollHeight - el.clientHeight);
  expect(overflow).toBeLessThanOrEqual(1);
}

/** The experiment opens by explaining PU and EU before any number appears. */
async function passUnitsIntro(page: Page) {
  const d = dock(page);
  await expect(d.getByRole('heading', { name: 'Two kinds of numbers' })).toBeVisible();
  await expect(d).toContainText('PU = power units');
  await expect(d).toContainText('EU = energy units');
  await expect(d.locator('.readout')).toHaveCount(0); // controls wait until the units are introduced
  await expectNoDockScroll(page);
  await d.getByRole('button', { name: 'Got it — start the experiment' }).click();
}

async function inspectAllStages(page: Page) {
  for (const name of ['Generation', 'Transmission', 'Substation', 'Distribution', 'Buildings']) {
    await dock(page).getByRole('button', { name: new RegExp(`^${name}`) }).click();
    await expect(page.locator('#card-title')).toHaveText(name);
    await page.keyboard.press('Escape');
  }
  await expect(dock(page).getByRole('status')).toContainText('5 of 5 stages inspected');
}

async function place(page: Page, card: string, step: number) {
  await dock(page).getByRole('group', { name: 'Stage cards' }).getByRole('button', { name: card, exact: true }).click();
  await dock(page).getByRole('button', { name: new RegExp(`^Step ${step}:`) }).click();
}

async function connectRoute(page: Page) {
  // First a wrong order, which must explain the mismatch and allow retry.
  const wrong = ['Generation', 'Substation', 'Transmission', 'Distribution', 'Buildings'];
  for (const [i, c] of wrong.entries()) await place(page, c, i + 1);
  await dock(page).getByRole('button', { name: 'Check route' }).click();
  await expect(dock(page).locator('.feedback.retry')).toContainText('Substation is not in step 2');
  await expect(dock(page).getByRole('button', { name: 'Next →' })).toBeDisabled();

  await dock(page).getByRole('button', { name: 'Clear' }).click();
  const right = ['Generation', 'Transmission', 'Substation', 'Distribution', 'Buildings'];
  for (const [i, c] of right.entries()) await place(page, c, i + 1);
  await dock(page).getByRole('button', { name: 'Check route' }).click();
  await expect(dock(page).locator('.feedback.good')).toContainText('Connected!');
}

async function runChallenge(page: Page) {
  const d = dock(page);
  await expect(d.locator('.readout')).toBeVisible();
  // Daytime: G=4, charge.
  await d.getByRole('button', { name: 'Charge', exact: true }).click();
  await expect(d.locator('.preview')).toContainText('battery +2 → 2 EU');
  await expect(d.locator('.coach')).toContainText('Press Run one interval');
  await expect(d.locator('.stat-value').nth(2)).toHaveText('0 / 6 EU'); // preview changes nothing
  await d.getByRole('button', { name: 'Run one interval' }).click();
  await expect(d.locator('[data-key="run-result"]')).toContainText('Demand met');
  await expect(d.locator('.stat-value').nth(2)).toHaveText('2 / 6 EU');

  // Evening: G=8, discharge.
  await d.getByRole('button', { name: '☾ Evening' }).click();
  for (let i = 0; i < 4; i++) await d.getByRole('button', { name: 'Increase generator output' }).click();
  await d.getByRole('button', { name: 'Discharge', exact: true }).click();
  await d.getByRole('button', { name: 'Run one interval' }).click();
  await expect(d.locator('[data-key="run-result"]')).toContainText('Demand met');
  await expect(d.locator('.stat-value').nth(2)).toHaveText('0 / 6 EU');

  await expectNoDockScroll(page); // the tallest moment: explanation box open
  await d.getByLabel('Your explanation').fill('I charged the battery in daytime and it added 2 PU in the evening.');
  await d.getByRole('button', { name: 'Submit explanation' }).click();
  await expect(d).toContainText('One evening interval completed.');

  // Extension: another evening without recharging shows the 2-PU shortfall.
  await d.getByRole('button', { name: 'Run one interval' }).click();
  await expect(d.locator('[data-key="run-result"]')).toContainText('Demand not fully met: 2 PU short');
  await expect(d.locator('[data-key="run-result"]')).toContainText('battery was empty');
}

test('guided slice: inspect, connect, experiment (3D)', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#entry-title')).toHaveText('Power a City');
  await page.getByRole('button', { name: 'Start lesson' }).click();
  await expect(page.locator('#stage')).toHaveAttribute('data-presentation', '3d');
  await inspectAllStages(page);
  await dock(page).getByRole('button', { name: 'Next →' }).click();
  await connectRoute(page);
  await dock(page).getByRole('button', { name: 'Next →' }).click();
  await expectNoDockScroll(page);
  await passUnitsIntro(page);
  await runChallenge(page);
  await expectNoDockScroll(page);

  // Reset restores the initial state and clears attempts.
  await dock(page).getByRole('button', { name: 'Reset experiment' }).click();
  await expect(dock(page).locator('.stat-value').nth(2)).toHaveText('0 / 6 EU');
  await expect(dock(page).locator('[data-key="run-result"]')).toHaveCount(0);
});

test('the same lesson works in the 2D presentation with keyboard only', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Accessibility settings' }).click();
  await page.getByRole('button', { name: '2D map' }).click();
  await page.getByRole('button', { name: 'Close settings' }).click();
  await expect(page.locator('#stage')).toHaveAttribute('data-presentation', '2d');

  await page.getByRole('button', { name: 'Start lesson' }).focus();
  await page.keyboard.press('Enter');
  // Hotspot buttons in the map open the same cards.
  await page.locator('.hotspots').getByRole('button', { name: 'Substation' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#card-title')).toHaveText('Substation');
  await expect(page.locator('#card')).toContainText('step-down');
  await page.keyboard.press('Escape');
  await expect(page.locator('#card')).toBeHidden();
  await dock(page).getByRole('button', { name: 'Next →' }).press('Enter');

  // Keyboard-only placement: Enter on a card, then Enter on a step.
  for (const [i, c] of ['Generation', 'Transmission', 'Substation', 'Distribution', 'Buildings'].entries()) {
    await dock(page).getByRole('group', { name: 'Stage cards' }).getByRole('button', { name: c, exact: true }).press('Enter');
    await dock(page).getByRole('button', { name: new RegExp(`^Step ${i + 1}:`) }).press('Enter');
  }
  await dock(page).getByRole('button', { name: 'Check route' }).press('Enter');
  await expect(dock(page).locator('.feedback.good')).toBeVisible();
  await dock(page).getByRole('button', { name: 'Next →' }).press('Enter');
  await passUnitsIntro(page);
  await runChallenge(page);
  await expect(page.locator('.flat-frame svg')).toHaveAttribute('data-supply', 'short');
});

test('the experiment is blocked until the route is connected', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start lesson' }).click();
  await dock(page).getByRole('button', { name: 'Next →' }).click();
  await expect(dock(page).getByRole('button', { name: 'Next →' })).toBeDisabled();
  await expect(dock(page)).toContainText('Connect the route to continue.');
});

test('Explore starts connected with a clean scenario and no score', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore' }).click();
  await expect(dock(page)).toContainText('Explore · no score');
  await expect(dock(page).locator('.mission')).toHaveCount(0);
  await dock(page).getByRole('button', { name: 'Run one interval' }).click();
  await expect(dock(page).locator('[data-key="run-result"]')).toContainText('Demand met');
  await page.locator('.hotspots').getByRole('button', { name: 'Battery' }).click();
  await expect(page.locator('#card-title')).toHaveText('Battery');
});

test.describe('short laptop screen', () => {
  test.use({ viewport: { width: 1366, height: 768 } });
  test('the whole experiment fits without scrolling', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start lesson' }).click();
    await dock(page).getByRole('button', { name: 'Next →' }).click();
    for (const [i, c] of ['Generation', 'Transmission', 'Substation', 'Distribution', 'Buildings'].entries()) await place(page, c, i + 1);
    await dock(page).getByRole('button', { name: 'Check route' }).click();
    await dock(page).getByRole('button', { name: 'Next →' }).click();
    await expectNoDockScroll(page);
    await passUnitsIntro(page);
    await runChallenge(page);
    await expectNoDockScroll(page);
  });
});
