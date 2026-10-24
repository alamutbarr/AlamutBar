import Constants from 'expo-constants';
import { readKey, writeKey } from './storage';

const URL_KEY = 'alamut.apiUrl';
const TOKEN_KEY = 'alamut.access';
const REFRESH_KEY = 'alamut.refresh';

/** Metro's host on a phone is the computer's LAN address, such as 192.168.1.20:8081. */
export function lanApiUrl(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  if (!host || !/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;
  if (host === '127.0.0.1' || host === '0.0.0.0') return null;
  return `http://${host}:5088`;
}

export function bundledApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  return String(fromEnv || lanApiUrl() || extra?.apiUrl || 'http://127.0.0.1:5088').replace(/\/$/, '');
}

export async function getApiUrl(): Promise<string> {
  return (await readKey(URL_KEY)) || bundledApiUrl();
}

export async function setApiUrl(url: string): Promise<void> {
  await writeKey(URL_KEY, url.replace(/\/$/, ''));
}

export async function getAccessToken(): Promise<string | null> {
  return readKey(TOKEN_KEY);
}

export async function saveSession(token: string, refreshToken: string): Promise<void> {
  await writeKey(TOKEN_KEY, token);
  await writeKey(REFRESH_KEY, refreshToken);
}

export async function clearSession(): Promise<void> {
  await writeKey(TOKEN_KEY, null);
  await writeKey(REFRESH_KEY, null);
}

type Envelope<T> = { success: boolean; message?: string; data: T };

async function refresh(): Promise<boolean> {
  const refreshToken = await readKey(REFRESH_KEY);
  if (!refreshToken) return false;
  const response = await fetch(`${await getApiUrl()}/api/v1/driver/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.data?.token) {
    await clearSession();
    return false;
  }
  await saveSession(json.data.token, json.data.refreshToken);
  return true;
}

export async function api<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers);
  const token = await getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  let response: Response;
  try {
    response = await fetch(`${await getApiUrl()}${path}`, { ...options, headers });
  } catch {
    throw new Error('ارتباط با سرور برقرار نشد.');
  }
  if (response.status === 401 && retry && !path.includes('/auth/')) {
    if (await refresh()) return api<T>(path, options, false);
  }
  const json = (await response.json().catch(() => null)) as Envelope<T> | null;
  if (!response.ok || !json || json.success === false) {
    throw new Error(json?.message || 'ارتباط با سرور برقرار نشد.');
  }
  return json.data;
}
