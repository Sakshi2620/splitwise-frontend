import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api';
import { useApp } from '../App';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const { setCurrentUser, refreshGroups } = useApp();
  const nav = useNavigate();
  const [form, setForm] = useState({ name:'', email:'', password:'' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { toast.error('Fill in all fields'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const data = await register(form);
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      setCurrentUser(data.user);
      await refreshGroups();
      toast.success(`Welcome to SplitSmart, ${data.user.name.split(' ')[0]}!`);
      nav('/');
    } catch (err) {
      const errs = err.response?.data?.errors;
      const msg = errs ? Object.values(errs).flat()[0] : 'Signup failed';
      toast.error(msg);
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-title">SplitSmart</div>
          <div className="logo-sub">SMART EXPENSE SPLITTER</div>
        </div>
        <h2 className="auth-title">Create account</h2>
        <p className="auth-sub">Start splitting expenses with friends</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" placeholder="Arjun Sharma"
              value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}/>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="you@example.com"
              value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}/>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="Min. 6 characters"
              value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))}/>
          </div>
          <button className="btn btn-primary" style={{ width:'100%', marginTop:8 }} disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}