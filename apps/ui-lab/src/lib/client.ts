import {
  nicknameSchema,
  passwordSchema,
  questionPackSchema,
  summarizePack,
} from '@duoquest/shared-types';
import type { AuthFlowsResponse, ChallengeFlow, ChallengePurpose } from '../features/auth/auth-api';
import { useRoomStore } from '../stores/room.store';
import { demoCode, initialProgress, labData, shopItems } from '../mock/data';
import { labCatalog } from '../mock/packs';

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

const listeners = new Set<() => void>();
const flows: AuthFlowsResponse = { register: null, reset: null };

export function authChanged() {
  for (const listener of listeners) listener();
}

export function onAuthChanged(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export async function loadIdentity() {
  return labData.identity;
}

export function isLocalAccountHost() {
  return true;
}

export function actionId() {
  return crypto.randomUUID();
}

export async function copyText(value: string) {
  if (!navigator.clipboard?.writeText) throw new Error('Hãy sao chép mã phòng trên màn hình.');
  await navigator.clipboard.writeText(value);
}

function requireNoRoom() {
  if (useRoomStore.getState().currentRoom) {
    throw new ApiError(409, 'CONFLICT', 'Hãy rời phòng trước khi đổi hồ sơ.');
  }
}

function requireIdentity() {
  if (!labData.identity)
    throw new ApiError(401, 'UNAUTHORIZED', 'Hãy tạo hồ sơ khách ở trang Chơi trước.');
  return labData.identity;
}

function openChallenge(email: string): ChallengeFlow {
  return {
    challengeId: actionId(),
    email,
    verified: false,
    resendAt: new Date(Date.now() + 5000).toISOString(),
  };
}

function handleChallenge(
  purpose: ChallengePurpose,
  operation: string,
  input: Record<string, unknown>,
) {
  if (operation === 'start') {
    const email = String(input.email).trim().toLowerCase();
    if (purpose === 'register' && email === labData.account.email) {
      throw new ApiError(409, 'EMAIL_ALREADY_REGISTERED', 'Email mẫu này đã được đăng ký.');
    }
    return (flows[purpose] = openChallenge(email));
  }
  const flow = flows[purpose];
  if (!flow || flow.challengeId !== input.challengeId) {
    throw new ApiError(404, 'NOT_FOUND', 'Hãy bắt đầu lại bước gửi mã mẫu.');
  }
  if (operation === 'verify') {
    if (input.code !== demoCode)
      throw new ApiError(400, 'INVALID_CODE', 'Mã không đúng. Mã thử là 123456.');
    return (flows[purpose] = { ...flow, verified: true });
  }
  if (operation === 'resend') return (flows[purpose] = openChallenge(flow.email));
  if (operation !== 'complete' || !flow.verified) {
    throw new ApiError(400, 'INVALID_INPUT', 'Hãy xác minh mã mẫu trước khi tiếp tục.');
  }
  const password = passwordSchema.parse(input.password);
  if (purpose === 'reset') {
    if (flow.email === labData.account.email) labData.password = password;
    flows.reset = null;
    return { ok: true };
  }
  requireNoRoom();
  const identity: GameIdentity = {
    ...labData.account,
    playerId: labData.identity?.playerId ?? labData.account.playerId,
    nickname: nicknameSchema.parse(input.nickname),
    email: flow.email,
  };
  labData.account = identity;
  labData.password = password;
  labData.identity = identity;
  flows.register = null;
  return identity;
}

function handleMockRequest(path: string, body: unknown) {
  const input = (body ?? {}) as Record<string, unknown>;
  const challenge = /^\/auth\/(register|password-reset)\/(start|resend|verify|complete)$/.exec(
    path,
  );
  if (challenge)
    return handleChallenge(
      challenge[1] === 'register' ? 'register' : 'reset',
      challenge[2]!,
      input,
    );
  switch (path) {
    case '/auth/flow':
      return { ...flows };
    case '/auth/flow/cancel':
      flows[input.purpose === 'REGISTER' ? 'register' : 'reset'] = null;
      return { ok: true };
    case '/auth/login':
      requireNoRoom();
      if (
        String(input.email).trim().toLowerCase() !== labData.account.email ||
        input.password !== labData.password
      ) {
        throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu mẫu không đúng.');
      }
      return (labData.identity = labData.account);
    case '/auth/password/change':
      if (requireIdentity().kind !== 'account' || input.currentPassword !== labData.password) {
        throw new ApiError(401, 'INVALID_CREDENTIALS', 'Mật khẩu mẫu hiện tại không đúng.');
      }
      labData.password = passwordSchema.parse(input.password);
      return { ok: true };
    case '/auth/logout':
    case '/auth/logout-all':
      requireNoRoom();
      labData.identity = null;
      flows.register = flows.reset = null;
      return { ok: true };
    case '/players/guest': {
      const identity: GameIdentity = {
        kind: 'guest',
        playerId: actionId(),
        nickname: nicknameSchema.parse(input.nickname),
        email: null,
        role: null,
      };
      labData.progress[identity.playerId] = initialProgress(false);
      return (labData.identity = identity);
    }
    case '/question-packs':
      requireIdentity();
      if (body === undefined) {
        return labData.packs.map(({ id, pack, trusted }) => summarizePack(id, pack, trusted));
      }
      labData.packs.push({ id: actionId(), pack: questionPackSchema.parse(body), trusted: false });
      return { ok: true };
    case '/question-packs/preview':
      requireIdentity();
      return {
        pack: questionPackSchema.parse(body),
        warning: 'Bộ đề thử dùng ảnh minh họa local và chỉ được lưu trong UI Lab.',
      };
    case '/question-packs/casual-catalog':
      requireIdentity();
      return labCatalog(labData.packs);
  }

  const identity = requireIdentity();
  const progress = labData.progress[identity.playerId]!;
  switch (path) {
    case '/players/me':
      return {
        id: identity.playerId,
        nickname: identity.nickname,
        xp: progress.xp,
        wallet: { balance: progress.balance },
      };
    case '/players/me/history':
      return [...progress.history];
    case '/shop/items':
      return shopItems;
    case '/shop/inventory':
      return {
        items: Object.entries(progress.items).map(([itemId, quantity]) => ({ itemId, quantity })),
        loadout: progress.loadout,
      };
    case '/shop/purchases': {
      const item = shopItems.find(({ id }) => id === input.itemId);
      const requestId = String(input.requestId);
      if (progress.purchases.has(requestId)) return { ok: true };
      if (
        !item ||
        progress.balance < item.price ||
        (item.kind === 'SKILL' && identity.kind !== 'account') ||
        (item.kind === 'COSMETIC' && progress.items[item.id])
      ) {
        throw new ApiError(409, 'CONFLICT', 'Không thể đổi vật phẩm mẫu này.');
      }
      progress.balance -= item.price;
      progress.items[item.id] = (progress.items[item.id] ?? 0) + 1;
      progress.purchases.add(requestId);
      return { ok: true };
    }
    case '/shop/equip': {
      const item = shopItems.find(({ id }) => id === input.itemId);
      if (!item?.slot || !progress.items[item.id]) {
        throw new ApiError(409, 'CONFLICT', 'Bạn chưa có vật phẩm để trang bị.');
      }
      progress.loadout = [
        ...progress.loadout.filter(({ slot }) => slot !== item.slot),
        { itemId: item.id, slot: item.slot },
      ];
      return { ok: true };
    }
    default:
      throw new ApiError(404, 'NOT_FOUND', 'Thao tác này chưa có dữ liệu mẫu.');
  }
}

/** Calls stay in this tab. There is no HTTP transport. */
export async function api<T = unknown>(path: string, body?: unknown): Promise<T> {
  return handleMockRequest(path, body) as T;
}
