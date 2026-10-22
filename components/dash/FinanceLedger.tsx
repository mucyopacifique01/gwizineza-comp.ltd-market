'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { DashHeader, StatCard } from '@/components/dash/DashShell';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiFetch, jsonBody } from '@/lib/http';
import { formatDate, formatRwf } from '@/lib/format';
import { useToast } from '@/components/ui/Toast';

type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'CANCELLED' | 'FAILED';
type PaymentMethod = 'COD' | 'MOMO' | 'AIRTEL' | 'CARD';
type TransitionStatus = 'PAID' | 'REFUNDED' | 'CANCELLED' | 'FAILED';

type LedgerEvent = {
  id: string;
  action: string;
  at: string;
  actor: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string;
  providerRef?: string;
  refundReference?: string;
  confirmedExternally: boolean;
  failureReason?: string;
};

type LedgerPayment = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  orderStatus: string;
  orderTotalRwf: number;
  method: PaymentMethod;
  status: PaymentStatus;
  amountRwf: number;
  currency: string;
  provider: string | null;
  providerRef: string | null;
  createdAt: string;
  updatedAt: string;
  orderCreatedAt: string;
  history: LedgerEvent[];
};

type FinanceSummary = {
  paidRwf: number;
  pendingRwf: number;
  refundedRwf: number;
  cancelledRwf: number;
  failedRwf: number;
  orders: number;
};

type LedgerResponse = {
  summary: FinanceSummary;
  payments: LedgerPayment[];
  paymentCount: number;
  totalPayments: number;
  page: number;
  pageSize: number;
  providerIntegration: string;
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PAID', label: 'Paid' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'FAILED', label: 'Failed' },
];

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  REFUNDED: 'Refunded',
  CANCELLED: 'Cancelled',
  FAILED: 'Failed',
};

const FAILURE_REASONS: { value: string; label: string }[] = [
  { value: 'PROVIDER_DECLINED', label: 'Provider declined the transaction' },
  { value: 'INSUFFICIENT_FUNDS', label: 'Insufficient funds' },
  { value: 'CUSTOMER_ABORTED', label: 'Customer cancelled the payment attempt' },
  { value: 'TIMEOUT', label: 'Transaction timed out or no response' },
  { value: 'REFERENCE_MISMATCH', label: 'Transaction reference could not be matched' },
  { value: 'OTHER', label: 'Other reason (explain below)' },
];

function failureReasonLabel(value?: string) {
  return FAILURE_REASONS.find(reason => reason.value === value)?.label ?? value ?? '';
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  COD: 'Cash on delivery',
  MOMO: 'MTN Mobile Money',
  AIRTEL: 'Airtel Money',
  CARD: 'Card',
};

function StatusPill({ status }: { status: string }) {
  return <span className={`finance-status finance-status-${status.toLowerCase()}`}>{STATUS_LABEL[status] ?? status}</span>;
}

function transitionLabel(status: TransitionStatus) {
  if (status === 'PAID') return 'Confirm payment received';
  if (status === 'REFUNDED') return 'Record refund';
  if (status === 'CANCELLED') return 'Cancel pending payment';
  return 'Record failed payment';
}

function relativeStatus(payment: LedgerPayment) {
  if (payment.status === 'PENDING') return 'Awaiting payment confirmation';
  if (payment.status === 'PAID') return 'Payment confirmed';
  if (payment.status === 'REFUNDED') return 'Refund recorded';
  if (payment.status === 'CANCELLED') return 'Payment cancelled';
  return 'Payment failed';
}

