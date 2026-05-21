import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import { createExpense, parseExpenseText, parseBillText } from '../api';
import { X, Sparkles, FileText, Loader } from 'lucide-react';

const today = () => new Date().toISOString().split('T')[0];

export default function AddExpenseModal({ group, onClose, onSaved }) {
  const { currentUser } = useContext(AppContext);
  const members = group.members || [];

  const [mode, setMode]   = useState('manual');  // 'manual' | 'ai' | 'bill'
  const [aiText, setAiText]   = useState('');
  const [billText, setBillText] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError]     = useState('');

  const [form, setForm] = useState({
    description: '', amount: '', paid_by_id: currentUser?.id || '',
    split_mode: 'equal_all', date: today(), notes: '',
    split_members: [], custom_amounts: {}, share_weights: {},
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const runAiParse = async () => {
    if (!aiText.trim()) return;
    setAiLoading(true); setAiError(''); setAiResult(null);
    try {
      const res = await parseExpenseText(aiText, group.id);
      if (!res.success) { setAiError(res.error || 'Could not parse. Please fill manually.'); return; }
      setAiResult(res);
      // Pre-fill form
      setForm(f => ({
        ...f,
        description: res.description || '',
        amount: res.amount || '',
        paid_by_id: res.paid_by?.id || f.paid_by_id,
        split_mode: res.split_mode || 'equal_all',
        split_members: res.split_members?.map(m => m.id) || [],
        custom_amounts: res.custom_amounts || {},
        notes: res.notes || '',
      }));
    } catch (e) {
      setAiError('AI service unavailable. Please fill manually.');
    } finally { setAiLoading(false); }
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
        amount: res.total_amount || '',
      }));
    } catch (e) {
      setAiError('AI service unavailable. Please fill manually.');
    } finally { setAiLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.description.trim()) { setError('Description required'); return; }
    if (!form.amount || +form.amount <= 0) { setError('Valid amount required'); return; }
    if (!form.paid_by_id) { setError('Select who paid'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        group: group.id,
        description: form.description,
        amount: +form.amount,
        paid_by_id: +form.paid_by_id,
        split_mode: form.split_mode,
        date: form.date,
        notes: form.notes,
        ai_parsed: mode !== 'manual',
      };
      if (form.split_mode === 'equal_subset') payload.split_members = form.split_members;
      if (form.split_mode === 'custom') payload.custom_amounts = form.custom_amounts;
      if (form.split_mode === 'shares') payload.share_weights = form.share_weights;
      await createExpense(payload);
      await onSaved();
      onClose();
    } catch (e) {
      setError(e.response?.data?.errors ? JSON.stringify(e.response.data.errors) : 'Failed to save expense');
    } finally { setSaving(false); }
  };

  const toggleSplitMember = (uid) => {
    setForm(f => ({
      ...f,
      split_members: f.split_members.includes(uid)
        ? f.split_members.filter(id => id !== uid)
        : [...f.split_members, uid]
    }));
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div className="modal-title" style={{ margin:0 }}>Add Expense</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16}/></button>
        </div>

        {/* Mode switcher */}
        <div className="tabs" style={{ marginBottom:20 }}>
          <button className={`tab ${mode==='manual'?'active':''}`} onClick={() => { setMode('manual'); setAiResult(null); setAiError(''); }}>
            ✏️ Manual
          </button>
          <button className={`tab ${mode==='ai'?'active':''}`} onClick={() => { setMode('ai'); setAiResult(null); setAiError(''); }}>
            ✨ AI Parse
          </button>
          <button className={`tab ${mode==='bill'?'active':''}`} onClick={() => { setMode('bill'); setAiResult(null); setAiError(''); }}>
            🧾 Bill Text
          </button>
        </div>

        {/* AI Mode */}
        {mode === 'ai' && (
          <div className="ai-panel">
            <div className="ai-panel-title"><Sparkles size={14}/> Natural Language Entry</div>
            <textarea className="form-textarea" rows={3}
              placeholder={'e.g. "I paid 2400 for dinner last night, split between me, Aman and Priya, but Aman didn\'t have drinks so reduce his share by 300"'}
              value={aiText} onChange={e => setAiText(e.target.value)}/>
            <button className="btn btn-primary btn-sm" style={{ marginTop:10 }} onClick={runAiParse} disabled={aiLoading || !aiText.trim()}>
              {aiLoading ? <><Loader size={14} className="spin"/>Parsing…</> : <><Sparkles size={14}/>Parse</>}
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
                <div className="ai-result-row">
                  <span className="ai-result-label">Split</span>
                  <span className="ai-result-value">{aiResult.split_mode?.replace(/_/g,' ')}</span>
                </div>
                {aiResult.parse_notes && (
                  <div style={{ marginTop:8, fontSize:12, color:'var(--text3)', borderTop:'1px solid var(--border)', paddingTop:8 }}>
                    💡 {aiResult.parse_notes}
                  </div>
                )}
                <div style={{ marginTop:8, color:'var(--text2)', fontSize:12 }}>
                  ✅ Form pre-filled below — review and confirm before saving.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bill Mode */}
        {mode === 'bill' && (
          <div className="ai-panel">
            <div className="ai-panel-title"><FileText size={14}/> Paste Bill / Receipt Text</div>
            <textarea className="form-textarea" rows={5}
              placeholder={"Paste raw bill text here:\nMargherita Pizza   ₹350\nGarlic Bread        ₹150\nCoke ×2             ₹120\nGST (5%)             ₹31\nTotal              ₹651"}
              value={billText} onChange={e => setBillText(e.target.value)}/>
            <button className="btn btn-primary btn-sm" style={{ marginTop:10 }} onClick={runBillParse} disabled={aiLoading || !billText.trim()}>
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
                {aiResult.line_items?.length > 0 && (
                  <div style={{ marginTop:8 }}>
                    <div style={{ fontSize:12, color:'var(--text3)', marginBottom:4 }}>Line items:</div>
                    {aiResult.line_items.map((item, i) => (
                      <div key={i} className="ai-result-row">
                        <span className="ai-result-label">{item.name} ×{item.quantity}</span>
                        <span className="ai-result-value">₹{item.price}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop:8, color:'var(--text2)', fontSize:12 }}>✅ Total pre-filled below. Choose how to split.</div>
              </div>
            )}
          </div>
        )}

        {/* Always-visible form */}
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
            <select className="form-select" value={form.paid_by_id} onChange={e => fld('paid_by_id', +e.target.value)}>
              <option value="">Select…</option>
              {members.map(m => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin:0 }}>
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={form.date} onChange={e => fld('date', e.target.value)}/>
          </div>
        </div>

        <div className="form-group" style={{ marginTop:16 }}>
          <label className="form-label">Split Mode</label>
          <select className="form-select" value={form.split_mode} onChange={e => fld('split_mode', e.target.value)}>
            <option value="equal_all">Equal among all members</option>
            <option value="equal_subset">Equal among subset</option>
            <option value="custom">Custom amounts</option>
            <option value="shares">By share weights</option>
          </select>
        </div>

        {/* Subset picker */}
        {form.split_mode === 'equal_subset' && (
          <div className="form-group">
            <label className="form-label">Split between:</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {members.map(m => (
                <button key={m.user.id}
                  className={`chip ${form.split_members.includes(m.user.id) ? 'selected' : ''}`}
                  onClick={() => toggleSplitMember(m.user.id)}>
                  {m.user.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom amounts */}
        {form.split_mode === 'custom' && (
          <div className="form-group">
            <label className="form-label">Custom amounts (must sum to total):</label>
            <div className="share-preview">
              {members.map(m => (
                <div key={m.user.id} className="share-row">
                  <div className="avatar" style={{ background:m.user.avatar_color, border:'none', width:24, height:24, fontSize:10 }}>{m.user.name[0]}</div>
                  <span className="share-name">{m.user.name}</span>
                  <input className="form-input share-input" type="number" placeholder="0" min="0" step="0.01"
                    value={form.custom_amounts[m.user.id] || ''}
                    onChange={e => setForm(f => ({ ...f, custom_amounts: { ...f.custom_amounts, [m.user.id]: e.target.value }}))}/>
                </div>
              ))}
              <div style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>
                Sum: ₹{Object.values(form.custom_amounts).reduce((a, b) => a + (+b || 0), 0).toFixed(2)} / ₹{(+form.amount || 0).toFixed(2)}
              </div>
            </div>
          </div>
        )}

        {/* Share weights */}
        {form.split_mode === 'shares' && (
          <div className="form-group">
            <label className="form-label">Share weights:</label>
            <div className="share-preview">
              {members.map(m => (
                <div key={m.user.id} className="share-row">
                  <div className="avatar" style={{ background:m.user.avatar_color, border:'none', width:24, height:24, fontSize:10 }}>{m.user.name[0]}</div>
                  <span className="share-name">{m.user.name}</span>
                  <input className="form-input share-input" type="number" placeholder="1" min="0"
                    value={form.share_weights[m.user.id] || 1}
                    onChange={e => setForm(f => ({ ...f, share_weights: { ...f.share_weights, [m.user.id]: +e.target.value }}))}/>
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
          <button className="btn btn-primary" style={{ flex:2 }} onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : '✓ Save Expense'}
          </button>
        </div>
      </div>
    </div>
  );
}