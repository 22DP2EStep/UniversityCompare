const BASE_URL = 'http://localhost:3000/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
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
  universities: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/universities${qs ? '?' + qs : ''}`);
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
};
