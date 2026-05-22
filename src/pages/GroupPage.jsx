import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../App';

import {
  getGroup,
  getGroupExpenses,
  getGroupBalances,
  getGroupSettlements,
  getSettlementDetail,
} from '../api';

import Sidebar from '../components/Sidebar';
import ExpenseList from '../components/ExpenseList';
import AddExpenseModal from '../components/AddExpenseModal';
import MembersPanel from '../components/MembersPanel';
import SettlementDetailModal from '../components/SettlementDetailModal';

import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Copy,
} from 'lucide-react';

import toast from 'react-hot-toast';

export default function GroupPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { categoryEmoji, currentUser } = useApp();

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [loadingSettlement, setLoadingSettlement] = useState(false);

  const [tab, setTab] = useState('expenses');
  const [showAddExp, setShowAddExp] = useState(false);
  const [loading, setLoading] = useState(true);

  const [activeSettlement, setActiveSettlement] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [g, exp, bal, sett] = await Promise.all([
        getGroup(id),
        getGroupExpenses(id),
        getGroupBalances(id),
        getGroupSettlements(id),
      ]);

      setGroup(g);
      setExpenses(exp);
      setBalances(bal);
      setSettlements(sett);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load group');
      nav('/');
    } finally {
      setLoading(false);
    }
  }, [id, nav]);

  const loadSettlement = async (settlementId) => {
    setTab('settle');
    setLoadingSettlement(true);
    try {
      const data = await getSettlementDetail(settlementId);
      setActiveSettlement(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load settlement details');
    } finally {
      setLoadingSettlement(false);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  const fmtInr = (p) =>
    (p / 100).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
    });

  const activeSettlements = settlements.filter(
    (s) => s.status !== 'completed'
  );
  const completedSettlements = settlements.filter(
    (s) => s.status === 'completed'
  );

  const hasOutstandingBalances =
    balances?.balances?.some((b) => b.status !== 'settled');

  const findSettlementForUser = (userId) => {
    if (!currentUser?.id) return null;
    return settlements.find(
      (s) =>
        (s.from_member?.id === currentUser.id && s.to_member?.id === userId) ||
        (s.to_member?.id === currentUser.id && s.from_member?.id === userId)
    );
  };

  const settlementStatusLabel = (status) =>
    ({
      pending: '⏳ Pending',
      partial: '🔄 Partially Paid',
      completed: '✅ Completed',
    }[status] || 'Unknown');

  const fallbackCopy = (text) => {
    const el = document.createElement('textarea');

    el.value = text;
    el.style.cssText =
      'position:fixed;opacity:0;pointer-events:none;';

    document.body.appendChild(el);
    el.select();

    try {
      document.execCommand('copy');
      toast.success('Invite link copied!');
    } catch {
      toast.success(`Link: ${text}`, {
        duration: 6000,
      });
    }

    document.body.removeChild(el);
  };

  const copyInvite = () => {
    const url = `${window.location.origin}/join/${group.invite_link}`;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(url)
        .then(() => toast.success('Invite link copied!'))
        .catch(() => fallbackCopy(url));
    } else {
      fallbackCopy(url);
    }
  };

  const getMemberName = (m) =>
    m.display_name ||
    m.invited_name ||
    m.invited_email ||
    '?';

  const getMemberEmail = (m) =>
    m.display_email ||
    m.invited_email ||
    '';

  const getMemberColor = (m) => {
    if (m.avatar_color) return m.avatar_color;
    if (m.user?.avatar_color) return m.user.avatar_color;

    const colors = [
      '#6366f1',
      '#ec4899',
      '#10b981',
      '#f59e0b',
      '#3b82f6',
      '#8b5cf6',
      '#ef4444',
      '#14b8a6',
    ];

    const seed =
      m.display_email ||
      m.invited_email ||
      '';

    return colors[
      seed
        .split('')
        .reduce(
          (a, c) => a + c.charCodeAt(0),
          0
        ) % colors.length
    ];
  };

  if (loading || !group) {
    return (
      <div className="app">
        <Sidebar />

        <main className="main">
          <div
            className="loading"
            style={{ minHeight: '60vh' }}
          >
            <div className="spinner" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar />

      <main className="main">
        <div className="page">

          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 8,
            }}
          >
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => nav('/')}
            >
              <ArrowLeft size={16} />
            </button>

            <span style={{ fontSize: 24 }}>
              {categoryEmoji(group.category)}
            </span>

            <div style={{ flex: 1 }}>
              <h1
                className="page-title"
                style={{ fontSize: 22 }}
              >
                {group.name}
              </h1>

              {group.description && (
                <p
                  className="page-sub"
                  style={{ fontSize: 13 }}
                >
                  {group.description}
                </p>
              )}
            </div>

            <button
              className="btn btn-ghost btn-sm"
              onClick={copyInvite}
            >
              <Copy size={14} />
              {' '}
              Invite
            </button>

            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowAddExp(true)}
            >
              <Plus size={16} />
              {' '}
              Add Expense
            </button>
          </div>

          {/* Member Pills */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 28,
            }}
          >
            {group.members.map((m) => {
              const name = getMemberName(m);
              const color = getMemberColor(m);

              return (
                <div
                  key={m.id}
                  title={getMemberEmail(m)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'var(--bg2)',
                    border: '1px solid var(--border)',
                    borderRadius: 99,
                    padding: '4px 10px 4px 4px',
                    fontSize: 12,
                    opacity: m.is_pending ? 0.6 : 1,
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 9,
                      fontWeight: 700,
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    {name[0]?.toUpperCase() || '?'}
                  </div>

                  {name.split(' ')[0]}

                  {m.is_admin && (
                    <span
                      style={{
                        fontSize: 10,
                        color: 'var(--accent2)',
                      }}
                    >
                      ★
                    </span>
                  )}

                  {m.is_pending && (
                    <span
                      style={{
                        fontSize: 9,
                        color: 'var(--amber)',
                        marginLeft: 2,
                      }}
                    >
                      ⏳
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Stats */}
          <div className="stats-bar">

            <div className="stat-card">
              <div className="stat-label">
                Total Spent
              </div>

              <div
                className="stat-value"
                style={{ fontSize: 20 }}
              >
                {fmtInr(group.total_spent_paise)}
              </div>

              <div className="stat-sub">
                {group.expense_count} expenses
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">
                Members
              </div>

              <div className="stat-value">
                {group.members.length}
              </div>

              <div className="stat-sub">
                {group.members.filter(
                  (m) => m.is_pending
                ).length > 0
                  ? `${
                      group.members.filter(
                        (m) => !m.is_pending
                      ).length
                    } active · ${
                      group.members.filter(
                        (m) => m.is_pending
                      ).length
                    } pending`
                  : 'all active'}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">
                Settle-up
              </div>

              <div
                className="stat-value"
                style={{
                  color:
                    balances?.total_transactions === 0
                      ? 'var(--green)'
                      : 'var(--accent2)',
                }}
              >
                {balances
                  ? balances.total_transactions
                  : '–'}
              </div>

              <div className="stat-sub">
                transactions needed
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs">
            {[
              'expenses',
              'balances',
              'settle',
              'members',
            ].map((t) => (
              <button
                key={t}
                className={`tab ${
                  tab === t ? 'active' : ''
                }`}
                onClick={() => setTab(t)}
              >
                {t === 'expenses'
                  ? '💸 Expenses'
                  : t === 'balances'
                  ? '⚖️ Balances'
                  : t === 'settle'
                  ? '✅ Settle Up'
                  : '👥 Members'}
              </button>
            ))}
          </div>

          {/* Expenses */}
          {tab === 'expenses' && (
            <ExpenseList
              expenses={expenses}
              group={group}
              onRefresh={load}
            />
          )}

          {/* Balances */}
          {tab === 'balances' && (
            <div className="balance-list">
              {!balances?.balances?.length ? (
                <div className="empty">
                  <div className="empty-icon">
                    ⚖️
                  </div>

                  <div className="empty-title">
                    All settled!
                  </div>

                  <div className="empty-sub">
                    No outstanding balances in
                    this group.
                  </div>
                </div>
              ) : (
                balances.balances.map((b, i) => {
                  const settlementForUser = findSettlementForUser(b.user?.id);
                  const isPendingMember = !b.user?.id;
                  return (
                    <div
                      key={i}
                      className="balance-item"
                      onClick={() =>
                        settlementForUser &&
                        loadSettlement(settlementForUser.id)
                      }
                      style={{
                        cursor: settlementForUser ? 'pointer' : 'default',
                      }}
                    >
                      <div
                        className="avatar avatar-lg"
                        style={{
                          background:
                            b.user?.avatar_color ||
                            '#6366f1',
                        }}
                      >
                        {(b.user?.name || '?')[0]}
                      </div>

                      <div className="balance-name">
                        {b.user?.name || 'Unknown'}
                      </div>

                      <div>
                        <div
                          className={`balance-amount ${
                            +b.net_paise > 0
                              ? 'positive'
                              : +b.net_paise < 0
                              ? 'negative'
                              : 'zero'
                          }`}
                        >
                          {+b.net_paise > 0 ? '+' : ''}
                          {fmtInr(
                            Math.abs(b.net_paise)
                          )}
                        </div>

                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--text3)',
                            textAlign: 'right',
                          }}
                        >
                          {b.status === 'owed'
                            ? 'gets back'
                            : b.status === 'owes'
                            ? 'owes'
                            : 'settled'}
                        </div>
                        {settlementForUser ? (
                          <div
                            style={{
                              marginTop: 10,
                              fontSize: 11,
                              color: 'var(--accent2)',
                            }}
                          >
                            Tap to view settlement details
                          </div>
                        ) : isPendingMember ? (
                          <div
                            style={{
                              marginTop: 10,
                              fontSize: 11,
                              color: 'var(--text3)',
                            }}
                          >
                            Pending member — settlement details unavailable
                          </div>
                        ) : (
                          <div
                            style={{
                              marginTop: 10,
                              fontSize: 11,
                              color: 'var(--text3)',
                            }}
                          >
                            No settlement record found yet
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Settlements */}
          {tab === 'settle' && (
            <div>
              {!settlements?.length ? (
                hasOutstandingBalances ? (
                  <div className="empty">
                    <div className="empty-icon">
                      ⚠️
                    </div>

                    <div className="empty-title">
                      Settlement plan not available yet
                    </div>

                    <div className="empty-sub">
                      There are outstanding balances but no settlement records could be generated.
                      This usually means a member is pending or some expense payer data is missing.
                    </div>
                  </div>
                ) : (
                  <div className="empty">
                    <div className="empty-icon">
                      🎉
                    </div>

                    <div className="empty-title">
                      All settled up!
                    </div>

                    <div className="empty-sub">
                      No outstanding debts in this group.
                    </div>
                  </div>
                )
              ) : (
                <>
                  <div className="balance-list">
                    {activeSettlements.map((s) => {
                      const progress =
                        s.total_paise > 0
                          ? Math.round((s.paid_paise / s.total_paise) * 100)
                          : 0;

                      const statusColor = {
                        pending: 'var(--accent2)',
                        partial: 'var(--amber)',
                        completed: 'var(--green)',
                      }[s.status];

                      return (
                        <div
                          key={s.id}
                          className="settlement-item"
                          onClick={() => loadSettlement(s.id)}
                          style={{
                            cursor: 'pointer',
                            flexDirection: 'column',
                            alignItems: 'stretch',
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                            }}
                          >
                            <div
                              className="avatar"
                              style={{
                                background:
                                  s.from_member?.avatar_color ||
                                  '#6366f1',
                                border: 'none',
                              }}
                            >
                              {(s.from_member?.name || '?')[0]}
                            </div>

                            <div
                              style={{
                                flex: 1,
                                fontSize: 14,
                              }}
                            >
                              <strong>{s.from_member?.name}</strong>
                              <span
                                style={{
                                  color: 'var(--text3)',
                                  margin: '0 6px',
                                }}
                              >
                                pays
                              </span>
                              <strong>{s.to_member?.name}</strong>
                            </div>

                            <ArrowRight
                              size={16}
                              style={{ color: 'var(--text3)' }}
                            />

                            <div
                              className="avatar"
                              style={{
                                background:
                                  s.to_member?.avatar_color ||
                                  '#6366f1',
                                border: 'none',
                              }}
                            >
                              {(s.to_member?.name || '?')[0]}
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <div
                                style={{
                                  fontWeight: 800,
                                  color: statusColor,
                                }}
                              >
                                {fmtInr(s.remaining_paise)}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: 'var(--text3)',
                                }}
                              >
                                remaining
                              </div>
                            </div>
                          </div>

                          <div
                            style={{
                              height: 4,
                              background: 'var(--bg3)',
                              borderRadius: 99,
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                borderRadius: 99,
                                width: `${progress}%`,
                                background:
                                  progress === 100
                                    ? 'var(--green)'
                                    : 'linear-gradient(90deg, var(--accent), var(--accent2))',
                                transition: 'width 0.4s',
                              }}
                            />
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: 11,
                              color: 'var(--text3)',
                            }}
                          >
                            <span
                              style={{
                                color: statusColor,
                                fontWeight: 600,
                              }}
                            >
                              {settlementStatusLabel(s.status)}
                            </span>
                            <span>
                              Paid {fmtInr(s.paid_paise)} of{' '}
                              {fmtInr(s.total_paise)}
                            </span>
                          </div>
                          <div
                            style={{
                              marginTop: 6,
                              fontSize: 11,
                              color: 'var(--text3)',
                              display: 'flex',
                              justifyContent: 'space-between',
                            }}
                          >
                            <span>Remaining {fmtInr(s.remaining_paise)}</span>
                            <span>{progress}% complete</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {completedSettlements.length > 0 && (
                    <div style={{ marginTop: 24 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          marginBottom: 10,
                          color: 'var(--text2)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                        }}
                      >
                        Completed Settlements
                      </div>
                      <div className="balance-list">
                        {completedSettlements.map((s) => (
                          <div
                            key={s.id}
                            className="settlement-item"
                            onClick={() => loadSettlement(s.id)}
                            style={{
                              cursor: 'pointer',
                              flexDirection: 'column',
                              alignItems: 'stretch',
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                              }}
                            >
                              <div
                                className="avatar"
                                style={{
                                  background:
                                    s.from_member?.avatar_color ||
                                    '#6366f1',
                                  border: 'none',
                                }}
                              >
                                {(s.from_member?.name || '?')[0]}
                              </div>
                              <div style={{ flex: 1, fontSize: 14 }}>
                                <strong>{s.from_member?.name}</strong>
                                <span
                                  style={{
                                    color: 'var(--text3)',
                                    margin: '0 6px',
                                  }}
                                >
                                  paid
                                </span>
                                <strong>{s.to_member?.name}</strong>
                              </div>
                              <div className="avatar" style={{ border: 'none' }}>
                                {(s.to_member?.name || '?')[0]}
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div
                                  style={{
                                    fontWeight: 800,
                                    color: 'var(--green)',
                                  }}
                                >
                                  {fmtInr(s.remaining_paise)}
                                </div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: 'var(--text3)',
                                  }}
                                >
                                  completed
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Members */}
          {tab === 'members' && (
            <MembersPanel
              group={group}
              onRefresh={load}
            />
          )}

        </div>
      </main>

      {/* Add Expense Modal */}
      {showAddExp && (
        <AddExpenseModal
          group={group}
          onClose={() => setShowAddExp(false)}
          onSaved={load}
        />
      )}

      {/* Settlement Modal */}
      {activeSettlement && (
        <SettlementDetailModal
          settlement={activeSettlement}
          loading={loadingSettlement}
          onClose={() => setActiveSettlement(null)}
          onPaid={(updated) => { load(); if (updated && updated.id) setActiveSettlement(updated); }}
        />
      )}
    </div>
  );
}