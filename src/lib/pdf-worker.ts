import { GlobalWorkerOptions } from 'pdfjs-dist';

// Use dynamic import for the worker
const workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

GlobalWorkerOptions.workerSrc = workerSrc;

