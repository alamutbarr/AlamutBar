const ACCESS = 'alamut_inspector_access';
const REFRESH = 'alamut_inspector_refresh';

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

async function raw(path, { method = 'GET', body, token, form } = {}) {
  return fetch(`/api/v1/inspector${path}`, {
    method,
    headers: {
      ...(body && !form ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form || (body ? JSON.stringify(body) : undefined),
  });
}

async function withAuth(path, options) {
  let token = getAccess();
  let response = await raw(path, { ...options, token });
  if (response.status === 401 && localStorage.getItem(REFRESH) && path !== '/auth/refresh') {
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
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.success === false) {
    const error = new Error(json.message || 'خطا در ارتباط با سرور');
    error.status = response.status;
    throw error;
  }
  return json.data;
}

export function api(path, options) {
  return withAuth(path, options);
}

export function upload(path, file, fields) {
  const form = new FormData();
  form.append('file', file);
  Object.entries(fields).forEach(([key, value]) => form.append(key, value));
  return withAuth(path, { method: 'POST', form });
}
