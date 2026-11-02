'use client';
import { useEffect, useRef, useState } from 'react';
import { FilePlus2, LockKeyhole, Trash2 } from 'lucide-react';
import { FileDrop } from './FileDrop';
import { OrderedFileList, type LocalFile } from './OrderedFileList';
import { ProcessingStatus } from './ProcessingStatus';
import { DownloadResult } from './DownloadResult';
import { runPdfJob } from '@/lib/pdf-worker-client';
import { validateFiles } from '@/lib/file-validation';

export function ImageToPdf() {
  const [files, setFiles] = useState<LocalFile[]>([]); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [progress, setProgress] = useState(0); const [output, setOutput] = useState<{ blob: Blob; url: string; pages: number } | null>(null);
  const objectUrls = useRef(new Set<string>());
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'original'>('a4'); const [orientation, setOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto'); const [margin, setMargin] = useState<'0' | '24' | 'custom'>('24'); const [customMargin, setCustomMargin] = useState(10);
  useEffect(() => () => { for (const url of objectUrls.current) URL.revokeObjectURL(url); objectUrls.current.clear(); }, []);
  const addFiles = async (incoming: File[]) => {
    setError(''); const issues = validateFiles(incoming, 'image', files.length); if (issues.length) { setError(issues.join(' ')); return; }
    const seen = new Set(files.map((entry) => `${entry.file.name}:${entry.file.size}:${entry.file.lastModified}`)); const next: LocalFile[] = [];
    for (const file of incoming) {
      const key = `${file.name}:${file.size}:${file.lastModified}`; if (seen.has(key)) continue; seen.add(key);
      try { const image = await createImageBitmap(file); image.close(); const preview = URL.createObjectURL(file); objectUrls.current.add(preview); next.push({ id: crypto.randomUUID(), file, preview }); }
      catch { setError(`${file.name} could not be opened as an image.`); }
    }
    if (next.length) setFiles((current) => [...current, ...next]);
  };
  const remove = (id: string) => setFiles((current) => { const target = current.find((item) => item.id === id); if (target?.preview) { URL.revokeObjectURL(target.preview); objectUrls.current.delete(target.preview); } return current.filter((item) => item.id !== id); });
  const move = (from: number, to: number) => setFiles((current) => { if (to < 0 || to >= current.length) return current; const list = [...current]; const [item] = list.splice(from, 1); list.splice(to, 0, item); return list; });
  const reset = () => { for (const url of objectUrls.current) URL.revokeObjectURL(url); objectUrls.current.clear(); setFiles([]); setOutput(null); setError(''); setProgress(0); };
  const generate = async () => {
    setError(''); if (!files.length) { setError('Add at least one image to get started.'); return; }
    setBusy(true); setProgress(0);
    try {
      const payload = await Promise.all(files.map(async ({ file }) => {
        let source = file; const extension = file.name.split('.').pop()?.toLowerCase(); let mime = file.type || (extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg');
        if (mime === 'image/webp' || file.name.toLowerCase().endsWith('.webp')) {
          const image = await createImageBitmap(file); const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height; canvas.getContext('2d')!.drawImage(image, 0, 0); const converted = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error(`${file.name} could not be converted.`)), 'image/png')); source = new File([converted], file.name, { type: 'image/png' }); mime = 'image/png'; image.close();
        }
        return { name: file.name, bytes: await source.arrayBuffer(), mime };
      }));
      const result = await runPdfJob({ type: 'images', files: payload, options: { pageSize, orientation, margin: margin === 'custom' ? Math.max(0, customMargin) * 72 / 25.4 : Number(margin) } }, setProgress);
      const blob = new Blob([result.bytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' }); const url = URL.createObjectURL(blob); objectUrls.current.add(url); setOutput({ blob, url, pages: result.pages });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create your PDF.'); } finally { setBusy(false); }
  };
  if (output) return <DownloadResult blob={output.blob} url={output.url} name="images.pdf" pages={output.pages} onReset={reset}/>;
  return <div className="workspace"><div className="workspace-main"><div className="workspace-heading"><div><span className="eyebrow">YOUR IMAGES</span><h2>Choose and arrange images</h2><p>Each image becomes one page in your PDF.</p></div>{files.length > 0 && <button className="text-button danger" disabled={busy} onClick={reset}><Trash2 size={16}/> Clear all</button>}</div><FileDrop accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onFiles={addFiles} disabled={busy}/>{files.length > 0 ? <OrderedFileList files={files} kind="image" onMove={move} onRemove={remove} disabled={busy}/> : <div className="empty-state"><FilePlus2 size={20}/> Your selected images will appear here.</div>}</div><aside className="workspace-options"><span className="eyebrow">PDF SETTINGS</span><h2>Page setup</h2><label>Page size<select disabled={busy} value={pageSize} onChange={(e) => setPageSize(e.target.value as typeof pageSize)}><option value="a4">A4</option><option value="letter">US Letter</option><option value="original">Original image size</option></select></label><label>Orientation<select disabled={busy} value={orientation} onChange={(e) => setOrientation(e.target.value as typeof orientation)}><option value="auto">Automatic</option><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label><label>Margins<select disabled={busy} value={margin} onChange={(e) => setMargin(e.target.value as typeof margin)}><option value="0">None</option><option value="24">Small (8.5 mm)</option><option value="custom">Custom</option></select></label>{margin === 'custom' && <label>Margin (mm)<input disabled={busy} type="number" min="0" max="50" value={customMargin} onChange={(e) => setCustomMargin(Math.min(50, Math.max(0, Number(e.target.value))))}/></label>}<p className="privacy-note"><LockKeyhole size={15}/> Your files are processed on your device.</p><button className="button button-primary full-button" disabled={busy || files.length === 0} onClick={generate}>Create PDF <span>→</span></button><small className="limit-note">JPG, PNG, WebP · Up to 20 images · 50 MB each</small></aside>{busy && <ProcessingStatus progress={progress}/ >}{error && <p className="error-message" role="alert">{error}</p>}</div>
}
