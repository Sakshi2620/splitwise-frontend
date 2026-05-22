import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import { createExpense, updateExpense, parseExpenseText, parseBillText } from '../api';
import { X, Sparkles, FileText, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

const today = () => new Date().toISOString().split('T')[0];

const PENDING_COLORS = [
  '#6366f1','#ec4899','#10b981','#f59e0b',
  '#3b82f6','#8b5cf6','#ef4444','#14b8a6',
];

const memberName  = (m) => m.display_name || m.user?.name || m.invited_name || m.invited_email || '?';
const memberColor = (m) => {
  if (m.avatar_color) return m.avatar_color;
  if (m.user?.avatar_color) return m.user.avatar_color;
  const seed = m.invited_email || '';
  return PENDING_COLORS[seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % PENDING_COLORS.length];
};

export default function AddExpenseModal({ group, expense, onClose, onSaved }) {
  const { currentUser } = useContext(AppContext);

  // ALL members including pending — keyed by member.id throughout
  const members = group.members || [];
  const currentMember = members.find(m => m.user?.id === currentUser?.id);

  const isEdit = !!expense;

  const [mode,      setMode]      = useState('manual');
  const [aiText,    setAiText]    = useState('');
  const [billText,  setBillText]  = useState('');
  const [aiResult,  setAiResult]  = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError,   setAiError]   = useState('');

  const [form, setForm] = useState({
    description:       expense?.description || '',
    amount:            expense ? (expense.amount_paise / 100).toString() : '',
    paid_by_member_id: expense?.paid_by_member_id || currentMember?.id || '',
    split_mode:        expense?.split_mode || 'equal_all',
    date:              expense?.date || today(),
    notes:             expense?.notes || '',
    split_members:     expense?.shares?.map(s => s.member_id).filter(Boolean) || [],
    custom_amounts:    {},
    share_weights:     {},
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const runAiParse = async () => {
    if (!aiText.trim()) return;
    setAiLoading(true); setAiError(''); setAiResult(null);
    try {
      const res = await parseExpenseText(aiText, group.id);
      if (!res.success) { setAiError(res.error || 'Could not parse.'); return; }
      setAiResult(res);
      // AI returns user ids — map back to member ids
      const paidByMember = members.find(m => m.user?.id === res.paid_by?.id);
      setForm(f => ({
        ...f,
        description:       res.description || '',
        amount:            res.amount ? String(res.amount) : '',
        paid_by_member_id: paidByMember?.id || f.paid_by_member_id,
        split_mode:        res.split_mode || 'equal_all',
        split_members:     (res.split_members || [])
          .map(sm => members.find(m => m.user?.id === sm.id)?.id)
          .filter(Boolean),
        custom_amounts:    res.custom_amounts || {},
      }));
    } catch { setAiError('AI unavailable. Fill manually.'); }
    finally   { setAiLoading(false); }
  };

  const runBillParse = async () => {
    if (!billText.trim()) return;
    setAiLoading(true); setAiError(''); setAiResult(null);
    try {
      const res = await parseBillText(billText);
      if (!res.success) { setAiError(res.error || 'Could not parse bill.'); return; }
      setAiResult({ ...res, isBill: true });
      setForm(f => ({
        ...f,
        description: res.restaurant_name ? `Dinner at ${res.restaurant_name}` : 'Restaurant bill',
        amount:      res.total_amount ? String(res.total_amount) : '',
      }));
    } catch { setAiError('AI unavailable.'); }
    finally   { setAiLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.description.trim())        { setError('Description required'); return; }
    if (!form.amount || +form.amount<=0) { setError('Valid amount required'); return; }
    if (!form.paid_by_member_id)         { setError('Select who paid'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        group:             group.id,
        description:       form.description,
        amount:            +form.amount,
        paid_by_member_id: +form.paid_by_member_id,
        split_mode:        form.split_mode,
        date:              form.date,
        notes:             form.notes,
        ai_parsed:         mode !== 'manual',
      };
      if (form.split_mode === 'equal_subset') payload.split_members  = form.split_members;
      if (form.split_mode === 'custom')       payload.custom_amounts = form.custom_amounts;
      if (form.split_mode === 'shares')       payload.share_weights  = form.share_weights;

      if (isEdit) {
        await updateExpense(expense.id, payload);
        toast.success('Expense updated!');
      } else {
        await createExpense(payload);
        toast.success('Expense added!');
      }
      await onSaved();
      onClose();
    } catch (e) {
      const msg = e.response?.data?.errors
        ? Object.values(e.response.data.errors).flat()[0]
        : 'Failed to save expense';
      setError(msg);
    } finally { setSaving(false); }
  };

  const toggleMember = (mid) => setForm(f => ({
    ...f,
    split_members: f.split_members.includes(mid)
      ? f.split_members.filter(id => id !== mid)
      : [...f.split_members, mid],
  }));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div className="modal-title" style={{ margin:0 }}>{isEdit ? 'Edit Expense' : 'Add Expense'}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16}/></button>
        </div>

        {!isEdit && (
          <div className="tabs" style={{ marginBottom:20 }}>
            <button className={`tab ${mode==='manual'?'active':''}`}
              onClick={() => { setMode('manual'); setAiResult(null); setAiError(''); }}>✏️ Manual</button>
            <button className={`tab ${mode==='ai'?'active':''}`}
              onClick={() => { setMode('ai'); setAiResult(null); setAiError(''); }}>✨ AI Parse</button>
            <button className={`tab ${mode==='bill'?'active':''}`}
              onClick={() => { setMode('bill'); setAiResult(null); setAiError(''); }}>🧾 Bill Text</button>
          </div>
        )}

        {mode === 'ai' && (
          <div className="ai-panel">
            <div className="ai-panel-title"><Sparkles size={14}/> Natural Language</div>
            <textarea className="form-textarea" rows={3}
              placeholder={`"I paid 2400 for dinner, split between me, Aman and Priya, but Aman didn't have drinks so reduce his share by 300"`}
              value={aiText} onChange={e => setAiText(e.target.value)}/>
            <button className="btn btn-primary btn-sm" style={{ marginTop:10 }}
              onClick={runAiParse} disabled={aiLoading || !aiText.trim()}>
              {aiLoading ? <><Loader size={14}/>Parsing…</> : <><Sparkles size={14}/>Parse</>}
            </button>
            {aiError && <div className="error-box" style={{ marginTop:10 }}>{aiError}</div>}
            {aiResult && !aiResult.isBill && (
              <div className="ai-result">
                <div className="ai-result-row">
                  <span className="ai-result-label">Confidence</span>
                  <span className={`ai-result-value confidence-${aiResult.confidence}`}>{aiResult.confidence}</span>
                </div>
                <div className="ai-result-row">
                  <span className="ai-result-label">Description</span>
                  <span className="ai-result-value">{aiResult.description}</span>
                </div>
                <div className="ai-result-row">
                  <span className="ai-result-label">Amount</span>
                  <span className="ai-result-value">₹{aiResult.amount}</span>
                </div>
                <div className="ai-result-row">
                  <span className="ai-result-label">Paid by</span>
                  <span className="ai-result-value">{aiResult.paid_by?.name || '?'}</span>
                </div>
                <div style={{ marginTop:8, color:'var(--text2)', fontSize:12 }}>
                  ✅ Form pre-filled — review and confirm.
                </div>
              </div>
            )}
          </div>
        )}

        {mode === 'bill' && (
          <div className="ai-panel">
            <div className="ai-panel-title"><FileText size={14}/> Paste Bill Text</div>
            <textarea className="form-textarea" rows={5} placeholder="Paste raw bill/receipt text…"
              value={billText} onChange={e => setBillText(e.target.value)}/>
            <button className="btn btn-primary btn-sm" style={{ marginTop:10 }}
              onClick={runBillParse} disabled={aiLoading || !billText.trim()}>
              {aiLoading ? <><Loader size={14}/>Parsing…</> : <>🧾 Parse Bill</>}
            </button>
            {aiError && <div className="error-box" style={{ marginTop:10 }}>{aiError}</div>}
            {aiResult?.isBill && (
              <div className="ai-result">
                <div className="ai-result-row">
                  <span className="ai-result-label">Restaurant</span>
                  <span className="ai-result-value">{aiResult.restaurant_name || '—'}</span>
                </div>
                <div className="ai-result-row">
                  <span className="ai-result-label">Total</span>
                  <span className="ai-result-value">₹{aiResult.total_amount}</span>
                </div>
                {aiResult.line_items?.map((item, i) => (
                  <div key={i} className="ai-result-row">
                    <span className="ai-result-label">{item.name} ×{item.quantity}</span>
                    <span className="ai-result-value">₹{item.price}</span>
                  </div>
                ))}
                <div style={{ marginTop:8, color:'var(--text2)', fontSize:12 }}>
                  ✅ Total pre-filled. Choose split below.
                </div>
              </div>
            )}
          </div>
        )}

        {error && <div className="error-box">{error}</div>}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div className="form-group" style={{ margin:0 }}>
            <label className="form-label">Description *</label>
            <input className="form-input" placeholder="What was this for?"
              value={form.description} onChange={e => fld('description', e.target.value)}/>
          </div>
          <div className="form-group" style={{ margin:0 }}>
            <label className="form-label">Amount (₹) *</label>
            <input className="form-input" type="number" placeholder="0.00" min="0" step="0.01"
              value={form.amount} onChange={e => fld('amount', e.target.value)}/>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:16 }}>
          <div className="form-group" style={{ margin:0 }}>
            <label className="form-label">Paid by *</label>
            <select className="form-select"
              value={form.paid_by_member_id}
              onChange={e => fld('paid_by_member_id', +e.target.value)}>
              <option value="">Select…</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {memberName(m)}{m.is_pending ? ' ⏳' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin:0 }}>
            <label className="form-label">Date</label>
            <input className="form-input" type="date"
              value={form.date} onChange={e => fld('date', e.target.value)}/>
          </div>
        </div>

        <div className="form-group" style={{ marginTop:16 }}>
          <label className="form-label">Split Mode</label>
          <select className="form-select"
            value={form.split_mode} onChange={e => fld('split_mode', e.target.value)}>
            <option value="equal_all">Equal among all</option>
            <option value="equal_subset">Equal among subset</option>
            <option value="custom">Custom amounts</option>
            <option value="shares">By share weights</option>
          </select>
        </div>

        {form.split_mode === 'equal_subset' && (
          <div className="form-group">
            <label className="form-label">Split between:</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {members.map(m => (
                <button key={m.id}
                  className={`chip ${form.split_members.includes(m.id) ? 'selected' : ''}`}
                  onClick={() => toggleMember(m.id)}>
                  {memberName(m).split(' ')[0]}{m.is_pending ? ' ⏳' : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        {form.split_mode === 'custom' && (
          <div className="form-group">
            <label className="form-label">Custom amounts (must sum to total):</label>
            <div className="share-preview">
              {members.map(m => (
                <div key={m.id} className="share-row">
                  <div className="avatar" style={{
                    background: memberColor(m), border:'none', width:24, height:24, fontSize:10,
                  }}>
                    {memberName(m)[0]?.toUpperCase()}
                  </div>
                  <span className="share-name">
                    {memberName(m)}{m.is_pending ? ' ⏳' : ''}
                  </span>
                  <input className="form-input share-input" type="number"
                    placeholder="0" min="0" step="0.01"
                    value={form.custom_amounts[m.id] || ''}
                    onChange={e => setForm(f => ({
                      ...f, custom_amounts: { ...f.custom_amounts, [m.id]: e.target.value },
                    }))}/>
                </div>
              ))}
              <div style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>
                Sum: ₹{Object.values(form.custom_amounts).reduce((a,b) => a+(+b||0), 0).toFixed(2)}
                {' / '}₹{(+form.amount||0).toFixed(2)}
              </div>
            </div>
          </div>
        )}

        {form.split_mode === 'shares' && (
          <div className="form-group">
            <label className="form-label">Share weights:</label>
            <div className="share-preview">
              {members.map(m => (
                <div key={m.id} className="share-row">
                  <div className="avatar" style={{
                    background: memberColor(m), border:'none', width:24, height:24, fontSize:10,
                  }}>
                    {memberName(m)[0]?.toUpperCase()}
                  </div>
                  <span className="share-name">
                    {memberName(m)}{m.is_pending ? ' ⏳' : ''}
                  </span>
                  <input className="form-input share-input" type="number"
                    placeholder="1" min="0"
                    value={form.share_weights[m.id] || 1}
                    onChange={e => setForm(f => ({
                      ...f, share_weights: { ...f.share_weights, [m.id]: +e.target.value },
                    }))}/>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Notes</label>
          <input className="form-input" placeholder="Optional note"
            value={form.notes} onChange={e => fld('notes', e.target.value)}/>
        </div>

        <div style={{ display:'flex', gap:12 }}>
          <button className="btn btn-ghost" style={{ flex:1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex:2 }}
            onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? '✓ Update Expense' : '✓ Save Expense'}
          </button>
        </div>
      </div>
    </div>
  );
}