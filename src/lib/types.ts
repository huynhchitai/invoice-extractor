/** A single line item on an invoice or receipt. */
export interface LineItem {
  description: string;
  qty: number | null;
  unitPrice: number | null;
  amount: number | null;
}

/** Vendor information extracted from the document. */
export interface Vendor {
  name: string;
  address: string | null;
  taxId: string | null;
}

/** The complete structured extraction result. */
export interface InvoiceData {
  vendor: Vendor;
  invoiceNumber: string | null;
  issueDate: string | null;
  dueDate: string | null;
  currency: string | null;
  lineItems: LineItem[];
  subtotal: number | null;
  taxAmount: number | null;
  total: number | null;
}

/** Successful API response */
export interface ExtractResponse {
  ok: true;
  data: InvoiceData;
  meta: {
    filename: string;
    fileSizeBytes: number;
    mimeType: string;
    durationMs: number;
    inputTokens: number;
    outputTokens: number;
  };
}

/** Error codes the API may return */
export type ExtractErrorCode =
  | 'RATE_LIMIT'
  | 'FILE_MISSING'
  | 'FILE_TOO_LARGE'
  | 'FILE_TYPE_REJECTED'
  | 'EXTRACT_FAIL'
  | 'INVALID_OUTPUT'
  | 'INTERNAL';

/** Failed API response */
export interface ExtractError {
  ok: false;
  error: ExtractErrorCode;
  message: string;
}
