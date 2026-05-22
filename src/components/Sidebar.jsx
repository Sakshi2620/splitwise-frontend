import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../App';
import { Menu, X, LayoutDashboard, LogOut, ChevronRight } from 'lucide-react';
import NotificationBell from './NotificationBell';

export default function Sidebar() {
  const { currentUser, groups, logout, categoryEmoji } = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  const activeGroup = loc.pathname.startsWith('/group/')
    ? loc.pathname.split('/group/')[1] : null;

  return (
    <>
      {/* Mobile top bar */}
      <div style={{
        display: 'none', position: 'fixed', top: 0, left: 0, right: 0,
        height: 56, background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
        zIndex: 200, padding: '0 16px', alignItems: 'center', justifyContent: 'space-between',
      }} className="mobile-topbar">
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(o => !o)}>
          {open ? <X size={20}/> : <Menu size={20}/>}
        </button>
        <div className="logo-title" style={{ fontSize: 16 }}>SplitSmart</div>
        <NotificationBell/>
      </div>

      <button className="hamburger" onClick={() => setOpen(o => !o)}>
        {open ? <X size={20}/> : <Menu size={20}/>}
      </button>

      {open && (
        <div onClick={() => setOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:99 }}/>
      )}

      <nav className={`sidebar ${open ? 'open' : ''}`}>
        <div className="logo">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="logo-title">SplitSmart</div>
              <div className="logo-sub">SMART EXPENSE SPLITTER</div>
            </div>
            <NotificationBell/>
          </div>
        </div>

        <div className="nav-section">
          <div className="nav-label">Menu</div>
          <button className={`nav-item ${loc.pathname==='/'?'active':''}`}
            onClick={() => { nav('/'); setOpen(false); }}>
            <LayoutDashboard size={18}/> Groups
            {groups.length > 0 && <span className="nav-badge">{groups.length}</span>}
          </button>
        </div>

        {groups.length > 0 && (
          <div className="nav-section" style={{ marginTop: 8 }}>
            <div className="nav-label">Your Groups</div>
            {groups.map(g => (
              <button key={g.id}
                className={`nav-item ${activeGroup===String(g.id)?'active':''}`}
                onClick={() => { nav(`/group/${g.id}`); setOpen(false); }}>
                <span style={{ fontSize: 16 }}>{categoryEmoji(g.category)}</span>
                <span style={{ flex:1, textAlign:'left', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {g.name}
                </span>
                {g.pending_count > 0 && (
                  <span style={{
                    fontSize: 10, background: 'rgba(251,191,36,0.2)',
                    color: 'var(--amber)', borderRadius: 99, padding: '1px 6px',
                  }}>
                    {g.pending_count} pending
                  </span>
                )}
                <ChevronRight size={14} style={{ flexShrink:0, opacity:.4 }}/>
              </button>
            ))}
          </div>
        )}

        <div className="user-switcher">
          {currentUser && (
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <div className="avatar" style={{
                background: currentUser.avatar_color,
                width: 36, height: 36, fontSize: 14, border: 'none',
              }}>
                {currentUser.name[0]}
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:600 }}>{currentUser.name}</div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>{currentUser.email}</div>
              </div>
            </div>
          )}
          <button className="btn btn-ghost btn-sm" style={{ width:'100%' }} onClick={logout}>
            <LogOut size={14}/> Sign Out
          </button>
        </div>
      </nav>
    </>
  );
}