import { failureMessage, savePlan } from './downloadGuard.mjs';

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

async function chooseSaveHandle(filename) {
  if (typeof window.showSaveFilePicker !== 'function' || navigator.webdriver) return null;
  try {
    return await window.showSaveFilePicker({
      suggestedName: filename,
      types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }],
    });
  } catch (error) {
    if (error && error.name === 'AbortError') throw error;
    return null;
  }
}

function saveWithAnchor(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 15000);
}

export async function download(path, filename) {
  const wantPdf = /\.pdf$/i.test(filename || '');
  const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
  let handle = null;
  try {
    handle = wantPdf ? await chooseSaveHandle(filename) : null;
  } catch (error) {
    if (error && error.name === 'AbortError') return { cancelled: true };
    throw error;
  }
  const response = await api(path, { raw: true });
  const type = response.headers.get('content-type') || '';
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(failureMessage({ ok: false, bodyText: text, contentType: type, wantPdf }) || 'دانلود ناموفق بود.');
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const message = failureMessage({ ok: true, contentType: type, bytes, wantPdf });
  if (message) throw new Error(message);
  if (handle) {
    const writable = await handle.createWritable();
    await writable.write(bytes);
    await writable.close();
    return { saved: true };
  }
  const blob = new Blob([bytes], { type: wantPdf ? 'application/pdf' : (type || 'application/octet-stream') });
  const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started;
  if (savePlan({ hasHandle: false, elapsedMs: elapsed, wantPdf }) === 'manual') {
    return { needsGesture: true, url: URL.createObjectURL(blob), filename };
  }
  saveWithAnchor(blob, filename);
  return { saved: true };
}
