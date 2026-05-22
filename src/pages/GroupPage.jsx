import React, { useState, useEffect, useCallback } from 'react';import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { getGroup, getGroupExpenses, getGroupBalances } from '../api';
import Sidebar from '../components/Sidebar';
import ExpenseList from '../components/ExpenseList';
import AddExpenseModal from '../components/AddExpenseModal';
import MembersPanel from '../components/MembersPanel';
import { ArrowLeft, Plus, ArrowRight, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

export default function GroupPage() {
  const { id }   = useParams();
  const nav      = useNavigate();
  const { categoryEmoji } = useApp();

  const [group,    setGroup]    = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState(null);
  const [tab,      setTab]      = useState('expenses');
  const [showAddExp, setShowAddExp] = useState(false);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
  setLoading(true);
  try {
    const [g, exp, bal] = await Promise.all([
      getGroup(id),
      getGroupExpenses(id),
      getGroupBalances(id),
    ]);
    setGroup(g);
    setExpenses(exp);
    setBalances(bal);
  } catch {
    toast.error('Failed to load group');
    nav('/');
  } finally {
    setLoading(false);
  }
}, [id, nav]);

useEffect(() => { load(); }, [load]);

  const fmtInr = p =>
    (p / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

  const copyInvite = () => {
  const url = `${window.location.origin}/join/${group.invite_link}`;

  // clipboard API only works on HTTPS / localhost
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(url)
      .then(() => toast.success('Invite link copied!'))
      .catch(() => fallbackCopy(url));
  } else {
    fallbackCopy(url);
  }
};

