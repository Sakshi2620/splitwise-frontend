import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { createGroup, deleteGroup } from '../api';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import { Plus, X, Trash2, Copy } from 'lucide-react';

export default function Dashboard() {
  const { groups, currentUser, refreshGroups, categoryEmoji } = useApp();

  const nav = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'other',
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fmtInr = (p) =>
    (p / 100).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    });

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('Group name is required');
      return;
    }

    setSaving(true);

    try {
      const g = await createGroup(form);

      await refreshGroups();

      toast.success(`"${g.name}" created!`);

      setShowCreate(false);

      setForm({
        name: '',
        description: '',
        category: 'other',
      });

      nav(`/group/${g.id}`);
    } catch {
      toast.error('Failed to create group');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);

    try {
      await deleteGroup(deleteTarget.id);

      await refreshGroups();

      toast.success(`"${deleteTarget.name}" deleted`);

      setDeleteTarget(null);
    } catch (e) {
      toast.error(
        e.response?.data?.error || 'Failed to delete group'
      );
    } finally {
      setDeleting(false);
    }
  };

  const copyInvite = (group, e) => {
    e.stopPropagation();

    const url = `${window.location.origin}/join/${group.invite_link}`;

    navigator.clipboard.writeText(url);

    toast.success('Invite link copied!');
  };

  // Safe helper functions
  const getMemberName = (member) =>
    member.user?.name ||
    member.invited_name ||
    member.invited_email ||
    'Unknown';

  const getMemberColor = (member) =>
    member.user?.avatar_color || '#6366f1';

  return (
    <div className="app">
      <Sidebar />

      <main className="main">
        <div className="page">

          {/* Header */}
          <div className="page-header">
            <div>
              <h1 className="page-title">My Groups</h1>

              <p className="page-sub">
                Hello {currentUser?.name?.split(' ')[0]} 👋 ·{' '}
                {groups.length} group
                {groups.length !== 1 ? 's' : ''}
              </p>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => setShowCreate(true)}
            >
              <Plus size={18} />
              New Group
            </button>
          </div>

          {/* Empty State */}
          {groups.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🏝️</div>

              <div className="empty-title">
                No groups yet
              </div>

              <div className="empty-sub">
                Create your first group and invite friends
                to start splitting expenses.
              </div>

              <button
                className="btn btn-primary"
                style={{ marginTop: 20 }}
                onClick={() => setShowCreate(true)}
              >
                <Plus size={16} />
                Create Group
              </button>
            </div>
          ) : (
            <div className="group-grid">
              {groups.map((g) => (
                <div
                  key={g.id}
                  className="group-card"
                  onClick={() => nav(`/group/${g.id}`)}
                >

                  {/* Emoji */}
                  <div className="group-emoji">
                    {categoryEmoji(g.category)}
                  </div>

                  {/* Name */}
                  <div className="group-name">
                    {g.name}
                  </div>

                  {/* Description */}
                  <div className="group-desc">
                    {g.description || `${g.category} group`}
                  </div>

                  {/* Stats */}
                  <div className="group-meta">
                    <div className="group-stat">
                      <strong>{g.expense_count}</strong> expenses
                    </div>

                    <div className="group-stat">
                      <strong>
                        {fmtInr(g.total_spent_paise)}
                      </strong>{' '}
                      total
                    </div>
                  </div>

                  {/* Members */}
                  <div className="member-avatars">
                    {g.members.slice(0, 5).map((member) => {
                      const name = getMemberName(member);

                      return (
                        <div
                          key={member.id}
                          className="avatar"
                          style={{
                            background: getMemberColor(member),
                          }}
                          title={name}
                        >
                          {name[0]?.toUpperCase() || '?'}
                        </div>
                      );
                    })}

                    {g.members.length > 5 && (
                      <div
                        className="avatar"
                        style={{
                          background: 'var(--bg3)',
                          color: 'var(--text2)',
                        }}
                      >
                        +{g.members.length - 5}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      marginTop: 14,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >

                    <button
                      className="btn btn-ghost btn-sm"
                      style={{
                        flex: 1,
                        fontSize: 12,
                      }}
                      onClick={(e) => copyInvite(g, e)}
                    >
                      <Copy size={13} />
                      Copy Invite
                    </button>

                    {g.created_by?.id === currentUser?.id && (
                      <button
                        className="btn btn-danger btn-sm btn-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(g);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Group Modal */}
      {showCreate && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            e.target === e.currentTarget &&
            setShowCreate(false)
          }
        >
          <div className="modal">

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 24,
              }}
            >
              <div
                className="modal-title"
                style={{ margin: 0 }}
              >
                Create Group
              </div>

              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowCreate(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">
                Group Name *
              </label>

              <input
                className="form-input"
                placeholder="e.g. Goa Trip 2025"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    name: e.target.value,
                  }))
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Category
              </label>

              <select
                className="form-select"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    category: e.target.value,
                  }))
                }
              >
                <option value="trip">✈️ Trip</option>
                <option value="flat">🏠 Flat / Home</option>
                <option value="dinner">🍽️ Dinner / Food</option>
                <option value="other">💼 Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Description
              </label>

              <input
                className="form-input"
                placeholder="Optional"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    description: e.target.value,
                  }))
                }
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>

              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleCreate}
                disabled={saving}
              >
                {saving ? 'Creating…' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            e.target === e.currentTarget &&
            setDeleteTarget(null)
          }
        >
          <div
            className="modal"
            style={{ maxWidth: 420 }}
          >
            <div
              style={{
                textAlign: 'center',
                padding: '8px 0 20px',
              }}
            >
              <div
                style={{
                  fontSize: 48,
                  marginBottom: 16,
                }}
              >
                🗑️
              </div>

              <div
                className="modal-title"
                style={{ margin: '0 0 8px' }}
              >
                Delete "{deleteTarget.name}"?
              </div>

              <p
                style={{
                  color: 'var(--text2)',
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                This will permanently delete the group,
                all expenses, and all members.
                This action cannot be undone.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>

              <button
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}