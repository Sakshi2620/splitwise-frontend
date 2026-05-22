import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { getMe, getGroups, getUsers, joinByToken } from './api';
import toast from 'react-hot-toast';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Dashboard from './pages/Dashboard';
import GroupPage from './pages/GroupPage';
import JoinPage from './pages/JoinPage';

export const AppContext = createContext({});
export const useApp = () => useContext(AppContext);

function PrivateRoute({ children }) {
  const token = localStorage.getItem('access_token');
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers]   = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshGroups = () => getGroups().then(setGroups).catch(() => {});
  const refreshUsers  = () => getUsers().then(setUsers).catch(() => {});

  const categoryEmoji = c => ({ trip:'✈️', flat:'🏠', dinner:'🍽️', other:'💼' }[c] ?? '💼');

  const logout = () => {
    localStorage.clear();
    setCurrentUser(null);
    setGroups([]);
    window.location.href = '/login';
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { setLoading(false); return; }
    Promise.all([getMe(), getGroups(), getUsers()])
      .then(([me, g, u]) => { setCurrentUser(me); setGroups(g); setUsers(u); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="loading" style={{ minHeight:'100vh' }}>
      <div className="spinner"/>
      <span>Loading SplitSmart…</span>
    </div>
  );

  return (
    <AppContext.Provider value={{ currentUser, setCurrentUser, users, groups, refreshGroups, refreshUsers, logout, categoryEmoji }}>
      <Routes>
        <Route path="/login"  element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/join/:token" element={<PrivateRoute><JoinPage /></PrivateRoute>} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/group/:id" element={<PrivateRoute><GroupPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppContext.Provider>
  );
}