const ACCESS = 'alamut_admin_access';
const REFRESH = 'alamut_admin_refresh';

export function getAccess() {
  return localStorage.getItem(ACCESS);
}

export function saveSession(token, refreshToken) {
  localStorage.setItem(ACCESS, token);
  localStorage.setItem(REFRESH, refreshToken);
}

export function clearSession() {
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
}

async function raw(path, { method = 'GET', body, token } = {}) {
  return fetch(`/api/admin${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function api(path, options = {}) {
  let token = getAccess();
  let response = await raw(path, { ...options, token });
  if (response.status === 401 && localStorage.getItem(REFRESH) && !path.startsWith('/auth/refresh')) {
    const refreshed = await raw('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: localStorage.getItem(REFRESH) },
    });
    if (refreshed.ok) {
      const payload = await refreshed.json();
      saveSession(payload.data.token, payload.data.refreshToken);
      token = payload.data.token;
      response = await raw(path, { ...options, token });
    }
  }
  if (options.raw) return response;
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.success === false) {
    const error = new Error(json.message || 'خطا در ارتباط با سرور');
    error.status = response.status;
    throw error;
  }
  return json.data;
}

export async function download(path, filename) {
  const response = await api(path, { raw: true });
  if (!response.ok) throw new Error('دانلود پرونده ناموفق بود.');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
