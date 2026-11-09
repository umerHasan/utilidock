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
  for (const width of [320, 340, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/tools/geography/world-map');
    await expect(page.getByRole('img', { name: 'Interactive world map' })).toBeVisible();
    const layout = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      pageWidth: document.documentElement.scrollWidth,
      overflowingButtons: [...document.querySelectorAll<HTMLElement>('.map-workspace button:not(.map-country)')]
        .filter((button) => button.scrollWidth > button.clientWidth + 2 || button.scrollHeight > button.clientHeight + 2)
        .map((button) => button.innerText.trim()),
    }));
    expect(layout.pageWidth, `page should not overflow at ${width}px`).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.overflowingButtons, `button contents should fit at ${width}px`).toEqual([]);
  }
});

test('natural geography layers can be toggled independently', async ({ page }) => {
  await page.goto('/tools/geography/world-map');
  const map = page.locator('.map-canvas svg');
  for (const [label, key] of [
    ['Rivers', 'rivers'],
    ['Lakes', 'lakes'],
    ['Mountain peaks', 'mountains'],
    ['Waterfalls', 'waterfalls'],
  ]) {
    const layer = page.getByRole('checkbox', { name: `${label} layer` });
    const features = map.locator(`.map-layer-${key} > *`);
    await expect(layer).not.toBeChecked();
    await layer.check();
    await expect(features.first()).toBeVisible();
    expect(await features.count(), `${label} should render when enabled`).toBeGreaterThan(0);
    if (key === 'mountains') await expect(map.locator('.map-layer-mountains title').filter({ hasText: 'Mount Everest' })).toHaveCount(1);
    if (key === 'waterfalls') await expect(map.locator('.map-layer-waterfalls title').filter({ hasText: 'Niagara Falls' })).toHaveCount(1);
    await layer.uncheck();
    await expect(features).toHaveCount(0);
  }
});

test('places and edits text, zooms, and pans the map', async ({ page }) => {
  await page.goto('/tools/geography/world-map');
  const map = page.getByRole('img', { name: 'Interactive world map' });
  const svg = page.locator('.map-canvas svg');
  const zoom = page.getByText('100%', { exact: true });

  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(page.getByText('125%', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reset zoom' }).click();
  await expect(zoom).toBeVisible();

  await page.getByRole('button', { name: 'Add text' }).click();
  await svg.click({ position: { x: 45, y: 340 } });
  const textInput = page.getByRole('textbox', { name: 'Map text' });
  await textInput.fill('Class note');
  await textInput.press('Enter');
  const annotation = map.getByRole('button', { name: 'Edit text: Class note' });
  await expect(annotation).toBeVisible();

  await annotation.click();
  await page.getByRole('textbox', { name: 'Map text' }).fill('Arctic route');
  await page.getByRole('textbox', { name: 'Map text' }).press('Enter');
  await expect(map.getByRole('button', { name: 'Edit text: Arctic route' })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export SVG' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let exported = '';
  for await (const chunk of stream) exported += chunk.toString();
  expect(exported).toContain('Arctic route');

  const bounds = await svg.boundingBox();
  if (!bounds) throw new Error('Map is not visible');
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.wheel(0, -180);
  await expect(page.getByText('120%', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Move map' }).click();
  const beforePan = (await svg.getAttribute('viewBox'))?.split(' ').map(Number);
  if (!beforePan) throw new Error('Map view is unavailable');
  await page.mouse.move(bounds.x + bounds.width * 0.6, bounds.y + bounds.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.7, bounds.y + bounds.height * 0.5, { steps: 4 });
  await page.mouse.up();
  const afterPan = (await svg.getAttribute('viewBox'))?.split(' ').map(Number);
  expect(afterPan?.[0]).not.toBe(beforePan[0]);
});
