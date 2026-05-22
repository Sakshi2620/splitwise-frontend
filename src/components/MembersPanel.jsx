import React, { useState } from 'react';
import { useApp } from '../App';
import { addMember, removeMember } from '../api';
import { UserPlus, Trash2, Crown, Copy, Clock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MembersPanel({ group, onRefresh }) {
  const { currentUser } = useApp();
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [adding,   setAdding]   = useState(false);
  const [removing, setRemoving] = useState(null);
  const [error,    setError]    = useState('');

  const isAdmin = group.created_by?.id === currentUser?.id;

  const activeMembers  = group.members.filter(m => !m.is_pending);
  const pendingMembers = group.members.filter(m =>  m.is_pending);

  const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleAdd = async () => {
    setError('');
    if (!name.trim())  { setError('Name is required');            return; }
    if (!email.trim()) { setError('Email is required');           return; }
    if (!validateEmail(email)) { setError('Enter a valid email'); return; }
    setAdding(true);
    try {
      const res = await addMember(group.id, name.trim(), email.trim().toLowerCase());
      toast.success(res.message);
      setName(''); setEmail('');
      await onRefresh();
    } catch (e) {
      const msg = e.response?.data?.error || 'Failed to add member';
      setError(msg);
      toast.error(msg);
    } finally { setAdding(false); }
  };

  const handleRemove = async (member) => {
    const label = member.display_name || member.display_email;
    if (!window.confirm(`Remove ${label} from this group?`)) return;
    setRemoving(member.id);
    try {
      await removeMember(group.id, member.id);
      toast.success(`${label} removed`);
      await onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to remove member');
    } finally { setRemoving(null); }
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
      toast(`Link: ${text}`, { duration: 8000 });
    }
    document.body.removeChild(el);
  };

  const copyInvite = () => {
    const url = `${window.location.origin}/join/${group.invite_link}`;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url)
        .then(() => toast.success('Invite link copied!'))
        .catch(() => fallbackCopy(url));
    } else {
      fallbackCopy(url);
    }
  };

  return (
    <div>
      {/* Invite link */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(124,111,247,0.08), rgba(244,114,182,0.05))',
        border: '1px solid rgba(124,111,247,0.2)',
        borderRadius: 'var(--r)', padding: '16px 20px',
        marginBottom: 24, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent2)', marginBottom: 4 }}>
            🔗 Shareable Invite Link
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', wordBreak: 'break-all' }}>
            {window.location.origin}/join/{group.invite_link}
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={copyInvite}>
          <Copy size={14}/> Copy Link
        </button>
      </div>

      {/* Add member form — admin only */}
      {isAdmin && (
        <div style={{ marginBottom: 28 }}>
          <div className="section-title">Add Member</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              className="form-input"
              placeholder="Full Name *"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              style={{ flex: '1 1 160px' }}
            />
            <input
              className="form-input"
              type="email"
              placeholder="Email Address *"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              style={{ flex: '2 1 220px' }}
            />
            <button className="btn btn-primary" onClick={handleAdd} disabled={adding}>
              {adding ? 'Adding…' : <><UserPlus size={16}/> Add</>}
            </button>
          </div>
          {error && <div className="error-box" style={{ marginTop: 10 }}>{error}</div>}
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>
            If the person doesn't have an account yet, they'll be added as pending and
            get access automatically when they sign up with this email.
          </p>
        </div>
      )}

      {/* Active members */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <CheckCircle size={15} style={{ color: 'var(--green)' }}/>
          <span className="section-title" style={{ margin: 0 }}>
            Active Members ({activeMembers.length})
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {activeMembers.map(m => (
            <MemberRow
              key={m.id}
              member={m}
              isAdmin={isAdmin}
              currentUserId={currentUser?.id}
              creatorId={group.created_by?.id}
              removing={removing}
              onRemove={handleRemove}
            />
          ))}
        </div>
      </div>

      {/* Pending members */}
      {pendingMembers.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Clock size={15} style={{ color: 'var(--amber)' }}/>
            <span className="section-title" style={{ margin: 0 }}>
              Pending ({pendingMembers.length}) — waiting to sign up
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendingMembers.map(m => (
              <MemberRow
                key={m.id}
                member={m}
                isAdmin={isAdmin}
                currentUserId={currentUser?.id}
                creatorId={group.created_by?.id}
                removing={removing}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MemberRow({ member, isAdmin, currentUserId, creatorId, removing, onRemove }) {
  const isCreator = member.user?.id === creatorId;
  const isYou     = member.user?.id === currentUserId;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      background: member.is_pending ? 'rgba(251,191,36,0.04)' : 'var(--bg2)',
      border: `1px solid ${member.is_pending ? 'rgba(251,191,36,0.15)' : 'var(--border)'}`,
      borderRadius: 'var(--r2)',
      opacity: member.is_pending ? 0.85 : 1,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        background: member.avatar_color || '#6366f1',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, fontWeight: 700, color: '#fff',
      }}>
        {(member.display_name || '?')[0].toUpperCase()}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{member.display_name}</span>
          {isCreator && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 10, color: 'var(--amber)',
              background: 'rgba(251,191,36,0.1)',
              border: '1px solid rgba(251,191,36,0.2)',
              borderRadius: 99, padding: '1px 7px',
            }}>
              <Crown size={9}/> Admin
            </span>
          )}
          {isYou && (
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>(you)</span>
          )}
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '1px 8px', borderRadius: 99,
            background: member.is_pending ? 'rgba(251,191,36,0.12)' : 'rgba(52,211,153,0.12)',
            color:      member.is_pending ? 'var(--amber)'           : 'var(--green)',
            border: `1px solid ${member.is_pending ? 'rgba(251,191,36,0.25)' : 'rgba(52,211,153,0.25)'}`,
          }}>
            {member.is_pending ? '⏳ Pending' : '✓ Joined'}
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
          {member.display_email}
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
        {new Date(member.joined_at).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'short',
        })}
      </div>

      {isAdmin && !isCreator && (
        <button
          className="btn btn-danger btn-sm btn-icon"
          onClick={() => onRemove(member)}
          disabled={removing === member.id}
          title="Remove member"
        >
          <Trash2 size={14}/>
        </button>
      )}
    </div>
  );
}