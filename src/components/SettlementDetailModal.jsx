import React, { useEffect, useState } from 'react';
import { X, CheckCircle, CreditCard, ChevronRight } from 'lucide-react';
import { paySettlement } from '../api';
import PaymentHistory from './PaymentHistory';
import toast from 'react-hot-toast';

const fmtInr = (p) =>
  (p / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

export default function SettlementDetailModal({ settlement: initial, loading, onClose, onPaid }) {
  const [settlement, setSettlement] = useState(initial);
  const [mode, setMode] = useState(null);
  const [partialAmt, setPartialAmt] = useState('');
  const [note, setNote] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    setSettlement(initial);
    setMode(null);
    setPartialAmt('');
    setNote('');
  }, [initial]);

  if (loading || !settlement) {
    return (
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ maxWidth: 520, padding: 24, textAlign: 'center' }}>
          <div className="modal-title" style={{ marginBottom: 16 }}>Loading settlement details…</div>
          <div style={{ color: 'var(--text3)' }}>Please wait while we load the settlement information.</div>
        </div>
      </div>
    );
  }

  const remaining = settlement.remaining_paise;
  const progress = settlement.total_paise > 0
    ? Math.round((settlement.paid_paise / settlement.total_paise) * 100)
    : 0;

  const statusColor = {
    pending: 'var(--accent2)',
    partial: 'var(--amber)',
    completed: 'var(--green)',
  }[settlement.status] || 'var(--text2)';

  const statusLabel = {
    pending: '⏳ Pending Settlement',
    partial: '🔄 Partially Paid',
    completed: '✅ Settlement Completed',
  }[settlement.status];

  const handlePay = async (amount_paise) => {
    if (!amount_paise || amount_paise <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (amount_paise > remaining) {
      toast.error('Amount cannot exceed remaining balance');
      return;
    }

    setPaying(true);
    try {
      const updated = await paySettlement(settlement.id, amount_paise / 100, note);
      setSettlement(updated);
      setMode(null);
      setPartialAmt('');
      setNote('');
      toast.success(updated.status === 'completed' ? '🎉 Settlement completed!' : 'Payment recorded!');
      onPaid?.(updated);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div className="modal-title" style={{ margin: 0 }}>Settlement Details</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '20px 0', marginBottom: 16, background: 'var(--bg2)', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', margin: '0 auto 8px', background: settlement.from_member?.avatar_color || '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff' }}>
              {(settlement.from_member?.name || '?')[0].toUpperCase()}
            </div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{settlement.from_member?.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>owes</div>
          </div>

          <ChevronRight size={24} style={{ color: 'var(--accent2)', flexShrink: 0 }} />

          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', margin: '0 auto 8px', background: settlement.to_member?.avatar_color || '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff' }}>
              {(settlement.to_member?.name || '?')[0].toUpperCase()}
            </div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{settlement.to_member?.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>receives</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 14px', borderRadius: 99, background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}40` }}>
            {statusLabel}
          </span>
        </div>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ color: 'var(--text2)', fontSize: 13 }}>Total Due</span>
            <span style={{ fontWeight: 700 }}>{fmtInr(settlement.total_paise)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ color: 'var(--text2)', fontSize: 13 }}>Amount Paid</span>
            <span style={{ fontWeight: 700, color: 'var(--green)' }}>{fmtInr(settlement.paid_paise)}</span>
          </div>
          <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700 }}>Remaining</span>
            <span style={{ fontWeight: 800, fontSize: 18, color: remaining === 0 ? 'var(--green)' : 'var(--accent2)' }}>{fmtInr(remaining)}</span>
          </div>

          <div style={{ marginTop: 12, height: 6, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, width: `${progress}%`, background: progress === 100 ? 'var(--green)' : 'linear-gradient(90deg, var(--accent), var(--accent2))', transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, textAlign: 'right' }}>{progress}% paid</div>
        </div>

        {settlement.status !== 'completed' && (
          <div style={{ marginBottom: 16 }}>
            {mode === null && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handlePay(remaining)} disabled={paying || loading}>
                  <CreditCard size={15} /> Pay Full {fmtInr(remaining)}
                </button>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setMode('partial')}>
                  Partial Payment
                </button>
              </div>
            )}

            {mode === 'partial' && (
              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 13, color: 'var(--text2)', display: 'block', marginBottom: 8 }}>
                  Enter partial amount (max {fmtInr(remaining)}):
                </label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="0.00"
                    min="0.01"
                    max={remaining / 100}
                    step="0.01"
                    value={partialAmt}
                    onChange={(e) => setPartialAmt(e.target.value)}
                    style={{ flex: 1 }}
                    autoFocus
                  />
                  <button
                    className="btn btn-primary"
                    onClick={() => handlePay(Math.round(+partialAmt * 100))}
                    disabled={paying || !partialAmt || +partialAmt <= 0}
                  >
                    {paying ? 'Saving…' : 'Confirm'}
                  </button>
                </div>
                <textarea
                  className="form-input"
                  placeholder="Optional note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{ width: '100%', marginTop: 12, minHeight: 80 }}
                />
                <button className="btn btn-ghost" onClick={() => { setMode(null); setPartialAmt(''); setNote(''); }}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {settlement.status === 'completed' && (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--green)', fontWeight: 700, fontSize: 16 }}>
            <CheckCircle size={32} style={{ margin: '0 auto 8px', display: 'block' }} />
            All dues cleared!
            <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 8 }}>Settlement Completed Successfully</div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            Expense Breakdown
          </div>
          {settlement.expense_breakdown?.length ? (
            <details open style={{ border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: 14, background: 'var(--bg2)' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700, marginBottom: 12 }}>View expenses contributing to this settlement</summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                {settlement.expense_breakdown.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--r2)',
                      padding: 12,
                      background: 'var(--bg)',
                      color: 'var(--text)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)' }}>{item.expense_title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{new Date(item.expense_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                    </div>
                    <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 13, color: 'var(--text3)' }}>{item.split_details}</span>
                      <span style={{ fontWeight: 700, color: 'var(--text)' }}>{fmtInr(item.amount_paise)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ) : (
            <div className="empty" style={{ padding: '12px 0' }}>
              <div className="empty-title">No expense breakdown available</div>
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            Settlement History
          </div>
          <PaymentHistory payments={settlement.payments} />
        </div>
      </div>
    </div>
  );
}
