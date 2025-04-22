import React, { useState } from 'react';
import { toast } from 'sonner';
import * as pdfjsLib from 'pdfjs-dist';
import { Button } from './ui/button';

// Import the worker from the installed package
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export function UserVerification() {
  const [extractedText, setExtractedText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    setSelectedFile(file);
    setExtractedText('');
  };

  const handleExtract = async () => {
    if (!selectedFile) {
      toast.error('Please select a PDF file first');
      return;
    }

    try {
      setLoading(true);
      setStatus('Reading file...');
      setExtractedText('');

      // Read file
      const arrayBuffer = await selectedFile.arrayBuffer();
      
      setStatus('Processing PDF...');
      
      // Load PDF document
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;
      
      setStatus(`Extracting text from ${pdfDoc.numPages} pages...`);
      
      // Extract text from all pages
      let fullText = '';
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += `Page ${pageNum}:\n${pageText}\n\n`;
      }

      setExtractedText(fullText);
      setStatus('');
      toast.success('Text extracted successfully');
      
    } catch (error) {
      console.error('PDF extraction error:', error);
      toast.error('Failed to extract text from PDF');
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">PDF Text Extractor</h2>

      <div className="space-y-6">
        <div className="p-4 border rounded-lg bg-white shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              disabled={loading}
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-violet-50 file:text-violet-700
                hover:file:bg-violet-100"
            />
            <Button
              onClick={handleExtract}
              disabled={!selectedFile || loading}
              className="min-w-[120px] whitespace-nowrap"
            >
              {loading ? 'Extracting...' : 'Extract Text'}
            </Button>
          </div>
        </div>

        {loading && status && (
          <div className="mt-4 p-4 bg-blue-50 text-blue-700 rounded-lg">
            <div className="flex items-center">
              <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {status}
            </div>
          </div>
        )}

        {extractedText && (
          <div className="mt-6 bg-white shadow-lg rounded-xl border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                <svg 
                  className="w-5 h-5 mr-2 text-blue-500" 
                  fill="none" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
               AI  Extracted Text Analysis
              </h4>
              <div className="text-sm text-gray-500">
                Processing Complete
              </div>
            </div>
            <div className="p-6 bg-gray-50 rounded-b-xl">
              <div className="bg-white border border-gray-100 rounded-lg p-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                <pre className="whitespace-pre-wrap break-words text-gray-700 font-mono text-sm leading-relaxed">
                  {extractedText}
                </pre>
              </div>
              <div className="mt-4 flex justify-end">
                <button 
                  onClick={() => navigator.clipboard.writeText(extractedText)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200"
                >
                  <svg 
                    className="w-4 h-4 mr-2" 
                    fill="none" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy to Clipboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}




