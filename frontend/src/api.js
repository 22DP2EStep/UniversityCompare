const BASE_URL = 'http://localhost:3000/api';

function getToken() {
  return localStorage.getItem('uc_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    headers,
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  admin: {
    users: {
      list: () => request('/admin/users'),
      setRole: (id, role, expert_university_id = null) => request(`/admin/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role, expert_university_id }) }),
      delete: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
    },
    universities: {
      list: () => request('/admin/universities'),
      create: (data) => request('/admin/universities', { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) => request(`/admin/universities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id) => request(`/admin/universities/${id}`, { method: 'DELETE' }),
    },
  },
  auth: {
    register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  },
  universities: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/universities${qs ? '?' + qs : ''}`);
    },
    filterOptions: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/universities/filter-options${qs ? '?' + qs : ''}`);
    },
    get: (id) => request(`/universities/${id}`),
    create: (data) => request('/universities', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/universities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/universities/${id}`, { method: 'DELETE' }),
  },
  programs: {
    list: () => request('/programs'),
    create: (data) => request('/programs', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => request(`/programs/${id}`, { method: 'DELETE' }),
  },
  profile: {
    updateName: (data) => request('/profile/name', { method: 'PUT', body: JSON.stringify(data) }),
    updatePassword: (data) => request('/profile/password', { method: 'PUT', body: JSON.stringify(data) }),
  },
};
