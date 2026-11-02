export type PdfJob =
 | { type: 'images'; files: { name: string; bytes: ArrayBuffer; mime: string }[]; options: { pageSize: 'a4' | 'letter' | 'original'; orientation: 'auto' | 'portrait' | 'landscape'; margin: number } }
 | { type: 'merge'; files: { name: string; bytes: ArrayBuffer }[] };
export function runPdfJob(job: PdfJob, onProgress: (value: number) => void): Promise<{ bytes: Uint8Array; pages: number }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/pdf.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent) => {
      const data = event.data;
      if (data.progress !== undefined) onProgress(data.progress);
      if (data.error) { worker.terminate(); reject(new Error(data.error)); }
      if (data.bytes) { worker.terminate(); resolve({ bytes: new Uint8Array(data.bytes), pages: data.pages }); }
    };
    worker.onerror = () => { worker.terminate(); reject(new Error('Processing failed. Please check the selected files and try again.')); };
    worker.postMessage(job);
  });
}
