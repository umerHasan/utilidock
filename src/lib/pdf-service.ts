import { PDFDocument } from 'pdf-lib';
export type ImageInput = { name: string; bytes: ArrayBuffer; mime: string };
export type MergeInput = { name: string; bytes: ArrayBuffer };
export type ImageOptions = { pageSize: 'a4' | 'letter' | 'original'; orientation: 'auto' | 'portrait' | 'landscape'; margin: number };
export async function mergePdfFiles(files: MergeInput[], onProgress: (value: number) => void = () => {}) {
  const output = await PDFDocument.create();
  for (let i = 0; i < files.length; i++) { const file = files[i]; let source: PDFDocument;
    try { source = await PDFDocument.load(file.bytes, { ignoreEncryption: false }); } catch { throw new Error(`${file.name} could not be opened. It may be damaged or password-protected.`); }
    let pages;
    try { pages = await output.copyPages(source, source.getPageIndices()); } catch { throw new Error(`${file.name} contains pages that could not be copied.`); }
    pages.forEach((page) => output.addPage(page)); onProgress(Math.round(((i + 1) / files.length) * 90));
  }
  const bytes = await output.save(); onProgress(100); return { bytes, pages: output.getPageCount() };
}
export async function imagesToPdf(files: ImageInput[], options: ImageOptions, onProgress: (value: number) => void = () => {}) {
  const output = await PDFDocument.create();
  for (let i = 0; i < files.length; i++) { const file = files[i]; let image;
    try { image = file.mime === 'image/png' ? await output.embedPng(file.bytes) : await output.embedJpg(file.bytes); } catch { throw new Error(`${file.name} could not be decoded. Try saving it as JPG or PNG.`); }
    const { width: iw, height: ih } = image; const original = options.pageSize === 'original';
    let width = original ? iw : options.pageSize === 'letter' ? 612 : 595.28; let height = original ? ih : options.pageSize === 'letter' ? 792 : 841.89;
    const landscape = options.orientation === 'landscape' || (options.orientation === 'auto' && iw > ih);
    if (!original && ((landscape && width < height) || (!landscape && width > height))) [width, height] = [height, width];
    const page = output.addPage([width, height]); const margin = Math.min(options.margin, width / 2 - 1, height / 2 - 1);
    const scale = Math.min((width - 2 * margin) / iw, (height - 2 * margin) / ih); const drawWidth = iw * scale, drawHeight = ih * scale;
    page.drawImage(image, { x: (width - drawWidth) / 2, y: (height - drawHeight) / 2, width: drawWidth, height: drawHeight }); onProgress(Math.round(((i + 1) / files.length) * 95));
  }
  const bytes = await output.save(); onProgress(100); return { bytes, pages: output.getPageCount() };
}
