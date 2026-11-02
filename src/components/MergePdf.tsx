'use client';
import { useEffect, useRef, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { FilePlus2, LockKeyhole, Trash2 } from 'lucide-react';
import { FileDrop } from './FileDrop';
import { OrderedFileList, type LocalFile } from './OrderedFileList';
import { ProcessingStatus } from './ProcessingStatus';
import { DownloadResult } from './DownloadResult';
import { runPdfJob } from '@/lib/pdf-worker-client';
import { validateFiles } from '@/lib/file-validation';

export function MergePdf() {
  const [files, setFiles] = useState<LocalFile[]>([]); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [progress, setProgress] = useState(0); const [output, setOutput] = useState<{ blob: Blob; url: string; pages: number } | null>(null);
  const objectUrls = useRef(new Set<string>());
  useEffect(() => () => { for (const url of objectUrls.current) URL.revokeObjectURL(url); objectUrls.current.clear(); }, []);
  const addFiles = async (incoming: File[]) => {
    setError(''); const issues = validateFiles(incoming, 'pdf', files.length); if (issues.length) { setError(issues.join(' ')); return; }
    const next: LocalFile[] = [];
    for (const file of incoming) {
      try { const bytes = await file.arrayBuffer(); if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') throw new Error(); const doc = await PDFDocument.load(bytes, { ignoreEncryption: false }); next.push({ id: crypto.randomUUID(), file, pages: doc.getPageCount() }); }
      catch { setError(`${file.name} could not be opened. It may be invalid or password-protected.`); }
    }
    if (next.length) setFiles((current) => [...current, ...next]);
  };
  const remove = (id: string) => setFiles((current) => current.filter((item) => item.id !== id));
  const move = (from: number, to: number) => setFiles((current) => { if (to < 0 || to >= current.length) return current; const list = [...current]; const [item] = list.splice(from, 1); list.splice(to, 0, item); return list; });
  const reset = () => { for (const url of objectUrls.current) URL.revokeObjectURL(url); objectUrls.current.clear(); setFiles([]); setOutput(null); setError(''); setProgress(0); };
  const merge = async () => { setError(''); if (files.length < 2) { setError('Add at least two PDF files to merge.'); return; } setBusy(true); setProgress(0); try { const inputs = await Promise.all(files.map(async ({ file }) => ({ name: file.name, bytes: await file.arrayBuffer() }))); const result = await runPdfJob({ type: 'merge', files: inputs }, setProgress); const blob = new Blob([result.bytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' }); const url = URL.createObjectURL(blob); objectUrls.current.add(url); setOutput({ blob, url, pages: result.pages }); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not merge these PDFs.'); } finally { setBusy(false); } };
  if (output) return <DownloadResult blob={output.blob} url={output.url} name="merged.pdf" pages={output.pages} onReset={reset}/>;
  return <div className="workspace"><div className="workspace-main"><div className="workspace-heading"><div><span className="eyebrow">YOUR DOCUMENTS</span><h2>Choose and arrange PDFs</h2><p>Documents are merged in the order shown below.</p></div>{files.length > 0 && <button className="text-button danger" disabled={busy} onClick={reset}><Trash2 size={16}/> Clear all</button>}</div><FileDrop accept=".pdf,application/pdf" onFiles={addFiles} disabled={busy}/>{files.length > 0 ? <OrderedFileList files={files} kind="pdf" onMove={move} onRemove={remove} disabled={busy}/> : <div className="empty-state"><FilePlus2 size={20}/> Your selected documents will appear here.</div>}</div><aside className="workspace-options"><span className="eyebrow">MERGE SETTINGS</span><h2>Output</h2><div className="output-filename"><span>Filename</span><strong>merged.pdf</strong></div><p className="privacy-note"><LockKeyhole size={15}/> Files stay on your device.</p><button className="button button-primary full-button" disabled={busy || files.length < 2} onClick={merge}>Merge PDFs <span>→</span></button><small className="limit-note">PDF files · Up to 20 documents · 50 MB each</small></aside>{busy && <ProcessingStatus progress={progress}/ >}{error && <p className="error-message" role="alert">{error}</p>}</div>
}
