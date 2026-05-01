// API klients — visi HTTP pieprasījumi uz backend tiek veikti caur šo moduli

const BASE_URL = 'http://localhost:3000/api';

// Iegūst JWT tokenu no localStorage
function getToken() {
  return localStorage.getItem('uc_token');
}

// Universāla pieprasījuma funkcija
// Automātiski pievieno Authorization galveni ja lietotājs ir pieteicies
// Izmet kļūdu ja atbilde nav veiksmīga (status != 2xx)
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
  // 204 No Content — atbilde bez satura (piemēram dzēšanas gadījumā)
  if (res.status === 204) return null;
  return res.json();
}

// Eksportē visus API izsaukumus sagrupētus pēc resursa
export const api = {
  // Administratora funkcijas
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
  // Autentifikācija
  auth: {
    register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  },
  // Universitāšu operācijas
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
  // Studiju programmu operācijas
  programs: {
    list: () => request('/programs'),
    create: (data) => request('/programs', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => request(`/programs/${id}`, { method: 'DELETE' }),
  },
  // Lietotāja profila operācijas
  profile: {
    updateName: (data) => request('/profile/name', { method: 'PUT', body: JSON.stringify(data) }),
    updatePassword: (data) => request('/profile/password', { method: 'PUT', body: JSON.stringify(data) }),
  },
};
