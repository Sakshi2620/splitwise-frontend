import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markAllRead, markOneRead } from '../api';
import { Bell } from 'lucide-react';

export default function NotificationBell() {
  const [notifs, setNotifs]   = useState([]);
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const nav   = useNavigate();
  const ref   = useRef(null);

  const unread = notifs.filter(n => !n.is_read).length;

  const load = async () => {
    setLoading(true);
    try {
      const data = await getNotifications();
      setNotifs(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open) load();
  };

  const handleMarkAll = async () => {
    await markAllRead();
    setNotifs(n => n.map(x => ({ ...x, is_read: true })));
  };

  const handleClick = async (n) => {
    if (!n.is_read) {
      await markOneRead(n.id);
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    }
    if (n.group) nav(`/group/${n.group}`);
    setOpen(false);
  };

  const typeIcon = (type) => ({
    group_invite:  '👥',
    group_joined:  '🎉',
    expense_added: '💸',
  }[type] || '🔔');

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        style={{
          position: 'relative', background: 'var(--bg3)',
          border: '1px solid var(--border)', borderRadius: 10,
          padding: '8px', cursor: 'pointer', color: 'var(--text2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .15s',
        }}
      >
        <Bell size={18}/>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: 'var(--red)', color: '#fff',
            fontSize: 9, fontWeight: 700,
            width: 16, height: 16, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg2)',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '110%', right: 0,
          width: 340, maxHeight: 420, overflowY: 'auto',
          background: 'var(--bg2)', border: '1px solid var(--border2)',
          borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          zIndex: 500,
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px 10px', borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications</span>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                style={{
                  background: 'none', border: 'none', color: 'var(--accent2)',
                  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)' }}>
              <div className="spinner" style={{ margin: '0 auto' }}/>
            </div>
          ) : notifs.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text3)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
              <div style={{ fontSize: 13 }}>No notifications yet</div>
            </div>
          ) : (
            notifs.map(n => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  display: 'flex', gap: 12, padding: '12px 16px',
                  cursor: 'pointer', transition: 'background .12s',
                  background: n.is_read ? 'transparent' : 'rgba(124,111,247,0.06)',
                  borderBottom: '1px solid var(--border)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                onMouseLeave={e => e.currentTarget.style.background = n.is_read ? 'transparent' : 'rgba(124,111,247,0.06)'}
              >
                <div style={{ fontSize: 22, flexShrink: 0 }}>{typeIcon(n.type)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: n.is_read ? 400 : 600, marginBottom: 2 }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.4 }}>
                    {n.message}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                    {new Date(n.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>
                {!n.is_read && (
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: 'var(--accent)', flexShrink: 0, marginTop: 4,
                  }}/>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}