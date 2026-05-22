'use client';

import { useState, useCallback } from 'react';
import LedgerBar from '@/components/LedgerBar';
import UploadZone from '@/components/UploadZone';
import InvoiceTable from '@/components/InvoiceTable';
import DownloadButtons from '@/components/DownloadButtons';
import type { InvoiceData } from '@/lib/types';
import type { ExtractResponse, ExtractError } from '@/lib/types';

type State =
  | { status: 'idle' }
  | { status: 'loading'; filename: string }
  | { status: 'success'; data: InvoiceData; csv: string; filename: string; durationMs: number; inputTokens: number; outputTokens: number }
  | { status: 'error'; message: string };

export default function HomePage() {
  const [state, setState] = useState<State>({ status: 'idle' });

  const handleFile = useCallback(async (file: File) => {
    setState({ status: 'loading', filename: file.name });

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch('/api/extract', { method: 'POST', body: form });
      const json = await res.json() as (ExtractResponse & { csv: string }) | ExtractError;

      if (!json.ok) {
        setState({ status: 'error', message: (json as ExtractError).message });
        return;
      }

      const ok = json as ExtractResponse & { csv: string };
      setState({
        status: 'success',
        data: ok.data,
        csv: ok.csv,
        filename: ok.meta.filename,
        durationMs: ok.meta.durationMs,
        inputTokens: ok.meta.inputTokens,
        outputTokens: ok.meta.outputTokens,
      });
    } catch {
      setState({ status: 'error', message: 'Network error — please try again.' });
    }
  }, []);

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return (
    <>
      <LedgerBar />

      <main className="mx-auto max-w-5xl px-5 sm:px-8 pb-24">
        {/* ── Page header ──────────────────────────────────────────── */}
        <header
          className="ledger-reveal pt-12 sm:pt-16 pb-8"
          style={{ animationDelay: '0ms' }}
        >
          <p className="ledger-eyebrow mb-3">Portfolio Project #4 · Tai Huynh</p>
          <h1
            className="font-display text-[clamp(2rem,6vw,3.5rem)] font-semibold leading-tight"
            style={{ color: 'var(--ink)' }}
          >
            Invoice Extractor
          </h1>
          <p
            className="font-body mt-3 max-w-xl text-lg leading-relaxed"
            style={{ color: 'var(--ink-soft)' }}
          >
            Upload an invoice or receipt — get clean structured data: vendor, line items,
            totals, tax. Export to CSV or JSON in one click.
          </p>

          {/* Decorative ruled lines */}
          <div className="mt-8 ledger-rule-thick" />
          <div className="mt-px ledger-rule-hair" />
        </header>

        {/* ── Upload zone ───────────────────────────────────────────── */}
        <section
          className="ledger-reveal"
          style={{ animationDelay: '80ms' }}
        >
          <UploadZone
            onFile={handleFile}
            disabled={state.status === 'loading'}
          />
        </section>

        {/* ── Loading state ─────────────────────────────────────────── */}
        {state.status === 'loading' && (
          <section
            className="ledger-reveal mt-10 flex items-start gap-4 border-l-4 p-5"
            style={{ borderColor: 'var(--ledger)', background: 'var(--ledger-light)', animationDelay: '0ms' }}
          >
            <Spinner />
            <div>
              <p className="font-display font-semibold" style={{ color: 'var(--ledger)' }}>
                Extracting…
              </p>
              <p className="font-body text-sm mt-0.5" style={{ color: 'var(--ink-soft)' }}>
                Sending <span className="font-mono">{state.filename}</span> to Gemini 2.5 Flash
              </p>
            </div>
          </section>
        )}

        {/* ── Error state ───────────────────────────────────────────── */}
        {state.status === 'error' && (
          <section
            className="ledger-reveal mt-10 flex items-start justify-between gap-4 border-l-4 p-5"
            style={{ borderColor: 'var(--debit)', background: '#FEF2F2', animationDelay: '0ms' }}
          >
            <div>
              <p className="font-display font-semibold" style={{ color: 'var(--debit)' }}>
                Extraction failed
              </p>
              <p className="font-body text-sm mt-1" style={{ color: '#7F1D1D' }}>
                {state.message}
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="ledger-eyebrow shrink-0 underline"
              style={{ color: 'var(--debit)' }}
            >
              Try again
            </button>
          </section>
        )}

        {/* ── Success: results ──────────────────────────────────────── */}
        {state.status === 'success' && (
          <div className="mt-10 flex flex-col gap-8">
            {/* Toolbar row */}
            <div
              className="ledger-reveal flex flex-wrap items-center justify-between gap-4"
              style={{ animationDelay: '0ms' }}
            >
              <div>
                <p className="font-display text-xl font-semibold" style={{ color: 'var(--ink)' }}>
                  Extracted
                </p>
                <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--ink-quiet)' }}>
                  {state.filename} · {state.durationMs} ms · {state.inputTokens}↑ {state.outputTokens}↓ tokens
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <DownloadButtons
                  data={state.data}
                  csv={state.csv}
                  filename={state.filename}
                />
                <button
                  type="button"
                  onClick={reset}
                  className="ledger-eyebrow underline"
                  style={{ color: 'var(--ink-quiet)' }}
                >
                  Upload another
                </button>
              </div>
            </div>

            {/* Extracted fields */}
            <div
              className="ledger-reveal"
              style={{ animationDelay: '60ms', background: 'var(--surface)', border: '1px solid var(--rule)', padding: '1.5rem 1.75rem' }}
            >
              <InvoiceTable data={state.data} />
            </div>

            {/* Raw JSON accordion */}
            <details
              className="ledger-reveal border p-4"
              style={{ borderColor: 'var(--rule)', animationDelay: '120ms' }}
            >
              <summary
                className="font-mono text-xs font-bold uppercase tracking-widest cursor-pointer"
                style={{ color: 'var(--ink-quiet)' }}
              >
                Raw JSON output
              </summary>
              <pre
                className="mt-4 overflow-x-auto text-xs leading-relaxed"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)', background: 'var(--paper)', padding: '1rem' }}
              >
                {JSON.stringify(state.data, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* ── Idle: sample guidance ─────────────────────────────────── */}
        {state.status === 'idle' && (
          <aside
            className="ledger-reveal mt-10 grid gap-4 sm:grid-cols-3"
            style={{ animationDelay: '160ms' }}
          >
            {[
              {
                n: '01',
                title: 'Upload',
                body: 'PNG, JPEG, WEBP, or PDF. Photos of paper invoices work — Gemini reads them.',
              },
              {
                n: '02',
                title: 'Extract',
                body: 'Gemini 2.5 Flash reads the document as an image. Vendor, line items, tax, total.',
              },
              {
                n: '03',
                title: 'Export',
                body: 'Download CSV ready for Excel/Sheets, or raw JSON for your own pipeline.',
              },
            ].map((step) => (
              <div
                key={step.n}
                className="border-t-4 pt-4"
                style={{ borderColor: 'var(--ledger)' }}
              >
                <span className="folio">{step.n}</span>
                <h3
                  className="font-display mt-2 text-base font-semibold"
                  style={{ color: 'var(--ink)' }}
                >
                  {step.title}
                </h3>
                <p
                  className="font-body mt-1 text-sm leading-relaxed"
                  style={{ color: 'var(--ink-soft)' }}
                >
                  {step.body}
                </p>
              </div>
            ))}
          </aside>
        )}
      </main>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer
        className="border-t-2 mt-auto"
        style={{ borderColor: 'var(--ink)' }}
      >
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-3 px-5 py-5 sm:flex-row sm:items-center sm:px-8">
          <p className="font-mono text-xs" style={{ color: 'var(--ink-quiet)' }}>
            Tai Huynh · 2026 · built with Next.js &amp; Vertex AI (Gemini 2.5 Flash)
          </p>
          <p className="font-mono text-xs" style={{ color: 'var(--ink-quiet)' }}>
            <a href="https://github.com/0CCHacker" className="hover:text-[var(--ink)]">Tai Huynh</a>
            <span className="mx-2" style={{ color: 'var(--rule)' }}>·</span>
            <a href="https://github.com/0CCHacker" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--ink)]">github</a>
            <span className="mx-2" style={{ color: 'var(--rule)' }}>·</span>
            <a href="mailto:huynhchitai.070306@gmail.com" className="hover:text-[var(--ink)]">email</a>
          </p>
        </div>
      </footer>
    </>
  );
}

function Spinner() {
  return (
    <svg
      className="shrink-0 animate-spin"
      width="20" height="20" viewBox="0 0 20 20" fill="none"
      aria-hidden="true"
      style={{ color: 'var(--ledger)' }}
    >
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeDasharray="40" strokeDashoffset="30" strokeLinecap="round" />
    </svg>
  );
}
