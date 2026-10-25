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

function pdfMagic(bytes) {
  return bytes.length >= 5 && String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4]) === '%PDF-';
}

export async function download(path, filename) {
  const response = await api(path, { raw: true });
  if (!response.ok) {
    let message = 'دانلود ناموفق بود.';
    const text = await response.text().catch(() => '');
    if (text.trim().startsWith('{')) {
      try { message = JSON.parse(text).message || message; } catch { /* پاسخ خطا متن نیست */ }
    }
    throw new Error(message);
  }
  const type = (response.headers.get('content-type') || '').toLowerCase();
  if (type.includes('text/html') || type.includes('application/json')) {
    throw new Error('پاسخ دانلود فایل نیست.');
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const wantPdf = /\.pdf$/i.test(filename || '');
  if (wantPdf && (!type.includes('application/pdf') || !pdfMagic(bytes))) {
    throw new Error('پروندهٔ دریافتی PDF معتبر نیست.');
  }
  const blob = new Blob([bytes], { type: wantPdf ? 'application/pdf' : (type || 'application/octet-stream') });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
