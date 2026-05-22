# Security — Invoice Extractor

This document describes the threat model, the controls implemented, and the residual
gaps for Invoice Extractor (Portfolio Project #4 · Tai Huynh).

---

## Threat model

Invoice Extractor accepts file uploads from anonymous browser clients and passes them to
an AI vision model. The primary threat surface is:

1. **Malicious file uploads** — content-type spoofing, oversized files, executable payloads
   disguised as images/PDFs.
2. **Prompt injection** — a document that embeds adversarial instructions intended to
   hijack the LLM's output or leak the system prompt.
3. **Resource abuse** — high-volume requests draining Vertex AI quota and GCP billing.
4. **CSV injection** — extracted text that, when opened in a spreadsheet, executes a formula.
5. **LLM output misuse** — malformed or out-of-schema model output causing downstream
   type errors or panics.

---

## Controls implemented

### 1. Magic-byte file-type detection

`src/lib/filetype.ts` inspects raw bytes 0–11 of every upload buffer:

| Type | Signature bytes |
|------|----------------|
| PNG  | `89 50 4E 47` |
| JPEG | `FF D8 FF` |
| WEBP | `52 49 46 46 xx xx xx xx 57 45 42 50` |
| PDF  | `25 50 44 46` (`%PDF`) |

The browser-supplied `Content-Type` header is **never trusted**. A file with PNG bytes
but a `application/pdf` content-type is accepted as PNG. A file with an unknown signature
is rejected with 415 regardless of its extension or MIME type.

Covered by Vitest spec in `src/lib/__tests__/filetype.test.ts`.

### 2. Hard size cap

8 MB enforced on `file.size` before the `ArrayBuffer` is read into memory. Returns 413
with a human-readable size in the error message. Prevents memory-exhaustion DoS.

### 3. Rate limiting

Upstash Redis sliding window: 20 requests per IP per day (prefix: `rl:invoice`). Returns
429 with a retry message. Graceful no-op when `UPSTASH_REDIS_REST_*` is not configured —
does not fail open in a security-relevant way because the main control against abuse is
the GCP budget alert, not the rate limiter alone.

### 4. Zod validation of LLM output

Every field returned by Gemini is validated by `src/lib/schema.ts`. A custom
`coercedNumber` transformer:
- Strips currency symbols (`$`, `€`, `£`, etc.)
- Removes thousands-separator commas (`1,234` → `1234`)
- Handles EU decimal commas (`1.234,56` → `1234.56`)
- Returns `null` for empty / non-numeric values

Invalid output (e.g. Gemini returns an array where an object is expected) results in a
typed 502 error — the raw zod error message is **never sent to the client**.

### 5. CSV formula-injection escaping

`src/lib/csv.ts` `escapeCell()` prefixes any cell whose string form begins with
`=`, `+`, `-`, or `@` with a literal apostrophe `'`. This renders the cell as plain
text in Excel, Google Sheets, and LibreOffice Calc.

Example: a vendor name of `=HYPERLINK("http://attacker.com")` becomes
`'=HYPERLINK("http://attacker.com")` in the output CSV.

### 6. No stack traces to client

All API error responses are typed as `{ ok: false, error: ExtractErrorCode, message: string }`.
The detailed error (including any exception stack) is logged server-side via `console.error`
and never included in the HTTP response body.

### 7. Prompt isolation

The extraction system prompt is passed via the Gemini `systemInstruction` field —
structurally separate from the user-supplied document content in the API request. The
system prompt explicitly instructs the model to treat the document as untrusted data and
not to follow any instructions embedded within it.

### 8. No file persistence

The uploaded buffer lives only in the serverless function's memory. Nothing is written
to disk, object storage (GCS/S3), or a database. The buffer is garbage-collected when
the invocation ends.

### 9. Secrets server-only

Service-account credentials (`GOOGLE_APPLICATION_CREDENTIALS_JSON`) are read only in
server-side code (`src/lib/vertex.ts`). They are never bundled into the client JavaScript.
The `.gitignore` explicitly excludes `gcp-key.json`, `*-service-account*.json`, and
`credentials.json`.

---

## Residual gaps (honest disclosure)

| Gap | Severity | Notes |
|-----|----------|-------|
| Adversarial prompt injection | Medium | Sophisticated documents (hidden text, invisible characters) may influence model output despite system-prompt isolation. Full mitigation: output whitelisting + redaction. Out of scope for demo. |
| No malware scanning | Medium | Uploaded files are not scanned by antivirus/ClamAV. An attacker cannot execute the file via the API (Gemini processes it in isolation), but a future feature that re-serves the file to other users would need scanning. |
| Gemini internal decode unverified | Low | Magic bytes are checked on the upload buffer; after Gemini decodes the base64 internally, that decode is not re-checked. Considered acceptable because Gemini's processing is sandboxed. |
| DNS rebinding (N/A) | N/A | Not applicable — this service does not fetch user-supplied URLs. |
| TOCTOU on file.size | Very low | `file.size` from the `File` object is reported by the browser and checked before reading the buffer. A malicious client could lie about size. Mitigation: the `ArrayBuffer.byteLength` could be re-checked after read; currently not done. |

---

## Reporting

Found a security issue? Email [huynhchitai.070306@gmail.com](mailto:huynhchitai.070306@gmail.com).
This is a portfolio demo — there is no bug bounty program, but responsible disclosure is
appreciated and will be credited.