export default function FinanceLedgerPage() {
  const toast = useToast();
  const [data, setData] = useState<LedgerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchDraft, setSearchDraft] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<LedgerPayment | null>(null);
  const [targetStatus, setTargetStatus] = useState<TransitionStatus | null>(null);
  const [note, setNote] = useState('');
  const [reference, setReference] = useState('');
  const [externalConfirmation, setExternalConfirmation] = useState(false);
  const [failureReason, setFailureReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setLoadError('');
    const params = new URLSearchParams({ page: String(page), pageSize: '25', status: statusFilter });
    if (query) params.set('q', query);
    try {
      const result = await apiFetch<LedgerResponse>(`/api/admin/finance?${params.toString()}`, { signal });
      if (!signal.aborted) setData(result);
    } catch (error) {
      if (!signal.aborted) setLoadError(error instanceof Error ? error.message : 'Could not load the payment ledger.');
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [page, query, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, reloadKey]);

  const summary = data?.summary;
  const currentRange = useMemo(() => {
    const total = data?.totalPayments ?? 0;
    if (!total) return 'No transactions found';
    const first = (page - 1) * (data?.pageSize ?? 25) + 1;
    const last = Math.min(page * (data?.pageSize ?? 25), total);
    return `Showing ${first}–${last} of ${total} matching transactions`;
  }, [data, page]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setQuery(searchDraft.trim());
  }

  function startTransition(payment: LedgerPayment, status: TransitionStatus) {
    setSelected(payment);
    setTargetStatus(status);
    setNote('');
    setReference('');
    setExternalConfirmation(false);
    setFailureReason('');
  }

  function showHistory(payment: LedgerPayment) {
    setSelected(payment);
    setTargetStatus(null);
    setNote('');
    setReference('');
    setExternalConfirmation(false);
    setFailureReason('');
  }

  function closePanel() {
    setSelected(null);
    setTargetStatus(null);
    setNote('');
    setReference('');
    setExternalConfirmation(false);
    setFailureReason('');
  }

  async function saveTransition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !targetStatus) return;
    setSaving(true);
    try {
      const result = await apiFetch<{ payment: LedgerPayment; message: string }>('/api/admin/finance', {
        method: 'PATCH',
        body: jsonBody({
          id: selected.id,
          status: targetStatus,
          note: note.trim(),
          providerRef: reference.trim(),
          externalConfirmation,
          failureReason,
        }),
      });
      setSelected(current => {
        const latestEvent = result.payment.history?.[0];
        const priorHistory = current?.id === result.payment.id ? (current.history ?? []) : [];
        const history = latestEvent
          ? [...priorHistory.filter(event => event.id !== latestEvent.id), latestEvent]
          : priorHistory;
        return { ...result.payment, history };
      });
      setTargetStatus(null);
      setNote('');
      setReference('');
      setExternalConfirmation(false);
      setFailureReason('');
      setReloadKey(value => value + 1);
      toast.show(result.message || 'Payment ledger updated');
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Could not update this payment', { tone: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const pageCount = Math.max(1, Math.ceil((data?.totalPayments ?? 0) / (data?.pageSize ?? 25)));

  return (
    <>
      <DashHeader
        eyebrow="Owner finance"
        title="Finance & settlements"
        description="Review individual payments, reconcile receipts, record refunds and keep a traceable history of every ledger change."
        actions={<Button variant="outline" icon="refresh" loading={loading} onClick={() => setReloadKey(value => value + 1)}>Refresh ledger</Button>}
      />

      <div className="alert alert-warn finance-disclaimer" role="note">
        <Icon name="shield" size={18} />
        <span><strong>Manual reconciliation mode.</strong> MTN Mobile Money, Airtel Money and card processing are not connected yet. These actions record payments or refunds that you have already verified outside this website; they do not charge a customer or send money.</span>
      </div>

      {summary && (
        <div className="stat-grid finance-stat-grid">
          <StatCard label="Paid and retained" value={formatRwf(summary.paidRwf)} icon="check" tone="green" hint="Records currently marked paid" />
          <StatCard label="Awaiting confirmation" value={formatRwf(summary.pendingRwf)} icon="clock" tone="sun" hint="Not yet confirmed as received" />
          <StatCard label="Refunded" value={formatRwf(summary.refundedRwf)} icon="refresh" tone="sky" hint="Full refunds recorded in the ledger" />
          <StatCard label="Cancelled" value={formatRwf(summary.cancelledRwf)} icon="x" tone="clay" hint="Pending payments cancelled" />
          <StatCard label="Failed" value={formatRwf(summary.failedRwf)} icon="alert" hint="Payments recorded as failed" />
        </div>
      )}

      <section className="card finance-ledger-card">
        <div className="card-head finance-ledger-head">
          <div>
            <h2 className="card-title">Payment ledger</h2>
            <p className="muted small">Search by order, customer, phone or transaction reference. Select a row to review its audit history.</p>
          </div>
          {data && <span className="badge">{data.paymentCount} total records</span>}
        </div>

        <form className="dash-toolbar finance-filters" onSubmit={search}>
          <label className="input-group grow finance-search">
            <Icon name="search" size={18} />
            <input className="input" placeholder="Order, customer, phone or reference" value={searchDraft} onChange={event => setSearchDraft(event.target.value)} aria-label="Search payment ledger" />
          </label>
          <label className="finance-filter-label">
            <span className="sr-only">Filter payment status</span>
            <select className="select" value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setPage(1); }}>
              {STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <Button type="submit" icon="search">Search</Button>
        </form>

        {loading && !data ? <Skeleton height={360} radius={16} /> : loadError ? (
          <div className="alert alert-error finance-load-error" role="alert">
            <span>{loadError}</span>
            <Button variant="outline" size="sm" onClick={() => setReloadKey(value => value + 1)}>Try again</Button>
          </div>
        ) : data && data.payments.length ? (
          <>
            <div className="table-wrap finance-table-wrap">
              <table className="table finance-table">
                <thead>
                  <tr><th>Order / customer</th><th>Method</th><th className="num">Amount</th><th>Status</th><th>Last updated</th><th className="finance-actions-col">Actions</th></tr>
                </thead>
                <tbody>
                  {data.payments.map(payment => (
                    <tr key={payment.id}>
                      <td>
                        <Link className="finance-order-link" href={`/admin/orders?q=${encodeURIComponent(payment.orderNumber)}`}>{payment.orderNumber}</Link>
                        <strong className="finance-customer-name">{payment.customerName}</strong>
                        <span className="muted tiny finance-customer-phone">{payment.customerPhone}</span>
                      </td>
                      <td>
                        <span>{METHOD_LABEL[payment.method] ?? payment.method}</span>
                        {payment.providerRef && <span className="muted tiny finance-reference">Ref: {payment.providerRef}</span>}
                      </td>
                      <td className="num"><strong>{formatRwf(payment.amountRwf)}</strong><span className="muted tiny finance-reference">Order: {formatRwf(payment.orderTotalRwf)}</span></td>
                      <td><StatusPill status={payment.status} /><span className="muted tiny finance-reference">{relativeStatus(payment)}</span></td>
                      <td><span>{formatDate(payment.updatedAt, true)}</span><span className="muted tiny finance-reference">Created {formatDate(payment.createdAt, true)}</span></td>
                      <td>
                        <div className="finance-row-actions">
                          {payment.status === 'PENDING' && <>
                            <Button size="sm" onClick={() => startTransition(payment, 'PAID')} icon="check">Confirm paid</Button>
                            <Button size="sm" variant="outline" onClick={() => startTransition(payment, 'CANCELLED')}>Cancel</Button>
                            <Button size="sm" variant="ghost" onClick={() => startTransition(payment, 'FAILED')} icon="alert">Record failure</Button>
                          </>}
                          {payment.status === 'PAID' && <Button size="sm" variant="outline" onClick={() => startTransition(payment, 'REFUNDED')} icon="refresh">Record refund</Button>}
                          {['FAILED', 'CANCELLED'].includes(payment.status) && <span className="muted tiny">Closed</span>}
                          {payment.status === 'REFUNDED' && <span className="muted tiny">Refund recorded</span>}
                          <Button size="sm" variant="ghost" onClick={() => showHistory(payment)} icon="receipt">History</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="finance-pagination">
              <p className="muted small">{currentRange}</p>
              <div className="row wrap">
                <Button size="sm" variant="outline" icon="arrowLeft" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>Previous</Button>
                <span className="muted small">Page {page} of {pageCount}</span>
                <Button size="sm" variant="outline" iconRight="arrowRight" disabled={page >= pageCount} onClick={() => setPage(value => Math.min(pageCount, value + 1))}>Next</Button>
              </div>
            </div>
          </>
        ) : (
          <div className="fig-empty finance-empty">
            <Icon name="receipt" size={32} />
            <h3>No payment records found</h3>
            <p>{query || statusFilter !== 'ALL' ? 'Try another search or select a different status.' : 'Payment records appear here after customers place orders.'}</p>
          </div>
        )}
      </section>

      {selected && (
        <section className="card finance-detail-panel" aria-labelledby="finance-detail-title">
          <div className="card-head finance-ledger-head">
            <div>
              <span className="eyebrow">Payment record</span>
              <h2 className="card-title" id="finance-detail-title">{selected.orderNumber}</h2>
              <p className="muted small">{selected.customerName} · {selected.customerPhone} · {formatRwf(selected.amountRwf)}</p>
            </div>
            <Button variant="ghost" size="sm" icon="x" onClick={closePanel}>Close</Button>
          </div>

          {targetStatus ? (
            <form className="finance-action-form" onSubmit={event => void saveTransition(event)}>
              <div className="alert alert-warn" role="note">
                <Icon name="alert" size={18} />
                <span><strong>{transitionLabel(targetStatus)}.</strong> {targetStatus === 'PAID'
                  ? 'Verify the receipt or cash collection before confirming payment.'
                  : targetStatus === 'REFUNDED'
                    ? 'Verify that the refund has already been sent outside this website.'
                    : targetStatus === 'FAILED'
                      ? 'Use this only after the payment attempt was unsuccessful. The order remains separate from this payment status, and no provider action is triggered.'
                      : 'Cancel the pending payment record when the attempt will not continue.'}</span>
              </div>
              {targetStatus === 'PAID' && selected.method !== 'COD' && (
                <label className="field">
                  <span className="field-label">Verified transaction reference <span aria-hidden="true">*</span></span>
                  <input className="input" required maxLength={180} value={reference} onChange={event => setReference(event.target.value)} placeholder="Enter the reference from the provider receipt" />
                  <span className="field-hint">Required for Mobile Money and card payments so the receipt can be reconciled later.</span>
                </label>
              )}
              {targetStatus === 'FAILED' && (
                <>
                  <label className="field">
                    <span className="field-label">Failure reason <span aria-hidden="true">*</span></span>
                    <select className="select" required value={failureReason} onChange={event => setFailureReason(event.target.value)}>
                      <option value="">Choose why the payment failed</option>
                      {FAILURE_REASONS.map(reason => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
                    </select>
                    <span className="field-hint">This categorises the failure for reporting and helps the owner review repeated issues.</span>
                  </label>
                  {selected.method !== 'COD' && (
                    <label className="field">
                      <span className="field-label">Provider reference (if available)</span>
                      <input className="input" maxLength={180} value={reference} onChange={event => setReference(event.target.value)} placeholder="Provider request ID or failed transaction reference" />
                    </label>
                  )}
                </>
              )}
              {targetStatus === 'REFUNDED' && (
                <label className="field">
                  <span className="field-label">Refund reference (recommended)</span>
                  <input className="input" maxLength={180} value={reference} onChange={event => setReference(event.target.value)} placeholder="Bank, cash or mobile-money refund receipt/reference" />
                </label>
              )}
              {targetStatus === 'PAID' && selected.method === 'COD' && (
                <label className="field">
                  <span className="field-label">Receipt or cash reference (optional)</span>
                  <input className="input" maxLength={180} value={reference} onChange={event => setReference(event.target.value)} placeholder="Receipt number, if available" />
                </label>
              )}
              <label className="field">
                <span className="field-label">{targetStatus === 'REFUNDED' ? 'Refund reason and record details' : targetStatus === 'PAID' ? 'Payment confirmation note' : targetStatus === 'FAILED' ? 'Failure details' : 'Cancellation reason'} <span aria-hidden="true">*</span></span>
                <textarea className="textarea" rows={3} minLength={5} maxLength={500} required value={note} onChange={event => setNote(event.target.value)} placeholder={targetStatus === 'REFUNDED' ? 'Explain why the refund was made and how it was verified.' : targetStatus === 'PAID' ? 'Example: Matched to the MTN transaction and receipt on 22 Oct.' : targetStatus === 'FAILED' ? 'Example: Provider returned a declined response; customer was advised to retry.' : 'Explain why this pending payment is being cancelled.'} />
              </label>
              {(targetStatus === 'PAID' || targetStatus === 'REFUNDED') && (
                <label className="finance-confirmation">
                  <input type="checkbox" checked={externalConfirmation} onChange={event => setExternalConfirmation(event.target.checked)} required />
                  <span>{targetStatus === 'PAID'
                    ? 'I have verified that the money was actually received outside this website.'
                    : 'I have already sent the refund outside this website and verified the refund transaction.'}</span>
                </label>
              )}
              <div className="row wrap finance-form-actions">
                <Button type="submit" loading={saving} disabled={saving || note.trim().length < 5 || (targetStatus === 'FAILED' && !failureReason) || ((targetStatus === 'PAID' || targetStatus === 'REFUNDED') && !externalConfirmation)}>{targetStatus === 'FAILED' ? 'Record failed payment' : 'Save ledger change'}</Button>
                <Button type="button" variant="outline" disabled={saving} onClick={() => setTargetStatus(null)}>Cancel</Button>
              </div>
            </form>
          ) : (
            <div className="finance-detail-summary">
              <div><span className="muted small">Payment status</span><p><StatusPill status={selected.status} /></p></div>
              <div><span className="muted small">Payment method</span><strong>{METHOD_LABEL[selected.method] ?? selected.method}</strong></div>
              <div><span className="muted small">Provider reference</span><strong>{selected.providerRef || 'Not recorded'}</strong></div>
              {selected.status === 'PENDING' && <Button onClick={() => startTransition(selected, 'PAID')} icon="check">Confirm payment received</Button>}
              {selected.status === 'PAID' && <Button variant="outline" onClick={() => startTransition(selected, 'REFUNDED')} icon="refresh">Record refund</Button>}
            </div>
          )}

          <div className="finance-history">
            <h3>Audit history</h3>
            {selected.history?.length ? (
              <ol className="finance-timeline">
                {selected.history.map(event => (
                  <li key={event.id}>
                    <span className="finance-timeline-dot" />
                    <div className="finance-timeline-head">
                      <strong>{event.toStatus ? (STATUS_LABEL[event.toStatus] ?? event.toStatus) : event.action.replace('payment.', '')}</strong>
                      <span className="muted tiny">{event.at ? formatDate(event.at, true) : 'Timestamp unavailable'}</span>
                    </div>
                    <p className="muted small">{event.note || 'No note was recorded.'}</p>
                    {event.failureReason && <p className="finance-history-reason"><strong>Failure reason:</strong> {failureReasonLabel(event.failureReason)}</p>}
                    <span className="muted tiny">By {event.actor}{event.providerRef ? ` · Payment ref: ${event.providerRef}` : ''}{event.refundReference ? ` · Refund ref: ${event.refundReference}` : ''}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted small">No previous ledger actions were recorded for this payment.</p>
            )}
          </div>
          <p className="muted tiny finance-order-linkout"><Link href={`/orders/${selected.orderNumber}`} target="_blank">Open customer order receipt <Icon name="external" size={13} /></Link></p>
        </section>
      )}
    </>
  );
}