const fallbackCopy = (text) => {
  const el = document.createElement('textarea');
  el.value = text;
  el.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
  document.body.appendChild(el);
  el.select();
  try {
    document.execCommand('copy');
    toast.success('Invite link copied!');
  } catch {
    // Last resort — show the URL so user can copy manually
    toast.success(`Link: ${text}`, { duration: 6000 });
  }
  document.body.removeChild(el);
};

  // Safe helpers for members that may be pending (user === null)
  const getMemberName  = (m) => m.display_name  || m.invited_name  || m.invited_email || '?';
  const getMemberEmail = (m) => m.display_email || m.invited_email || '';
  const getMemberColor = (m) => {
    if (m.avatar_color) return m.avatar_color;
    if (m.user?.avatar_color) return m.user.avatar_color;
    // deterministic color from email
    const colors = ['#6366f1','#ec4899','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ef4444','#14b8a6'];
    const seed   = (m.display_email || m.invited_email || '');
    return colors[seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length];
  };

  if (loading || !group) return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <div className="loading" style={{ minHeight: '60vh' }}>
          <div className="spinner" />
        </div>
      </main>
    </div>
  );

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <div className="page">

          {/* ── Header ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => nav('/')}>
              <ArrowLeft size={16} />
            </button>
            <span style={{ fontSize: 24 }}>{categoryEmoji(group.category)}</span>
            <div style={{ flex: 1 }}>
              <h1 className="page-title" style={{ fontSize: 22 }}>{group.name}</h1>
              {group.description && (
                <p className="page-sub" style={{ fontSize: 13 }}>{group.description}</p>
              )}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={copyInvite}>
              <Copy size={14} /> Invite
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddExp(true)}>
              <Plus size={16} /> Add Expense
            </button>
          </div>

          {/* ── Member pills ── */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
            {group.members.map(m => {
              const name  = getMemberName(m);
              const color = getMemberColor(m);
              return (
                <div
                  key={m.id}
                  title={getMemberEmail(m)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    borderRadius: 99, padding: '4px 10px 4px 4px', fontSize: 12,
                    opacity: m.is_pending ? 0.6 : 1,
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0,
                  }}>
                    {name[0]?.toUpperCase() || '?'}
                  </div>
                  {name.split(' ')[0]}
                  {m.is_admin && (
                    <span style={{ fontSize: 10, color: 'var(--accent2)' }}>★</span>
                  )}
                  {m.is_pending && (
                    <span style={{ fontSize: 9, color: 'var(--amber)', marginLeft: 2 }}>⏳</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Stats ── */}
          <div className="stats-bar">
            <div className="stat-card">
              <div className="stat-label">Total Spent</div>
              <div className="stat-value" style={{ fontSize: 20 }}>
                {fmtInr(group.total_spent_paise)}
              </div>
              <div className="stat-sub">{group.expense_count} expenses</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Members</div>
              <div className="stat-value">{group.members.length}</div>
              <div className="stat-sub">
                {group.members.filter(m => m.is_pending).length > 0
                  ? `${group.members.filter(m => !m.is_pending).length} active · ${group.members.filter(m => m.is_pending).length} pending`
                  : 'all active'}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Settle-up</div>
              <div className="stat-value" style={{
                color: balances?.total_transactions === 0
                  ? 'var(--green)' : 'var(--accent2)',
              }}>
                {balances ? balances.total_transactions : '–'}
              </div>
              <div className="stat-sub">transactions needed</div>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="tabs">
            {['expenses', 'balances', 'settle', 'members'].map(t => (
              <button
                key={t}
                className={`tab ${tab === t ? 'active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t === 'expenses' ? '💸 Expenses'
                  : t === 'balances' ? '⚖️ Balances'
                  : t === 'settle'   ? '✅ Settle Up'
                  :                    '👥 Members'}
              </button>
            ))}
          </div>

          {/* ── Tab: Expenses ── */}
          {tab === 'expenses' && (
            <ExpenseList expenses={expenses} group={group} onRefresh={load} />
          )}

          {/* ── Tab: Balances ── */}
          {tab === 'balances' && (
            <div className="balance-list">
              {!balances?.balances?.length ? (
                <div className="empty">
                  <div className="empty-icon">⚖️</div>
                  <div className="empty-title">All settled!</div>
                  <div className="empty-sub">No outstanding balances in this group.</div>
                </div>
              ) : (
                balances.balances.map((b, i) => (
                  <div key={i} className="balance-item">
                    <div
                      className="avatar avatar-lg"
                      style={{ background: b.user?.avatar_color || '#6366f1' }}
                    >
                      {(b.user?.name || '?')[0]}
                    </div>
                    <div className="balance-name">{b.user?.name || 'Unknown'}</div>
                    <div>
                      <div className={`balance-amount ${
                        +b.net_paise > 0 ? 'positive'
                          : +b.net_paise < 0 ? 'negative'
                          : 'zero'
                      }`}>
                        {+b.net_paise > 0 ? '+' : ''}
                        {fmtInr(Math.abs(b.net_paise))}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'right' }}>
                        {b.status === 'owed' ? 'gets back'
                          : b.status === 'owes' ? 'owes'
                          : 'settled'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Tab: Settle Up ── */}
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
                  <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 16 }}>
                    {balances.total_transactions} transaction
                    {balances.total_transactions !== 1 ? 's' : ''} needed to clear all debts:
                  </p>
                  <div className="balance-list">
                    {balances.settlements.map((s, i) => (
                      <div key={i} className="settlement-item">
                        <div className="avatar" style={{
                          background: s.from_user?.avatar_color || '#6366f1', border: 'none',
                        }}>
                          {(s.from_user?.name || '?')[0]}
                        </div>
                        <div style={{ fontSize: 14 }}>
                          <strong>{s.from_user?.name || 'Unknown'}</strong>
                          <span style={{ color: 'var(--text3)', margin: '0 8px' }}>pays</span>
                          <strong>{s.to_user?.name || 'Unknown'}</strong>
                        </div>
                        <ArrowRight size={16} style={{ color: 'var(--text3)' }} />
                        <div className="avatar" style={{
                          background: s.to_user?.avatar_color || '#6366f1', border: 'none',
                        }}>
                          {(s.to_user?.name || '?')[0]}
                        </div>
                        <div className="settlement-amount">{fmtInr(s.amount_paise)}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Tab: Members ── */}
          {tab === 'members' && (
            <MembersPanel group={group} onRefresh={load} />
          )}

        </div>
      </main>

      {showAddExp && (
        <AddExpenseModal
          group={group}
          onClose={() => setShowAddExp(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}