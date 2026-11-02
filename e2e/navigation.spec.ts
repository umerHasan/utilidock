import { expect, test } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
test('homepage links through categories and into a utility', async ({ page }) => {
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Everyday tools, one place.' })).toBeVisible();
  await page.getByRole('link', { name: /PDF tools/ }).first().click(); await expect(page).toHaveURL(/\/tools\/pdf$/);
  await page.getByRole('link', { name: /Image to PDF/ }).first().click(); await expect(page).toHaveURL(/image-to-pdf$/); await expect(page.getByRole('heading', { name: 'Choose and arrange images' })).toBeVisible();
});
test('search filters the registered tools', async ({ page }) => { await page.goto('/'); await page.getByRole('textbox', { name: 'Search tools' }).fill('merge'); await expect(page.getByRole('link', { name: /Merge PDF/ }).last()).toBeVisible(); });
test('image conversion downloads a generated PDF', async ({ page }) => {
  await page.goto('/tools/pdf/image-to-pdf');
  const dataUrls = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 2; canvas.height = 1; const context = canvas.getContext('2d')!; context.fillStyle = '#263'; context.fillRect(0, 0, 2, 1); return { png: canvas.toDataURL('image/png'), webp: canvas.toDataURL('image/webp') }; });
  const png = Buffer.from(dataUrls.png.split(',')[1], 'base64'); const webp = Buffer.from(dataUrls.webp.split(',')[1], 'base64');
  await page.locator('input[type="file"]').setInputFiles([{ name: 'first.png', mimeType: 'image/png', buffer: png }, { name: 'second.webp', mimeType: 'image/webp', buffer: webp }]);
  await expect(page.getByText('first.png')).toBeVisible(); await expect(page.getByText('second.webp')).toBeVisible();
  await page.getByRole('button', { name: 'Move second.webp up' }).click();
  await expect(page.locator('.file-meta strong')).toHaveText(['second.webp', 'first.png']);
  await page.getByRole('button', { name: 'Create PDF' }).click(); await expect(page.getByRole('heading', { name: 'Your PDF is ready' })).toBeVisible();
  await expect(page.getByText(/2 pages/)).toBeVisible();
  const link = page.getByRole('link', { name: 'Download PDF' }); await expect(link).toHaveAttribute('download', 'images.pdf');
});
test('PDF merge downloads a combined document', async ({ page }) => {
  const sourceA = await PDFDocument.create(); sourceA.addPage([300, 500]);
  const sourceB = await PDFDocument.create(); sourceB.addPage([700, 400]);
  await page.goto('/tools/pdf/merge-pdf');
  await page.locator('input[type="file"]').setInputFiles([
    { name: 'portrait.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await sourceA.save()) },
    { name: 'landscape.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await sourceB.save()) },
  ]);
  await page.getByRole('button', { name: 'Move landscape.pdf up' }).click();
  await expect(page.locator('.file-meta strong')).toHaveText(['landscape.pdf', 'portrait.pdf']);
  await page.getByRole('button', { name: 'Merge PDFs' }).click(); await expect(page.getByRole('heading', { name: 'Your PDF is ready' })).toBeVisible();
  await expect(page.getByText(/2 pages/)).toBeVisible();
  const link = page.getByRole('link', { name: 'Download PDF' }); await expect(link).toHaveAttribute('download', 'merged.pdf');
});
test('mobile layouts fit the viewport without horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/', '/tools/pdf/image-to-pdf']) {
    await page.goto(route);
    const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflows, `${route} should fit on a 390px viewport`).toBe(false);
  }
});
