# Invoice Extractor

Upload an invoice or receipt — get clean structured data: vendor, line items, totals, tax.

> Portfolio Project #4 · [Tai Huynh](https://github.com/0CCHacker)

---

## Demo

Upload any of the following:

- A photo of a paper invoice (PNG/JPEG)
- A vendor-generated PDF invoice
- A receipt image from a phone camera (WEBP/JPEG)

The tool extracts: vendor name, address, tax ID, invoice number, issue date, due date,
currency, every line item (description, qty, unit price, amount), subtotal, tax, and total.
Export to CSV (Excel/Sheets-ready) or JSON.

---

## Stack

- **Framework** — Next.js 14 (App Router, `src/` directory)
- **Language** — TypeScript, `strict: true`
- **AI** — Vertex AI — Gemini 2.5 Flash (multimodal / vision via `inlineData`)
- **Validation** — zod 4 for LLM output validation and number coercion
- **Rate limit** — Upstash Redis, sliding window 20/day per IP
- **CSV export** — PapaParse with formula-injection escaping
- **Tests** — Vitest (magic-byte filetype detection spec)
- **Fonts** — Zilla Slab (display slab), Libre Franklin (body), JetBrains Mono
- **Styling** — Tailwind CSS 3 + CSS variables; cream ledger paper + graph-paper grid
- **Deploy** — Vercel

---

## Run locally

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local — set GOOGLE_CLOUD_PROJECT and credentials

# 3. Start dev server
pnpm dev
# → http://localhost:3000
```

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_CLOUD_PROJECT` | Yes | GCP project ID |
| `GOOGLE_CLOUD_REGION` | No | Defaults to `us-central1` |
| `GOOGLE_APPLICATION_CREDENTIALS` | One of two | Path to service-account JSON key |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | One of two | Full key JSON, single-line (for Vercel) |
| `UPSTASH_REDIS_REST_URL` | No | Rate limiting (graceful no-op without it) |
| `UPSTASH_REDIS_REST_TOKEN` | No | Rate limiting |

---

## Tests

```bash
pnpm test
```

Vitest covers `src/lib/filetype.ts` — the security-critical magic-byte detection module.
Tests include: correct detection of PNG/JPEG/WEBP/PDF, rejection of spoofed/misnamed
files, edge cases (empty buffer, < 4 bytes, RIFF non-WEBP, random garbage).

```bash
pnpm typecheck   # tsc --noEmit
pnpm lint        # next lint
```

---

## Pipeline at a glance

```
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
```

---

## Security stance

**Defended:**

- **Magic-byte enforcement** — the browser-supplied `Content-Type` header is never trusted.
  The first 12 bytes of the buffer are inspected for PNG (`89 50 4E 47`), JPEG (`FF D8 FF`),
  WEBP (`RIFF....WEBP`), and PDF (`%PDF`). Any other signature → 415.
- **Hard size cap** — 8 MB, enforced before reading into memory (prevents memory exhaustion).
- **Rate limiting** — 20 requests/IP/day via Upstash sliding window; graceful no-op when
  Upstash is unconfigured.
- **Zod validation of LLM output** — every field coerced and type-checked. A string like
  `"$1,234.56"` becomes `1234.56`; malformed output → typed 502, not a raw exception.
- **CSV formula-injection escaping** — cells starting with `= + - @` are prefixed with `'`
  before being written to CSV.
- **No stack traces to client** — all errors return typed `{ ok: false, error: CODE }`.
- **Prompt isolation** — the system prompt is sent via `systemInstruction` (structurally
  separate from user content); explicitly instructs the model to treat document content as
  data, not instructions.
- **No file persistence** — the buffer lives only in serverless function memory; nothing
  written to disk or object storage.

**Known gaps (honest disclosure):**

- **Adversarial prompt injection** — a sufficiently sophisticated document (white-on-white
  hidden text, invisible characters) may still influence the model. Full mitigation requires
  output redaction/whitelisting. Flagging the gap rather than hiding it.
- **No malware scanning** — uploaded files are not checked against antivirus/ClamAV. This
  is a known omission acceptable for a demo; a production build would add a scanning layer.
- **Gemini internal decode unverified** — magic bytes are checked on the raw upload buffer;
  after Gemini base64-decodes the data internally, that decode is not re-verified. Considered
  low-risk because Gemini processes the data in an isolated environment.

---

## Known limits

- PDF support depends on Gemini's PDF parsing; complex multi-page PDFs with unusual
  formatting may produce partial extractions.
- The number coercion heuristic handles common currency formats (USD, EU) but may
  mis-parse exotic numeric formats (e.g. Indian lakh notation: `1,23,456.00`).
- No batch processing — one file per request. A batch tier (queue + background worker)
  is the natural next step for client builds.
- Line items with wrapped text or unusual table layouts may be partially missed.
