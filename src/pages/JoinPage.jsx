import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { joinByToken } from '../api';
import { useApp } from '../App';
import toast from 'react-hot-toast';

export default function JoinPage() {
  const { token } = useParams();
  const nav = useNavigate();
  const { refreshGroups } = useApp();
  const [status, setStatus] = useState('joining');

  useEffect(() => {
    joinByToken(token)
      .then(async (data) => {
        await refreshGroups();
        toast.success(data.message);
        nav(`/group/${data.group.id}`);
      })
      .catch(() => {
        setStatus('error');
        toast.error('Invalid or expired invite link');
        setTimeout(() => nav('/'), 2000);
      });
  }, [token]);

  return (
    <div className="loading" style={{ minHeight:'100vh' }}>
      {status === 'joining' ? (
        <><div className="spinner"/><span>Joining group…</span></>
      ) : (
        <span>Invalid invite link. Redirecting…</span>
      )}
    </div>
  );
}