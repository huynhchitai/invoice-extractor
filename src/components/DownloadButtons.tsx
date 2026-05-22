'use client';

import type { InvoiceData } from '@/lib/types';

interface Props {
  data: InvoiceData;
  csv: string;
  filename: string;
}

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function DownloadButtons({ data, csv, filename }: Props) {
  const stem = filename.replace(/\.[^.]+$/, '');

  const handleCsv = () => {
    triggerDownload(csv, `${stem}-extracted.csv`, 'text/csv;charset=utf-8;');
  };

  const handleJson = () => {
    triggerDownload(
      JSON.stringify(data, null, 2),
      `${stem}-extracted.json`,
      'application/json'
    );
  };

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={handleCsv}
        className="ledger-button"
        aria-label="Download extracted data as CSV"
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <path d="M7.5 10.5L3 6.5h3V1.5h3v5h3L7.5 10.5Z" fill="currentColor" />
          <line x1="1" y1="13.5" x2="14" y2="13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        CSV
      </button>

      <button
        type="button"
        onClick={handleJson}
        className="ledger-button-ghost"
        aria-label="Download extracted data as JSON"
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <path d="M7.5 10.5L3 6.5h3V1.5h3v5h3L7.5 10.5Z" fill="currentColor" />
          <line x1="1" y1="13.5" x2="14" y2="13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        JSON
      </button>
    </div>
  );
}
