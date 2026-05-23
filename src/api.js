import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'https://splitwise-backend-j4uh.onrender.com/api';
const api  = axios.create({ baseURL: BASE });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('access_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  async err => {
    const orig = err.config;
    if (err.response?.status === 401 && !orig._retry) {
      orig._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE}/auth/refresh/`, { refresh });
          localStorage.setItem('access_token', data.access);
          orig.headers.Authorization = `Bearer ${data.access}`;
          return api(orig);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);

// Auth
export const register = (d) => api.post('/auth/register/', d).then(r => r.data);
export const login    = (d) => api.post('/auth/login/', d).then(r => r.data);
export const getMe    = ()  => api.get('/auth/me/').then(r => r.data);

// Users
export const getUsers = () => api.get('/users/').then(r => r.data);

// Groups
export const getGroups        = ()          => api.get('/groups/').then(r => r.data);
export const getGroup         = (id)        => api.get(`/groups/${id}/`).then(r => r.data);
export const createGroup      = (d)         => api.post('/groups/', d).then(r => r.data);
export const deleteGroup      = (id)        => api.delete(`/groups/${id}/`).then(r => r.data);
export const getGroupBalances = (gid)       => api.get(`/groups/${gid}/balances/`).then(r => r.data);
export const getGroupExpenses = (gid, p={}) => api.get(`/groups/${gid}/expenses/`, { params: p }).then(r => r.data);
export const joinByToken      = (token)     => api.get(`/groups/join/${token}/`).then(r => r.data);

// Members
export const getGroupMembers = (gid)               => api.get(`/groups/${gid}/members/`).then(r => r.data);
export const addMember       = (gid, name, email)  => api.post(`/groups/${gid}/members/add/`, { name, email }).then(r => r.data);
export const removeMember    = (gid, memberId)     => api.delete(`/groups/${gid}/members/remove/${memberId}/`).then(r => r.data);

// Expenses
export const createExpense    = (d)         => api.post('/expenses/', d).then(r => r.data);
export const updateExpense    = (id, d)     => api.put(`/expenses/${id}/`, d).then(r => r.data);
export const deleteExpense    = (id)        => api.delete(`/expenses/${id}/`).then(r => r.data);
export const parseExpenseText = (text, gid) => api.post('/expenses/parse-text/', { text, group_id: gid }).then(r => r.data);
export const parseBillText    = (text)      => api.post('/expenses/parse-bill/', { text }).then(r => r.data);

// Notifications
export const getNotifications = ()   => api.get('/notifications/').then(r => r.data);
export const markAllRead      = ()   => api.post('/notifications/mark-read/').then(r => r.data);
export const markOneRead      = (id) => api.post(`/notifications/${id}/read/`).then(r => r.data);

// Add these to your existing api.js

export const getGroupSettlements = (groupId) =>
  api.get(`/settlements/group/${groupId}/`).then(r => r.data);

export const getSettlementDetail = (id) =>
  api.get(`/settlements/detail/${id}/`).then(r => r.data);

export const paySettlement = (id, amount, note = '') =>
  api.post(`/settlements/${id}/pay/`, { amount, note }).then(r => r.data);

export default api;