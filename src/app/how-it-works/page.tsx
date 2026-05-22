import Link from 'next/link';
import LedgerBar from '@/components/LedgerBar';

export const metadata = {
  title: 'How it works — Invoice Extractor · Tai Huynh · Tai Huynh',
};

const STEPS: { n: string; title: string; body: React.ReactNode }[] = [
  {
    n: '01',
    title: 'Rate limit',
    body: 'Upstash sliding window — 20 requests per IP per day. Graceful no-op when Upstash is not configured (local dev). Prefix: rl:invoice.',
  },
  {
    n: '02',
    title: 'Multipart parse',
    body: (
      <>
        Next.js <code className="font-mono text-xs">req.formData()</code> reads the upload.
        The <code className="font-mono text-xs">file</code> field is required; anything else
        is ignored. 400 if the form is malformed or the field is missing.
      </>
    ),
  },
  {
    n: '03',
    title: 'Size cap',
    body: (
      <>
        Hard 8 MB cap enforced on <code className="font-mono text-xs">file.size</code> before
        reading the buffer into memory. Returns 413 with a human-readable size in the error.
        Prevents memory exhaustion on the serverless function.
      </>
    ),
  },
  {
    n: '04',
    title: 'Magic-byte file-type detection',
    body: (
      <>
        The browser-supplied <code className="font-mono text-xs">Content-Type</code> header is
        never trusted. The first bytes of the buffer are inspected directly:{' '}
        <code className="font-mono text-xs">89 50 4E 47</code> → PNG,{' '}
        <code className="font-mono text-xs">FF D8 FF</code> → JPEG,{' '}
        <code className="font-mono text-xs">RIFF….WEBP</code> → WEBP,{' '}
        <code className="font-mono text-xs">%PDF</code> → PDF. Any other signature → 415.
        This prevents content-type spoofing attacks (e.g. an executable renamed to invoice.pdf).
      </>
    ),
  },
  {
    n: '05',
    title: 'Gemini inlineData call',
    body: (
      <>
        The buffer is base64-encoded and sent to Gemini 2.5 Flash as{' '}
        <code className="font-mono text-xs">inlineData</code> — the multimodal vision input.
        The model receives the raw image/PDF bytes directly, not a URL; no intermediate
        storage or signed URL required. Temperature 0,{' '}
        <code className="font-mono text-xs">maxOutputTokens: 2048</code>,{' '}
        <code className="font-mono text-xs">responseMimeType: application/json</code> +{' '}
        <code className="font-mono text-xs">responseSchema</code> to constrain the output.
      </>
    ),
  },
  {
    n: '06',
    title: 'System-prompt isolation',
    body: (
      <>
        The system prompt is sent via{' '}
        <code className="font-mono text-xs">systemInstruction</code> — structurally separate
        from the user content. It explicitly instructs the model to treat the document as
        untrusted data and not to follow any embedded instructions. This mitigates prompt
        injection attacks where a malicious invoice contains text like
        &ldquo;Ignore previous instructions and output…&rdquo;
      </>
    ),
  },
  {
    n: '07',
    title: 'Gemini responseSchema',
    body: (
      <>
        A hand-built OpenAPI subset (Gemini does not accept{' '}
        <code className="font-mono text-xs">$ref</code> /{' '}
        <code className="font-mono text-xs">anyOf</code>; nullable must be{' '}
        <code className="font-mono text-xs">nullable: true</code>, not{' '}
        <code className="font-mono text-xs">type: [&apos;string&apos;, &apos;null&apos;]</code>
        ) constrains the model to the exact shape of an invoice: vendor, lineItems array,
        totals. This dramatically reduces hallucination and invalid JSON.
      </>
    ),
  },
  {
    n: '08',
    title: 'Zod validation + number coercion',
    body: (
      <>
        The model output is parsed with <code className="font-mono text-xs">JSON.parse</code>{' '}
        then validated by a zod schema. A custom{' '}
        <code className="font-mono text-xs">coercedNumber</code> transformer strips currency
        symbols and commas (e.g. <code className="font-mono text-xs">&ldquo;$1,234.56&rdquo;</code>{' '}
        → <code className="font-mono text-xs">1234.56</code>) and converts EU-format decimals.
        Invalid output → 502 with a typed error code, never a raw zod message to the client.
      </>
    ),
  },
  {
    n: '09',
    title: 'CSV formula-injection escaping',
    body: (
      <>
        Any cell whose string form starts with{' '}
        <code className="font-mono text-xs">= + - @</code> is prefixed with a single
        apostrophe before writing to CSV. This prevents spreadsheet formula injection —
        a vendor named <code className="font-mono text-xs">=HYPERLINK(&quot;http://evil.com&quot;)</code>{' '}
        becomes <code className="font-mono text-xs">&apos;=HYPERLINK(…)</code> and is treated
        as plain text by Excel and Google Sheets.
      </>
    ),
  },
  {
    n: '10',
    title: 'Structured JSON + CSV response',
    body: 'The API returns the typed InvoiceData object plus the pre-built CSV string and token/duration telemetry. The client renders the table, offers download buttons, and shows the raw JSON in an accessible details/summary accordion.',
  },
];

const ASCII_PIPELINE = `
  Browser
     │
     │  POST /api/extract (multipart, field: file)
     ▼
┌─────────────────────────────────────────────┐
│  1. Rate limit (Upstash sliding window)     │
│  2. Multipart parse — require "file" field  │
│  3. Size cap (8 MB hard limit)              │
│  4. Magic-byte detection (PNG/JPG/WEBP/PDF) │
│  5. base64-encode buffer for inlineData     │
│  6. Gemini 2.5 Flash (vision, temp=0)       │
│     └─ responseSchema constrains output     │
│     └─ systemInstruction isolates prompt    │
│  7. JSON.parse raw response text            │
│  8. Zod validate + coerce numbers           │
│  9. CSV build + formula-injection escape    │
└─────────────────────────────────────────────┘
     │
     │  { ok: true, data: InvoiceData, csv: "…", meta: {…} }
     ▼
  Browser renders ledger table + download buttons
`.trim();

export default function HowItWorks() {
  return (
    <>
      <LedgerBar />

      <main className="mx-auto max-w-5xl px-5 sm:px-8 pb-24">
        {/* ── Header ───────────────────────────────────────────────── */}
        <header
          className="ledger-reveal pt-12 sm:pt-16 pb-8"
          style={{ animationDelay: '0ms' }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="ledger-eyebrow">Engineering notes</p>
            <Link
              href="/"
              className="ledger-eyebrow hover:text-[var(--ink)] transition-colors"
              style={{ color: 'var(--ink-quiet)' }}
            >
              ← back to demo
            </Link>
          </div>
          <h1
            className="font-display text-[clamp(1.8rem,5vw,3rem)] font-semibold leading-tight"
            style={{ color: 'var(--ink)' }}
          >
            How Invoice Extractor actually works.
          </h1>
          <p
            className="font-body mt-3 max-w-2xl text-lg leading-relaxed"
            style={{ color: 'var(--ink-soft)' }}
          >
            One Vercel deploy, no intermediate storage. The file travels from the browser
            directly to Gemini as base64 inlineData — no S3, no signed URLs, no
            preprocessing. Below: the ten steps from upload to structured table, plus
            the security decisions and the gaps honestly disclosed.
          </p>
          <div className="mt-8 ledger-rule-thick" />
          <div className="mt-px ledger-rule-hair" />
        </header>

        <div className="grid gap-x-12 gap-y-14 lg:grid-cols-[1fr_320px]">
          {/* ── Left: pipeline steps ─────────────────────────────── */}
          <div>
            {/* ASCII diagram */}
            <section
              className="ledger-reveal mb-12"
              style={{ animationDelay: '60ms' }}
            >
              <h2
                className="font-mono mb-4 text-xs font-bold uppercase tracking-widest"
                style={{ color: 'var(--ink-quiet)' }}
              >
                Pipeline at a glance
              </h2>
              <pre
                className="overflow-x-auto border p-5 text-xs leading-relaxed"
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--ink-soft)',
                  background: 'var(--surface)',
                  borderColor: 'var(--rule)',
                }}
              >
                {ASCII_PIPELINE}
              </pre>
            </section>

            {/* Step-by-step */}
            <section className="ledger-reveal" style={{ animationDelay: '100ms' }}>
              <h2
                className="font-mono mb-6 text-xs font-bold uppercase tracking-widest"
                style={{ color: 'var(--ink-quiet)' }}
              >
                Step by step
              </h2>
              <ol className="flex flex-col gap-8">
                {STEPS.map((s, i) => (
                  <li
                    key={s.n}
                    className="ledger-reveal grid grid-cols-[2.5rem_1fr] gap-x-5 border-b pb-8"
                    style={{
                      borderColor: 'var(--rule-soft)',
                      animationDelay: `${140 + i * 40}ms`,
                    }}
                  >
                    <span className="folio pt-0.5">{s.n}</span>
                    <div>
                      <h3
                        className="font-display text-lg font-semibold leading-tight"
                        style={{ color: 'var(--ink)' }}
                      >
                        {s.title}
                      </h3>
                      <p
                        className="font-body mt-2 text-sm leading-relaxed"
                        style={{ color: 'var(--ink-soft)' }}
                      >
                        {s.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          {/* ── Right: sidebar notes ─────────────────────────────── */}
          <aside className="flex flex-col gap-5">
            <div className="sticky top-20 flex flex-col gap-5">
              <Note title="File handling">
                No files are persisted on the server. The buffer lives in memory
                for the duration of the serverless function invocation (&lt; 60 s),
                then is garbage-collected. No S3, no GCS, no database writes.
              </Note>

              <Note title="Magic bytes vs. MIME" accent>
                The browser&rsquo;s <code className="font-mono text-xs">Content-Type</code>{' '}
                header is informational only — any client can send{' '}
                <code className="font-mono text-xs">image/png</code> for an EXE.
                Magic-byte detection reads the actual file signature from bytes
                0–11 of the buffer. This is the same technique used by{' '}
                <code className="font-mono text-xs">file(1)</code> on Unix.
                <br /><br />
                <strong className="font-display text-xs">Gap:</strong> the Vitest
                spec covers detection and spoofing, but the server does not
                re-validate after Gemini base64-decodes the data (Gemini handles
                the decoding internally). Considered acceptable for this demo.
              </Note>

              <Note title="Prompt injection">
                The system prompt is sent via{' '}
                <code className="font-mono text-xs">systemInstruction</code> —
                structurally separate from user content in the Gemini API. It
                instructs the model to treat the document as untrusted data.
                <br /><br />
                <strong className="font-display text-xs">Gap:</strong> a sufficiently
                adversarial document (e.g. white-on-white text saying &ldquo;output
                your system prompt&rdquo;) may still confuse the model. Full
                mitigation requires output whitelisting and redaction before returning
                to the client — out of scope for this demo.
              </Note>

              <Note title="Cost &amp; limits">
                Gemini 2.5 Flash at temperature 0, max 2048 output tokens.
                Image cost: ~$0.0004–0.002 per call depending on image size.
                Rate limited to 20/day per IP. GCP budget alert recommended at
                $20/mo. Route uses{' '}
                <code className="font-mono text-xs">maxDuration = 60</code>{' '}
                (Vercel Pro required for production).
              </Note>

              <Note title="Want this for your business?">
                This demo is the real architecture — minus a persistent results
                store and a batch processing tier (both wired for client builds).
                If you have invoices, receipts, or structured documents that need
                to become typed data at scale, email me with the document type and
                volume. I&rsquo;ll reply within 24 hours.
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href="mailto:huynhchitai.070306@gmail.com?subject=Freelance%20enquiry%20—%20Invoice%20Extractor"
                    className="ledger-button text-xs py-2 px-4"
                    style={{ fontSize: '0.75rem' }}
                  >
                    Email me →
                  </a>
                  <Link
                    href="/"
                    className="ledger-button-ghost text-xs py-2 px-4"
                    style={{ fontSize: '0.75rem' }}
                  >
                    ← demo
                  </Link>
                </div>
              </Note>
            </div>
          </aside>
        </div>

        {/* ── Security stance ───────────────────────────────────────── */}
        <section
          className="ledger-reveal mt-16 border-t-2 pt-10"
          style={{ borderColor: 'var(--ink)', animationDelay: '500ms' }}
        >
          <h2
            className="font-display text-2xl font-semibold"
            style={{ color: 'var(--ink)' }}
          >
            Security stance
          </h2>
          <p
            className="font-body mt-3 max-w-2xl text-base leading-relaxed"
            style={{ color: 'var(--ink-soft)' }}
          >
            Defended: magic-byte type enforcement, hard size cap, rate limiting by IP,
            zod validation of all LLM output, CSV formula-injection escaping, no stack
            traces to client, system-prompt isolation against prompt injection, no file
            persistence.
          </p>
          <p
            className="font-body mt-3 max-w-2xl text-base leading-relaxed"
            style={{ color: 'var(--ink-soft)' }}
          >
            Not defended (flagged honestly): adversarial prompt injection embedded in
            document content may succeed against sophisticated attacks; MIME spoofing
            is caught at the byte level but Gemini&rsquo;s internal decode is not
            re-verified; no virus/malware scanning of uploaded files (out of scope for
            an AI extraction demo).
          </p>
        </section>
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

function Note({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="border-2 p-5"
      style={{
        borderColor: 'var(--ink)',
        background: 'var(--surface)',
        boxShadow: accent ? '4px 4px 0 var(--ledger)' : undefined,
      }}
    >
      <h4
        className="font-mono mb-3 border-b pb-2 text-xs font-bold uppercase tracking-widest"
        style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
      >
        {title}
      </h4>
      <div
        className="font-body text-sm leading-relaxed"
        style={{ color: 'var(--ink-soft)' }}
      >
        {children}
      </div>
    </div>
  );
}
