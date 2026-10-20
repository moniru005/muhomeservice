const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
export function apiUrl(path = '') { return `${API_BASE}/${String(path).replace(/^\//, '')}`; }
export async function apiRequest(path, options = {}) {
  const response = await fetch(apiUrl(path), options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}
export default API_BASE;
