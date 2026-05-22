import React, { useState } from 'react';
import { deleteExpense } from '../api';
import { Trash2, Search, Pencil } from 'lucide-react';
import AddExpenseModal from './AddExpenseModal';
import toast from 'react-hot-toast';

const memberName = (m) =>
  m?.display_name || m?.user?.name || m?.invited_name || m?.invited_email || '?';

export default function ExpenseList({ expenses, group, onRefresh }) {
  const [search,      setSearch]      = useState('');
  const [payerFilter, setPayer]       = useState('');
  const [dateFrom,    setDateFrom]    = useState('');
  const [dateTo,      setDateTo]      = useState('');
  const [deleting,    setDeleting]    = useState(null);
  const [editExpense, setEditExpense] = useState(null);

  const fmtInr = p =>
    (p / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

  const icon = desc => {
    const d = desc.toLowerCase();
    if (d.includes('hotel') || d.includes('rent')  || d.includes('flat'))    return '🏠';
    if (d.includes('food')  || d.includes('dinner') || d.includes('lunch') ||
        d.includes('pizza') || d.includes('sushi'))                           return '🍽️';
    if (d.includes('taxi')  || d.includes('uber')  || d.includes('flight') ||
        d.includes('scooter'))                                                return '🚗';
    if (d.includes('drink') || d.includes('bar'))                             return '🍺';
    if (d.includes('electricity') || d.includes('internet') || d.includes('gas')) return '⚡';
    return '💸';
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    setDeleting(id);
    try {
      await deleteExpense(id);
      await onRefresh();
      toast.success('Expense deleted');
    } catch { toast.error('Failed to delete'); }
    finally { setDeleting(null); }
  };

  // All members including pending for the payer filter
  const allMembers = group.members || [];

  const filtered = (expenses || []).filter(e => {
    if (search && !e.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (payerFilter) {
      // match against paid_by.member_id (new) or paid_by.id (legacy)
      const matchMember = String(e.paid_by?.member_id) === payerFilter;
      const matchUser   = String(e.paid_by?.id)        === payerFilter;
      if (!matchMember && !matchUser) return false;
    }
    if (dateFrom && e.date < dateFrom) return false;
    if (dateTo   && e.date > dateTo)   return false;
    return true;
  });

  return (
    <div>
      <div className="filter-bar">
        <div style={{ position:'relative', flex:1 }}>
          <Search size={15} style={{
            position:'absolute', left:12, top:'50%',
            transform:'translateY(-50%)', color:'var(--text3)',
          }}/>
          <input className="form-input" style={{ paddingLeft:36 }} placeholder="Search…"
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>

        <select className="form-select" style={{ width:'auto' }}
          value={payerFilter} onChange={e => setPayer(e.target.value)}>
          <option value="">All payers</option>
          {allMembers.map(m => (
            <option key={m.id} value={m.id}>
              {memberName(m).split(' ')[0]}{m.is_pending ? ' ⏳' : ''}
            </option>
          ))}
        </select>

        <input className="form-input" type="date" style={{ width:'auto' }}
          value={dateFrom} onChange={e => setDateFrom(e.target.value)}/>
        <input className="form-input" type="date" style={{ width:'auto' }}
          value={dateTo}   onChange={e => setDateTo(e.target.value)}/>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📭</div>
          <div className="empty-title">No expenses found</div>
          <div className="empty-sub">Try changing your filters or add the first expense.</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.map(e => (
            <div key={e.id} className="expense-item">
              <div className="expense-icon">{icon(e.description)}</div>
              <div style={{ flex:1 }}>
                <div className="expense-desc">
                  {e.description}
                  {e.ai_parsed && (
                    <span className="ai-badge" style={{ marginLeft:8 }}>✨ AI</span>
                  )}
                </div>
                <div className="expense-meta">
                  Paid by{' '}
                  <strong style={{ color:'var(--text)' }}>
                    {e.paid_by?.name?.split(' ')[0] ?? '?'}
                  </strong>
                  {' · '}
                  {new Date(e.date).toLocaleDateString('en-IN', {
                    day:'numeric', month:'short',
                  })}
                  {' · '}
                  {e.split_mode.replace(/_/g, ' ')}
                </div>
                {e.shares?.length > 0 && (
                  <div style={{ marginTop:6, display:'flex', gap:4, flexWrap:'wrap' }}>
                    {e.shares.map(s => (
                      <span key={s.id} style={{
                        fontSize:11, background:'var(--bg3)',
                        border:'1px solid var(--border)', borderRadius:99,
                        padding:'2px 8px', color:'var(--text2)',
                      }}>
                        {s.user?.name?.split(' ')[0] ?? '?'}: {fmtInr(s.amount_paise)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="expense-amount">
                <div className="expense-amount-val">{fmtInr(e.amount_paise)}</div>
                <div className="expense-amount-sub">{e.currency}</div>
              </div>
              <button className="btn btn-ghost btn-sm btn-icon"
                onClick={() => setEditExpense(e)} title="Edit">
                <Pencil size={14}/>
              </button>
              <button className="btn btn-danger btn-sm btn-icon"
                onClick={() => handleDelete(e.id)}
                disabled={deleting === e.id} title="Delete">
                <Trash2 size={14}/>
              </button>
            </div>
          ))}
        </div>
      )}

      {editExpense && (
        <AddExpenseModal
          group={group}
          expense={editExpense}
          onClose={() => setEditExpense(null)}
          onSaved={() => { setEditExpense(null); onRefresh(); }}
        />
      )}
    </div>
  );
}