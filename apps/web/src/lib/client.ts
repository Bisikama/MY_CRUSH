import type { Ack } from '@duoquest/shared-types';

/** Derive host from the browser: a LAN guest must never call its own localhost. */
export function apiOrigin() {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  const url = new URL(window.location.origin);
  url.port = '4000';
  return url.origin;
}
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export type GameIdentity = {
  kind: 'guest' | 'account';
  playerId: string;
  nickname: string;
  email: string | null;
  role: 'PLAYER' | 'ADMIN' | null;
};

async function readResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(
      response.status,
      typeof data.code === 'string' ? data.code : '',
      typeof data.message === 'string' ? data.message : 'Không thể kết nối API.',
    );
  return data as T;
}

let csrfRequest: Promise<string> | undefined;
function csrf() {
  if (!csrfRequest) {
    csrfRequest = fetch(apiOrigin() + '/api/auth/csrf', {
      credentials: 'include',
      cache: 'no-store',
    })
      .then(readResponse<{ csrfToken: string }>)
      .then((data) => data.csrfToken)
      .finally(() => {
        csrfRequest = undefined;
      });
  }
  return csrfRequest;
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const write = body !== undefined;
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(apiOrigin() + '/api' + path, {
      method: write ? 'POST' : 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: write ? { 'Content-Type': 'application/json', 'X-CSRF-Token': await csrf() } : {},
      body: write ? JSON.stringify(body) : undefined,
    });
    try {
      return await readResponse<T>(response);
    } catch (error) {
      if (!(write && attempt === 0 && error instanceof ApiError && error.code === 'CSRF_INVALID'))
        throw error;
    }
  }
}

const identityKey = 'duoquest.guest.v1';
let identityRequest: Promise<GameIdentity | null> | undefined;
export function loadIdentity() {
  if (!identityRequest)
    identityRequest = (async () => {
      const current = await api<GameIdentity | { kind: 'anonymous' }>('/auth/me');
      if (current.kind !== 'anonymous') return current;
      let legacy: string | undefined;
      try {
        const value = JSON.parse(localStorage.getItem(identityKey) ?? 'null') as {
          token?: unknown;
        } | null;
        if (typeof value?.token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value.token))
          legacy = value.token;
      } catch {
        /* Browser storage may be unavailable. */
      }
      if (!legacy) return null;
      try {
        await api('/auth/guest/migrate', { token: legacy });
      } catch (error) {
        if (!(error instanceof ApiError && [401, 409].includes(error.status))) throw error;
      }
      const next = await api<GameIdentity | { kind: 'anonymous' }>('/auth/me');
      if (next.kind === 'anonymous') return null;
      localStorage.removeItem(identityKey);
      return next;
    })().finally(() => {
      identityRequest = undefined;
    });
  return identityRequest;
}

export function authChanged() {
  if (typeof BroadcastChannel === 'undefined') return;
  const channel = new BroadcastChannel('duoquest-auth');
  channel.postMessage('changed');
  channel.close();
}

export function onAuthChanged(callback: () => void) {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  const channel = new BroadcastChannel('duoquest-auth');
  channel.onmessage = callback;
  return () => channel.close();
}

export function isLocalAccountHost() {
  return ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
}

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
