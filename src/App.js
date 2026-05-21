import React, { useState, useEffect, createContext, useContext } from 'react';
import { getUsers, getGroups } from './api';
import GroupList from './components/GroupList';
import GroupDetail from './components/GroupDetail';
import UserManagement from './components/UserManagement';
import { Menu, X, LayoutDashboard, Users, ChevronRight } from 'lucide-react';

export const AppContext = createContext({});
export const useApp = () => useContext(AppContext);

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers]   = useState([]);
  const [groups, setGroups] = useState([]);
  const [page, setPage]     = useState('groups');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getUsers(), getGroups()]).then(([u, g]) => {
      setUsers(u); setGroups(g);
      if (u.length) setCurrentUser(u[0]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const refreshGroups = () => getGroups().then(setGroups);
  const refreshUsers  = () => getUsers().then(setUsers);
  const categoryEmoji = c => ({ trip:'✈️', flat:'🏠', dinner:'🍽️', other:'💼' }[c] ?? '💼');

  const navTo = (p, group = null) => { setPage(p); setSelectedGroup(group); setSidebarOpen(false); };

  if (loading) return (
    <div className="loading" style={{ minHeight: '100vh' }}>
      <div className="spinner" /><span>Loading SplitSmart…</span>
    </div>
  );

  return (
    <AppContext.Provider value={{ currentUser, users, groups, refreshGroups, refreshUsers, categoryEmoji }}>
      <div className="app">
        <button className="hamburger" onClick={() => setSidebarOpen(o => !o)}>
          {sidebarOpen ? <X size={20}/> : <Menu size={20}/>}
        </button>

        {sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:99 }} />
        )}

        <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="logo">
            <div className="logo-title">SplitSmart</div>
            <div className="logo-sub">SMART EXPENSE SPLITTER</div>
          </div>

          <div className="nav-section">
            <div className="nav-label">Menu</div>
            <button className={`nav-item ${page==='groups'?'active':''}`} onClick={() => navTo('groups')}>
              <LayoutDashboard size={18}/> Groups
              {groups.length > 0 && <span className="nav-badge">{groups.length}</span>}
            </button>
            <button className={`nav-item ${page==='users'?'active':''}`} onClick={() => navTo('users')}>
              <Users size={18}/> Members
            </button>
          </div>

          {groups.length > 0 && (
            <div className="nav-section" style={{ marginTop:8 }}>
              <div className="nav-label">Your Groups</div>
              {groups.map(g => (
                <button key={g.id}
                  className={`nav-item ${selectedGroup?.id===g.id?'active':''}`}
                  onClick={() => navTo('group', g)}>
                  <span style={{ fontSize:16 }}>{categoryEmoji(g.category)}</span>
                  <span style={{ flex:1, textAlign:'left', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {g.name}
                  </span>
                  <ChevronRight size={14} style={{ flexShrink:0, opacity:.4 }}/>
                </button>
              ))}
            </div>
          )}

          <div className="user-switcher">
            <label>ACTIVE USER</label>
            <select className="user-select"
              value={currentUser?.id || ''}
              onChange={e => setCurrentUser(users.find(u => u.id === +e.target.value))}>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            {currentUser && (
              <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:10 }}>
                <div className="avatar" style={{ background:currentUser.avatar_color, width:28, height:28, fontSize:11, border:'none' }}>
                  {currentUser.name[0]}
                </div>
                <span style={{ fontSize:12, color:'var(--text2)' }}>{currentUser.email}</span>
              </div>
            )}
          </div>
        </nav>

        <main className="main">
          {page==='groups' && <GroupList onSelectGroup={g => navTo('group', g)} />}
          {page==='group'  && selectedGroup && <GroupDetail group={selectedGroup} onBack={() => navTo('groups')} />}
          {page==='users'  && <UserManagement />}
        </main>
      </div>
    </AppContext.Provider>
  );
}