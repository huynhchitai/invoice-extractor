import { z } from 'zod';

// ── Zod schema for validating LLM output ────────────────────────────────────

/**
 * Coerce a value to number or null.
 * Handles strings like "$1,234.56", "1.234,56" (EU), bare numbers, null/undefined.
 */
function coerceNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isFinite(val) ? val : null;
  if (typeof val === 'string') {
    // Strip currency symbols, spaces, and handle comma/dot ambiguity
    const cleaned = val
      .replace(/[^\d.,\-]/g, '')   // keep digits, commas, dots, minus
      .replace(/,(?=\d{3})/g, '')  // remove thousands-separator commas (1,234)
      .replace(/\.(?=\d{3}(?:[.,]|$))/g, '') // remove thousands-separator dots (1.234)
      .replace(',', '.');           // treat remaining comma as decimal separator
    const n = parseFloat(cleaned);
    return isFinite(n) ? n : null;
  }
  return null;
}

const coercedNumber = z.unknown().transform(coerceNumber);

const lineItemSchema = z.object({
  description: z.string().default(''),
  qty:         coercedNumber,
  unitPrice:   coercedNumber,
  amount:      coercedNumber,
});

const vendorSchema = z.object({
  name:    z.string().default(''),
  address: z.string().nullable().optional().transform((v) => v ?? null),
  taxId:   z.string().nullable().optional().transform((v) => v ?? null),
});

export const invoiceOutputSchema = z.object({
  vendor:        vendorSchema,
  invoiceNumber: z.string().nullable().optional().transform((v) => v ?? null),
  issueDate:     z.string().nullable().optional().transform((v) => v ?? null),
  dueDate:       z.string().nullable().optional().transform((v) => v ?? null),
  currency:      z.string().nullable().optional().transform((v) => v ?? null),
  lineItems:     z.array(lineItemSchema).default([]),
  subtotal:      coercedNumber,
  taxAmount:     coercedNumber,
  total:         coercedNumber,
});

export type InvoiceOutput = z.infer<typeof invoiceOutputSchema>;

// ── Gemini responseSchema (OpenAPI subset Gemini accepts) ───────────────────

export const GEMINI_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    vendor: {
      type: 'object',
      properties: {
        name:    { type: 'string' },
        address: { type: 'string', nullable: true },
        taxId:   { type: 'string', nullable: true },
      },
      required: ['name'],
    },
    invoiceNumber: { type: 'string', nullable: true },
    issueDate:     { type: 'string', nullable: true },
    dueDate:       { type: 'string', nullable: true },
    currency:      { type: 'string', nullable: true },
    lineItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          qty:         { type: 'number', nullable: true },
          unitPrice:   { type: 'number', nullable: true },
          amount:      { type: 'number', nullable: true },
        },
        required: ['description'],
      },
    },
    subtotal:  { type: 'number', nullable: true },
    taxAmount: { type: 'number', nullable: true },
    total:     { type: 'number', nullable: true },
  },
  required: ['vendor', 'lineItems'],
} as const;
