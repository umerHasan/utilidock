/// <reference lib="webworker" />
import { imagesToPdf, mergePdfFiles } from '../lib/pdf-service';
const scope = self as unknown as DedicatedWorkerGlobalScope;
scope.onmessage = async ({ data }) => {
  try {
    const progress = (value: number) => scope.postMessage({ progress: value });
    const result = data.type === 'merge' ? await mergePdfFiles(data.files, progress) : await imagesToPdf(data.files, data.options, progress);
    scope.postMessage({ bytes: result.bytes, pages: result.pages }, [result.bytes.buffer]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The files could not be processed.';
    scope.postMessage({ error: message });
  }
};
