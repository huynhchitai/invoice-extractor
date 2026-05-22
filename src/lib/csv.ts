import Papa from 'papaparse';
import type { InvoiceData, LineItem } from './types';

type Cell = string | number | null;

/**
 * Escape a cell value to prevent CSV formula injection.
 * Cells whose string representation starts with = + - @ are prefixed with '
 * so spreadsheet apps treat them as plain text.
 */
export function escapeCell(value: Cell): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.length > 0 && '=+-@'.includes(s[0])) return `'${s}`;
  return s;
}

/** Flatten invoice line items into rows for CSV export. */
export function invoiceToCsvRows(data: InvoiceData): Record<string, string>[] {
  const meta = {
    vendor_name:     escapeCell(data.vendor.name),
    vendor_address:  escapeCell(data.vendor.address),
    vendor_tax_id:   escapeCell(data.vendor.taxId),
    invoice_number:  escapeCell(data.invoiceNumber),
    issue_date:      escapeCell(data.issueDate),
    due_date:        escapeCell(data.dueDate),
    currency:        escapeCell(data.currency),
    subtotal:        escapeCell(data.subtotal),
    tax_amount:      escapeCell(data.taxAmount),
    total:           escapeCell(data.total),
  };

  if (data.lineItems.length === 0) {
    return [{ ...meta, description: '', qty: '', unit_price: '', amount: '' }];
  }

  return data.lineItems.map((item: LineItem) => ({
    ...meta,
    description: escapeCell(item.description),
    qty:         escapeCell(item.qty),
    unit_price:  escapeCell(item.unitPrice),
    amount:      escapeCell(item.amount),
  }));
}

/** Convert an InvoiceData object to a CSV string with formula-injection escaping. */
export function invoiceDataToCsv(data: InvoiceData): string {
  const rows = invoiceToCsvRows(data);
  const fields = [
    'vendor_name', 'vendor_address', 'vendor_tax_id',
    'invoice_number', 'issue_date', 'due_date', 'currency',
    'description', 'qty', 'unit_price', 'amount',
    'subtotal', 'tax_amount', 'total',
  ];
  return Papa.unparse({ fields, data: rows }, { quotes: true });
}
