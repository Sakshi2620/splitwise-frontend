import React, { useState } from 'react';
import { useApp } from '../App';
import { createUser } from '../api';
import { Plus, X } from 'lucide-react';

const COLORS = ['#6366f1','#ec4899','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ef4444','#14b8a6','#f97316','#06b6d4'];

export default function UserManagement() {
  const { users, refreshUsers } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', avatar_color: COLORS[0] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim()) { setError('Name and email required'); return; }
    setSaving(true); setError('');
    try {
      await createUser(form);
      await refreshUsers();
      setShowModal(false);
      setForm({ name:'', email:'', avatar_color: COLORS[0] });
    } catch (e) {
      setError(e.response?.data?.email?.[0] || 'Failed to create user');
    } finally { setSaving(false); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Members</h1>
          <p className="page-sub">{users.length} registered users</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18}/> Add Member
        </button>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {users.map(u => (
          <div key={u.id} className="card" style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div className="avatar avatar-lg" style={{ background: u.avatar_color }}>{u.name[0]}</div>
            <div>
              <div style={{ fontWeight:700 }}>{u.name}</div>
              <div style={{ fontSize:13, color:'var(--text2)' }}>{u.email}</div>
            </div>
            <div style={{ marginLeft:'auto', fontSize:12, color:'var(--text3)' }}>
              Member since {new Date(u.created_at).toLocaleDateString('en-IN', { month:'short', year:'numeric' })}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
              <div className="modal-title" style={{ margin:0 }}>Add Member</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}><X size={16}/></button>
            </div>
            {error && <div className="error-box">{error}</div>}
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" placeholder="e.g. Arjun Sharma"
                value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" placeholder="arjun@example.com"
                value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">Avatar Color</label>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:4 }}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => setForm(f => ({...f, avatar_color: c}))}
                    style={{ width:32, height:32, borderRadius:'50%', background:c, cursor:'pointer',
                      outline: form.avatar_color === c ? '3px solid white' : 'none',
                      outlineOffset:2, transition:'outline .1s' }}/>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={handleCreate} disabled={saving}>
                {saving ? 'Adding…' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}