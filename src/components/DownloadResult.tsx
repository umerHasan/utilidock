'use client';
import { Download, RotateCcw, Check } from 'lucide-react';
import { formatBytes } from './OrderedFileList';
export function DownloadResult({ blob, url, name, pages, onReset }: { blob: Blob; url: string; name: string; pages: number; onReset: () => void }) { return <section className="result-panel" aria-live="polite"><span className="success-mark"><Check size={23}/></span><div><h2>Your PDF is ready</h2><p>{name} · {formatBytes(blob.size)} · {pages} {pages === 1 ? 'page' : 'pages'}</p></div><a className="button button-primary" href={url} download={name}><Download size={18}/> Download PDF</a><button className="text-button" onClick={onReset}><RotateCcw size={15}/> Start again</button></section> }
