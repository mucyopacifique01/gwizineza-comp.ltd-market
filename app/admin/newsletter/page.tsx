'use client';

import { useState } from 'react';
import { DashHeader } from '@/components/dash/DashShell';
import { Button } from '@/components/ui/Button';
import { TextField, TextAreaField } from '@/components/ui/Field';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiFetch, jsonBody } from '@/lib/http';
import { useApi } from '@/lib/use-api';

type Subscriber = { id: string; email: string; createdAt: string };
type SubscriberResponse = { subscribers: Subscriber[]; count?: number };

export default function AdminNewsletterPage() {
  const { data, error, loading, reload } = useApi<SubscriberResponse>('/api/admin/newsletter/subscribers', { loginPath: '/admin/login' });
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [sendError, setSendError] = useState('');

  async function sendCampaign() {
    setNotice('');
    setSendError('');
    if (!subject.trim() || !message.trim()) {
      setSendError('Enter an email subject and message before sending.');
      return;
    }
    const count = data?.subscribers.length ?? 0;
    if (!count) {
      setSendError('There are no active subscribers to email.');
      return;
    }
    if (!window.confirm(`Send this email to ${count} subscribed customer${count === 1 ? '' : 's'}? This will send a real email campaign.`)) return;
    setSending(true);
    try {
      const result = await apiFetch<{ ok: boolean; sent: number; message: string }>('/api/admin/newsletter/send', {
        method: 'POST',
        body: jsonBody({ subject: subject.trim(), message: message.trim() }),
      });
      setNotice(`Campaign submitted successfully to ${result.sent} recipient(s).`);
      setSubject('');
      setMessage('');
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'The campaign could not be sent.');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <DashHeader eyebrow="Customer communication" title="Newsletter campaigns" description="Send market news and offers to customers who subscribed through the storefront." actions={<Button icon="refresh" variant="outline" onClick={() => void reload()}>Refresh subscribers</Button>} />
      {loading && !data ? <Skeleton height={180} radius={20} /> : error ? <ErrorState title="Subscribers unavailable" description={error}><Button icon="refresh" onClick={() => void reload()}>Retry</Button></ErrorState> : (
        <div className="stack" style={{ gap: 20 }}>
          <section className="card">
            <div className="row-between wrap">
              <div><span className="eyebrow">Opted-in audience</span><h2 className="card-title" style={{ marginTop: 8 }}>Active subscribers</h2><p className="muted small">Only active newsletter subscribers are eligible for campaigns.</p></div>
              <div className="stat-card stat-green"><span className="stat-label">Ready to receive updates</span><strong className="stat-value">{data?.count ?? data?.subscribers.length ?? 0}</strong></div>
            </div>
            {!data?.subscribers.length ? <EmptyState art="orders" title="No subscribers yet" description="Customers who subscribe in the website footer will appear here." /> : (
              <div className="table-wrap" style={{ marginTop: 16 }}>
                <table className="table"><thead><tr><th>Email address</th><th>Subscribed</th><th>Status</th></tr></thead>
                  <tbody>{data.subscribers.map(s => <tr key={s.id}><td>{s.email}</td><td className="muted">{new Date(s.createdAt).toLocaleDateString()}</td><td><span className="badge badge-green">Subscribed</span></td></tr>)}</tbody>
                </table>
                {(data.count ?? data.subscribers.length) > data.subscribers.length && <p className="muted small" style={{ marginTop: 12 }}>Showing the first {data.subscribers.length} subscribers. The campaign can include up to 1,000 active subscribers per send.</p>}
              </div>
            )}
          </section>

          <section className="card">
            <div className="card-head"><div><h2 className="card-title">Compose an email</h2><p className="muted small">Messages are sent through Resend using the verified sender configured on the Django service.</p></div></div>
            {notice && <div className="alert alert-success" role="status">{notice}</div>}
            {sendError && <div className="alert alert-warn" role="alert">{sendError}</div>}
            <div className="stack" style={{ gap: 16 }}>
              <TextField label="Email subject" value={subject} onChange={e => setSubject(e.target.value)} maxLength={180} required placeholder="New products and offers from Gwizineza Market" />
              <TextAreaField label="Message" value={message} onChange={e => setMessage(e.target.value)} maxLength={10000} required rows={8} hint="Plain text is supported. Line breaks are preserved in the email." placeholder="Hello from Gwizineza Market...\n\nShare your latest products, offers, or market news." />
              <div className="row-between wrap"><p className="muted small">Sending is a real action. Review the message and recipient count before confirming.</p><Button icon="send" loading={sending} disabled={!data?.subscribers.length || sending} onClick={() => void sendCampaign()}>Send to subscribers</Button></div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
