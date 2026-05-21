import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
});

export const getUsers         = ()          => api.get('/users/').then(r => r.data);
export const createUser       = (d)         => api.post('/users/', d).then(r => r.data);
export const getGroups        = ()          => api.get('/groups/').then(r => r.data);
export const getGroup         = (id)        => api.get(`/groups/${id}/`).then(r => r.data);
export const createGroup      = (d)         => api.post('/groups/', d).then(r => r.data);
export const addMember        = (gid, uid)  => api.post(`/groups/${gid}/add-member/`, { user_id: uid }).then(r => r.data);
export const removeMember     = (gid, uid)  => api.delete(`/groups/${gid}/remove-member/${uid}/`).then(r => r.data);
export const getGroupBalances = (gid)       => api.get(`/groups/${gid}/balances/`).then(r => r.data);
export const getGroupExpenses = (gid, p={}) => api.get(`/groups/${gid}/expenses/`, { params: p }).then(r => r.data);
export const createExpense    = (d)         => api.post('/expenses/', d).then(r => r.data);
export const deleteExpense    = (id)        => api.delete(`/expenses/${id}/`).then(r => r.data);
export const parseExpenseText = (text, gid) => api.post('/expenses/parse-text/', { text, group_id: gid }).then(r => r.data);
export const parseBillText    = (text)      => api.post('/expenses/parse-bill/', { text }).then(r => r.data);

export default api;