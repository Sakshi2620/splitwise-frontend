import React from 'react';

const fmtInr = (p) =>
  (p / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

export default function PaymentHistory({ payments }) {
  if (!payments?.length) {
    return (
      <div className="empty" style={{ padding: '18px 0' }}>
        <div className="empty-title">No payments yet</div>
        <div className="empty-sub">Record a partial or full payment to begin.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {payments.map((payment) => (
        <div
          key={payment.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r2)',
            padding: 14,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, color: 'var(--green)' }}>
              {fmtInr(payment.amount_paise)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
              {payment.payment_type || 'Partial'} payment
            </div>
            {payment.note && (
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                {payment.note}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right', minWidth: 140 }}>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              {new Date(payment.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>
              {payment.paid_by?.name || 'You'} → {payment.paid_to?.name || 'Receiver'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
