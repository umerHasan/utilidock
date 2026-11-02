import { describe, expect, it } from 'vitest';
import { getCategoryUtilities, getPublishedUtilities, getUtility, searchUtilities } from './registry';
import { validateFiles } from './file-validation';
import { mergePdfFiles, imagesToPdf } from './pdf-service';
import { PDFDocument } from 'pdf-lib';
describe('utility registry', () => {
  it('publishes only functional tools and resolves dedicated routes', () => { expect(getPublishedUtilities().map((tool) => tool.slug)).toEqual(['image-to-pdf', 'merge-pdf']); expect(getCategoryUtilities('pdf')).toHaveLength(2); expect(getUtility('pdf', 'merge-pdf')?.id).toBe('pdf-merge-pdf'); });
  it('searches names, descriptions, and keywords', () => { expect(searchUtilities('photos').map((tool) => tool.slug)).toContain('image-to-pdf'); expect(searchUtilities('combine').map((tool) => tool.slug)).toContain('merge-pdf'); expect(searchUtilities('not a tool')).toHaveLength(0); });
});
describe('file validation', () => {
  it('accepts supported formats and rejects unsupported, oversized, or excess files', () => {
    expect(validateFiles([new File(['x'], 'picture.webp', { type: 'image/webp' })], 'image')).toEqual([]);
    expect(validateFiles([new File(['x'], 'notes.txt', { type: 'text/plain' })], 'image')[0]).toMatch(/not a supported image/);
    expect(validateFiles([new File([new Uint8Array(51 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' })], 'pdf')[0]).toMatch(/50 MB limit/);
    expect(validateFiles([new File(['a'], 'a.pdf'), new File(['b'], 'b.pdf')], 'pdf', 19)[0]).toMatch(/up to 20/);
  });
});
describe('PDF processing', () => {
  it('merges in selected order and preserves source dimensions', async () => {
    const first = await PDFDocument.create(); first.addPage([300, 500]); first.addPage([200, 250]); const second = await PDFDocument.create(); second.addPage([700, 400]);
    const merged = await mergePdfFiles([{ name: 'one.pdf', bytes: (await first.save()).slice().buffer as ArrayBuffer }, { name: 'two.pdf', bytes: (await second.save()).slice().buffer as ArrayBuffer }]); const reopened = await PDFDocument.load(merged.bytes);
    expect(merged.pages).toBe(3); expect(reopened.getPages().map((page) => page.getSize())).toEqual([{ width: 300, height: 500 }, { width: 200, height: 250 }, { width: 700, height: 400 }]);
  });
  it('creates one correctly oriented page per image', async () => {
    const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jk4sAAAAASUVORK5CYII='), (char) => char.charCodeAt(0)).buffer;
    const result = await imagesToPdf([{ name: 'first.png', bytes: png, mime: 'image/png' }, { name: 'second.png', bytes: png, mime: 'image/png' }], { pageSize: 'a4', orientation: 'landscape', margin: 0 }); const reopened = await PDFDocument.load(result.bytes); const size = reopened.getPage(0).getSize();
    expect(result.pages).toBe(2); expect(size.width).toBeGreaterThan(size.height);
  });
  it('reports invalid files by name', async () => { await expect(mergePdfFiles([{ name: 'broken.pdf', bytes: new TextEncoder().encode('bad').buffer }])).rejects.toThrow('broken.pdf'); });
});
