'use client';

import type { InvoiceData } from '@/lib/types';

interface Props {
  data: InvoiceData;
}

function Null() {
  return <span className="null-cell" style={{ color: 'var(--ink-quiet)', fontStyle: 'italic' }}>—</span>;
}

function Num({ value, currency }: { value: number | null; currency?: string | null }) {
  if (value === null) return <Null />;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  const sym = currency ?? '';
  return (
    <span className="tabular-nums font-mono" style={{ color: value < 0 ? 'var(--debit)' : undefined }}>
      {sym ? `${sym} ` : ''}{formatted}
    </span>
  );
}

function Str({ value }: { value: string | null | undefined }) {
  if (!value) return <Null />;
  return <span>{value}</span>;
}

export default function InvoiceTable({ data }: Props) {
  const { vendor, invoiceNumber, issueDate, dueDate, currency, lineItems, subtotal, taxAmount, total } = data;

  return (
    <div className="flex flex-col gap-8">
      {/* ── Header fields ──────────────────────────────────────────── */}
      <section>
        <div className="ledger-rule-thick" />
        <div className="mt-px ledger-rule-hair" />
        <h2
          className="font-mono mt-3 mb-4 text-xs font-bold uppercase tracking-widest"
          style={{ color: 'var(--ink-quiet)' }}
        >
          Invoice Details
        </h2>

        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
          {[
            { label: 'Vendor',         value: vendor.name },
            { label: 'Address',        value: vendor.address },
            { label: 'Tax ID',         value: vendor.taxId },
            { label: 'Invoice #',      value: invoiceNumber },
            { label: 'Issue Date',     value: issueDate },
            { label: 'Due Date',       value: dueDate },
            { label: 'Currency',       value: currency },
          ].map(({ label, value }) => (
            <div key={label} className="border-b pb-2" style={{ borderColor: 'var(--rule-soft)' }}>
              <dt className="ledger-eyebrow mb-0.5">{label}</dt>
              <dd className="font-body text-sm font-medium" style={{ color: 'var(--ink)' }}>
                <Str value={value} />
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Line items table ────────────────────────────────────────── */}
      <section>
        <div className="ledger-rule-thick" />
        <div className="mt-px ledger-rule-hair" />
        <h2
          className="font-mono mt-3 mb-4 text-xs font-bold uppercase tracking-widest"
          style={{ color: 'var(--ink-quiet)' }}
        >
          Line Items
        </h2>

        {lineItems.length === 0 ? (
          <p className="font-body text-sm italic" style={{ color: 'var(--ink-quiet)' }}>
            No line items extracted.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Description</th>
                  <th className="num">Qty</th>
                  <th className="num">Unit Price</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, i) => (
                  <tr key={i}>
                    <td>{item.description || <Null />}</td>
                    <td className="num">
                      {item.qty === null ? <Null /> : (
                        <span className="tabular-nums font-mono">{item.qty}</span>
                      )}
                    </td>
                    <td className="num"><Num value={item.unitPrice} currency={currency} /></td>
                    <td className="num"><Num value={item.amount} currency={currency} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {subtotal !== null && (
                  <tr>
                    <td className="label" colSpan={3}>Subtotal</td>
                    <td><Num value={subtotal} currency={currency} /></td>
                  </tr>
                )}
                {taxAmount !== null && (
                  <tr>
                    <td className="label" colSpan={3}>Tax</td>
                    <td><Num value={taxAmount} currency={currency} /></td>
                  </tr>
                )}
                {total !== null && (
                  <tr style={{ borderTop: '3px double var(--ink)' }}>
                    <td
                      className="label"
                      colSpan={3}
                      style={{ color: 'var(--ledger)', fontFamily: 'var(--font-display)', fontSize: '0.875rem' }}
                    >
                      Total Due
                    </td>
                    <td
                      style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem', color: 'var(--ledger)' }}
                    >
                      <Num value={total} currency={currency} />
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
