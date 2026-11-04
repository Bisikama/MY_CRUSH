import type { Ack, GuestIdentity } from '@duoquest/shared-types';

/** Derive host from the browser: a LAN guest must never call its own localhost. */
export function apiOrigin() {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  const url = new URL(window.location.origin);
  url.port = '4000';
  return url.origin;
}
export async function api<T>(path: string, token?: string, body?: unknown): Promise<T> {
  const response = await fetch(`${apiOrigin()}/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(typeof data.message === 'string' ? data.message : 'Không thể kết nối API');
  return data as T;
}
export const identityKey = 'duoquest.guest.v1';
export const roomStorageKey = (playerId: string) => `duoquest.room.v1:${playerId}`;

export async function copyText(value: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  // Clipboard API needs HTTPS; trusted HTTP LAN still needs a copy fallback.
  const input = document.createElement('textarea');
  input.value = value;
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  try {
    if (!document.execCommand('copy'))
      throw new Error('Không copy tự động được. Hãy sao chép mã phòng trên màn hình.');
  } finally {
    input.remove();
  }
}
export function readIdentity(): GuestIdentity | null {
  try {
    const raw = window.localStorage.getItem(identityKey);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (
      value &&
      typeof value === 'object' &&
      'token' in value &&
      typeof value.token === 'string' &&
      'playerId' in value &&
      typeof value.playerId === 'string' &&
      'nickname' in value &&
      typeof value.nickname === 'string'
    )
      return value as GuestIdentity;
  } catch {
    /* Storage may be unavailable or contain an older format. */
  }
  return null;
}
export function saveIdentity(identity: GuestIdentity) {
  window.localStorage.setItem(identityKey, JSON.stringify(identity));
}
export function request<T>(send: (ack: (result: Ack<T>) => void) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('API chưa phản hồi. Kiểm tra kết nối rồi đồng bộ lại.')),
      8000,
    );
    send((result) => {
      clearTimeout(timer);
      if (result.ok) resolve(result.data);
      else reject(new Error(result.error.message));
    });
  });
}
export function actionId() {
  // randomUUID requires a secure context; getRandomValues also works on trusted HTTP LAN.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
