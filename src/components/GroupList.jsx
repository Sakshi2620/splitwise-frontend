import React, { useState } from 'react';
import { useApp } from '../App';
import { createGroup } from '../api';
import { Plus, X } from 'lucide-react';

export default function GroupList({ onSelectGroup }) {
  const { groups, users, currentUser, refreshGroups, categoryEmoji } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name:'', description:'', category:'other', member_ids:[] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const totalSpent = (g) => (g.total_spent_paise / 100).toLocaleString('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 });

  const toggleMember = (uid) => {
    setForm(f => ({
      ...f,
      member_ids: f.member_ids.includes(uid) ? f.member_ids.filter(id => id !== uid) : [...f.member_ids, uid]
    }));
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { setError('Group name is required'); return; }
    if (form.member_ids.length < 2) { setError('Add at least 2 members'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, created_by_id: currentUser?.id };
      await createGroup(payload);
      await refreshGroups();
      setShowModal(false);
      setForm({ name:'', description:'', category:'other', member_ids:[] });
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to create group');
    } finally { setSaving(false); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Your Groups</h1>
          <p className="page-sub">{groups.length} group{groups.length !== 1 ? 's' : ''} · track expenses together</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18}/> New Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🏝️</div>
          <div className="empty-title">No groups yet</div>
          <div className="empty-sub">Create your first group to start tracking shared expenses.</div>
        </div>
      ) : (
        <div className="group-grid">
          {groups.map(g => (
            <div key={g.id} className="group-card" onClick={() => onSelectGroup(g)}>
              <div className="group-emoji">{categoryEmoji(g.category)}</div>
              <div className="group-name">{g.name}</div>
              <div className="group-desc">{g.description || `${g.category} group`}</div>
              <div className="group-meta">
                <div className="group-stat"><strong>{g.expense_count}</strong> expenses</div>
                <div className="group-stat"><strong>{totalSpent(g)}</strong> total</div>
              </div>
              <div className="member-avatars">
                {g.members.slice(0, 5).map(m => (
                  <div key={m.id} className="avatar" style={{ background: m.user.avatar_color }} title={m.user.name}>
                    {m.user.name[0]}
                  </div>
                ))}
                {g.members.length > 5 && (
                  <div className="avatar" style={{ background:'var(--bg3)', color:'var(--text2)' }}>
                    +{g.members.length - 5}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
              <div className="modal-title" style={{ margin:0 }}>Create Group</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}><X size={16}/></button>
            </div>

            {error && <div className="error-box">{error}</div>}

            <div className="form-group">
              <label className="form-label">Group Name *</label>
              <input className="form-input" placeholder="e.g. Goa Trip 2025"
                value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}>
                <option value="trip">✈️ Trip</option>
                <option value="flat">🏠 Flat / Home</option>
                <option value="dinner">🍽️ Dinner / Food</option>
                <option value="other">💼 Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" placeholder="Optional note"
                value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">Members (select 2+)</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:8 }}>
                {users.map(u => (
                  <button key={u.id}
                    className={`chip ${form.member_ids.includes(u.id) ? 'selected' : ''}`}
                    onClick={() => toggleMember(u.id)}>
                    <div className="avatar" style={{ background:u.avatar_color, width:18, height:18, fontSize:9, border:'none' }}>{u.name[0]}</div>
                    {u.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display:'flex', gap:12, marginTop:8 }}>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={handleCreate} disabled={saving}>
                {saving ? 'Creating…' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}