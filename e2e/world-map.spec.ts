import { expect, test } from '@playwright/test';

test('colors countries, draws, undoes, exports, and clears the map', async ({ page }) => {
  await page.goto('/tools/geography/world-map');
  const map = page.getByRole('img', { name: 'Interactive world map' });
  const brazil = map.getByRole('button', { name: 'Brazil', exact: true });
  await expect(brazil).toHaveAttribute('fill', '#e1e9df');
  await brazil.click();
  await expect(brazil).toHaveAttribute('fill', '#347d68');
  await expect(page.getByText('1 area colored')).toBeVisible();

  await page.getByRole('button', { name: 'Coral', exact: true }).click();
  await page.getByLabel('FIND A COUNTRY').selectOption({ label: 'France' });
  await page.getByRole('button', { name: 'Fill selected country' }).click();
  await expect(map.getByRole('button', { name: 'France', exact: true })).toHaveAttribute('fill', '#e7937b');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(map.getByRole('button', { name: 'France', exact: true })).toHaveAttribute('fill', '#e1e9df');

  const label = map.locator('text').filter({ hasText: 'Brazil' });
  await expect(label).toBeVisible();
  await page.getByRole('switch', { name: 'Country labels' }).click();
  await expect(label).toHaveCount(0);
  await page.getByRole('switch', { name: 'Country labels' }).click();

  await page.getByRole('button', { name: 'Draw on map' }).click();
  const box = await map.boundingBox();
  if (!box) throw new Error('Map is not visible');
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4, { steps: 5 });
  await page.mouse.up();
  await expect(map.locator('g[stroke-linecap="round"] path')).toHaveCount(1);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(map.locator('g[stroke-linecap="round"] path')).toHaveCount(0);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export SVG' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('world-map.svg');
  const stream = await download.createReadStream();
  let exported = '';
  for await (const chunk of stream) exported += chunk.toString();
  expect(exported).toContain('#347d68');
  expect(exported).toContain('Brazil');

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Clear map' }).click();
  await expect(brazil).toHaveAttribute('fill', '#e1e9df');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(brazil).toHaveAttribute('fill', '#347d68');
  await page.getByRole('button', { name: 'Erase fill' }).click();
  await brazil.click();
  await expect(brazil).toHaveAttribute('fill', '#e1e9df');
});

test('world map fits a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tools/geography/world-map');
  await expect(page.getByRole('img', { name: 'Interactive world map' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
