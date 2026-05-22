'use client';

import { useCallback, useRef, useState } from 'react';

interface UploadZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

const ACCEPT = '.png,.jpg,.jpeg,.webp,.pdf';
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
const MAX_MB = 8;

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function UploadZone({ onFile, disabled }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ name: string; size: string } | null>(null);

  const validateAndSubmit = useCallback(
    (file: File) => {
      setLocalError(null);
      if (!ACCEPTED_TYPES.includes(file.type)) {
        // Note: we rely on server-side magic-byte detection for real enforcement;
        // this is just a UX guard so users see feedback immediately.
        setLocalError(`Unsupported type "${file.type}". Upload PNG, JPEG, WEBP, or PDF.`);
        return;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        setLocalError(`File is ${humanSize(file.size)}; limit is ${MAX_MB} MB.`);
        return;
      }
      setPreview({ name: file.name, size: humanSize(file.size) });
      onFile(file);
    },
    [onFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) validateAndSubmit(file);
    },
    [disabled, validateAndSubmit]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndSubmit(file);
      // Reset so the same file can be re-submitted
      e.target.value = '';
    },
    [validateAndSubmit]
  );

  return (
    <div className="w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        aria-label="Upload invoice or receipt"
        className="relative w-full cursor-pointer border-2 border-dashed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ledger)]"
        style={{
          borderColor: dragOver ? 'var(--ledger)' : 'var(--rule)',
          background: dragOver ? 'var(--ledger-light)' : 'var(--surface)',
          padding: '3rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        {/* Ledger book icon (SVG inline) */}
        <svg
          width="48" height="48" viewBox="0 0 48 48"
          fill="none" aria-hidden="true"
          style={{ color: dragOver ? 'var(--ledger)' : 'var(--ink-quiet)', transition: 'color 0.15s' }}
        >
          <rect x="8" y="6" width="32" height="36" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
          <line x1="14" y1="16" x2="34" y2="16" stroke="currentColor" strokeWidth="1.5" />
          <line x1="14" y1="22" x2="34" y2="22" stroke="currentColor" strokeWidth="1.5" />
          <line x1="14" y1="28" x2="34" y2="28" stroke="currentColor" strokeWidth="1.5" />
          <line x1="14" y1="34" x2="26" y2="34" stroke="currentColor" strokeWidth="1.5" />
          <line x1="8" y1="6" x2="8" y2="42" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>

        <div className="text-center">
          <p
            className="font-display text-lg font-semibold"
            style={{ color: dragOver ? 'var(--ledger)' : 'var(--ink)' }}
          >
            {preview ? preview.name : 'Drop invoice or receipt here'}
          </p>
          <p className="font-body mt-1 text-sm" style={{ color: 'var(--ink-quiet)' }}>
            {preview
              ? `${preview.size} — click to replace`
              : 'PNG · JPEG · WEBP · PDF — up to 8 MB — or click to browse'}
          </p>
        </div>

        {disabled && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(244,241,232,0.75)' }}>
            <span className="font-mono text-sm" style={{ color: 'var(--ledger)' }}>Extracting…</span>
          </div>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={handleChange}
        tabIndex={-1}
        aria-hidden="true"
      />

      {localError && (
        <p className="mt-2 font-mono text-xs" style={{ color: 'var(--debit)' }} role="alert">
          {localError}
        </p>
      )}
    </div>
  );
}
