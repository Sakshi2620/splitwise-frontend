import React, { useState, useEffect } from 'react';
import { useApp } from '../App';
import { getGroupExpenses, getGroupBalances, addMember, removeMember } from '../api';
import ExpenseList from './ExpenseList';
import AddExpenseModal from './AddExpenseModal';
import { ArrowLeft, Plus, ArrowRight, UserPlus } from 'lucide-react';

export default function GroupDetail({ group, onBack }) {
  const { users, categoryEmoji, refreshGroups } = useApp();
  const [tab, setTab]           = useState('expenses');
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState(null);
  const [showAddExp, setShowAddExp] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [currentGroup, setCurrentGroup] = useState(group);

  const load = async () => {
    setLoading(true);
    try {
      const [exp, bal] = await Promise.all([
        getGroupExpenses(group.id),
        getGroupBalances(group.id),
      ]);
      setExpenses(exp);
      setBalances(bal);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [group.id]);

  const fmtInr = (paise) => (paise / 100).toLocaleString('en-IN', { style:'currency', currency:'INR' });
  const memberIds = currentGroup.members?.map(m => m.user.id) || group.members?.map(m => m.user.id) || [];
  const nonMembers = users.filter(u => !memberIds.includes(u.id));

  const handleAddMember = async (uid) => {
    await addMember(group.id, uid);
    await refreshGroups();
    // Refresh local group data
    const updated = await import('../api').then(m => m.getGroup(group.id));
    setCurrentGroup(updated);
  };

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}><ArrowLeft size={16}/></button>
        <span style={{ fontSize:24 }}>{categoryEmoji(group.category)}</span>
        <div>
          <h1 className="page-title" style={{ fontSize:22 }}>{group.name}</h1>
          <p className="page-sub" style={{ fontSize:13 }}>{group.description}</p>
        </div>
        <button className="btn btn-primary btn-sm" style={{ marginLeft:'auto' }} onClick={() => setShowAddExp(true)}>
          <Plus size={16}/> Add Expense
        </button>
      </div>

      {/* Members row */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:28, flexWrap:'wrap' }}>
        {(currentGroup.members || group.members).map(m => (
          <div key={m.id} style={{ display:'flex', alignItems:'center', gap:6, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:99, padding:'4px 10px 4px 4px', fontSize:12 }}>
            <div className="avatar" style={{ background:m.user.avatar_color, width:20, height:20, fontSize:9, border:'none' }}>{m.user.name[0]}</div>
            {m.user.name.split(' ')[0]}
          </div>
        ))}
        {nonMembers.length > 0 && (
          <div style={{ position:'relative' }}>
            <select className="form-select" style={{ padding:'4px 28px 4px 10px', fontSize:12, height:'auto', width:'auto' }}
              onChange={e => { if(e.target.value) handleAddMember(+e.target.value); e.target.value=''; }}>
              <option value="">+ Add member</option>
              {nonMembers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-label">Total Spent</div>
          <div className="stat-value" style={{ fontSize:20 }}>{fmtInr(group.total_spent_paise)}</div>
          <div className="stat-sub">{group.expense_count} expenses</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Members</div>
          <div className="stat-value">{(currentGroup.members || group.members).length}</div>
          <div className="stat-sub">people in group</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Settle-up</div>
          <div className="stat-value" style={{ color: balances?.total_transactions === 0 ? 'var(--green)' : 'var(--accent2)' }}>
            {balances ? balances.total_transactions : '–'}
          </div>
          <div className="stat-sub">transactions needed</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {['expenses','balances','settle'].map(t => (
          <button key={t} className={`tab ${tab===t?'active':''}`} onClick={() => setTab(t)}>
            {t === 'expenses' ? '💸 Expenses' : t === 'balances' ? '⚖️ Balances' : '✅ Settle Up'}
          </button>
        ))}
      </div>

      {loading ? <div className="loading"><div className="spinner"/></div> : (
        <>
          {tab === 'expenses' && (
            <ExpenseList expenses={expenses} group={group} onRefresh={load} />
          )}

          {tab === 'balances' && (
            <div>
              {!balances?.balances?.length ? (
                <div className="empty"><div className="empty-icon">⚖️</div><div className="empty-title">All settled!</div></div>
              ) : (
                <div className="balance-list">
                  {balances.balances.map((b, i) => (
                    <div key={i} className="balance-item">
                      <div className="avatar avatar-lg" style={{ background: b.user.avatar_color }}>{b.user.name[0]}</div>
                      <div className="balance-name">{b.user.name}</div>
                      <div>
                        <div className={`balance-amount ${+b.net_paise > 0 ? 'positive' : +b.net_paise < 0 ? 'negative' : 'zero'}`}>
                          {+b.net_paise > 0 ? '+' : ''}{fmtInr(Math.abs(b.net_paise))}
                        </div>
                        <div style={{ fontSize:11, color:'var(--text3)', textAlign:'right' }}>
                          {b.status === 'owed' ? 'gets back' : b.status === 'owes' ? 'owes' : 'settled'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'settle' && (
            <div>
              {!balances?.settlements?.length ? (
                <div className="empty">
                  <div className="empty-icon">🎉</div>
                  <div className="empty-title">All settled up!</div>
                  <div className="empty-sub">No outstanding debts in this group.</div>
                </div>
              ) : (
                <>
                  <p style={{ color:'var(--text2)', fontSize:14, marginBottom:16 }}>
                    {balances.total_transactions} transaction{balances.total_transactions !== 1 ? 's' : ''} to clear all debts (minimum possible):
                  </p>
                  <div className="balance-list">
                    {balances.settlements.map((s, i) => (
                      <div key={i} className="settlement-item">
                        <div className="avatar" style={{ background: s.from_user.avatar_color, border:'none' }}>{s.from_user.name[0]}</div>
                        <div style={{ fontSize:14 }}>
                          <strong>{s.from_user.name}</strong>
                          <span style={{ color:'var(--text3)', margin:'0 8px' }}>pays</span>
                          <strong>{s.to_user.name}</strong>
                        </div>
                        <ArrowRight size={16} style={{ color:'var(--text3)' }}/>
                        <div className="avatar" style={{ background: s.to_user.avatar_color, border:'none' }}>{s.to_user.name[0]}</div>
                        <div className="settlement-amount">{fmtInr(s.amount_paise)}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {showAddExp && (
        <AddExpenseModal group={currentGroup.members ? currentGroup : group}
          onClose={() => setShowAddExp(false)} onSaved={load} />
      )}
    </div>
  );
}