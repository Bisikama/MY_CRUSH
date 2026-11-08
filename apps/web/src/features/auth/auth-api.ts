import { passwordSchema } from '@duoquest/shared-types';
import { api, type GameIdentity } from '../../lib/client';

export type ChallengeFlow = {
  challengeId: string;
  email: string;
  verified: boolean;
  resendAt: string;
};

export type AuthFlowsResponse = {
  register: ChallengeFlow | null;
  reset: ChallengeFlow | null;
};

export type ChallengePurpose = 'register' | 'reset';

const challengeBasePath = (purpose: ChallengePurpose) =>
  purpose === 'reset' ? '/auth/password-reset' : '/auth/register';

const cancelPurposeValue = (purpose: ChallengePurpose) =>
  purpose === 'reset' ? 'RESET_PASSWORD' : 'REGISTER';

export function getAuthFlows() {
  return api<AuthFlowsResponse>('/auth/flow');
}

export function cancelAuthFlow(purpose: ChallengePurpose) {
  return api<{ ok?: boolean }>('/auth/flow/cancel', {
    purpose: cancelPurposeValue(purpose),
  });
}

export function loginWithPassword(payload: { email: string; password: string }) {
  return api<GameIdentity>('/auth/login', payload);
}

export function startChallenge(purpose: ChallengePurpose, payload: { email: string }) {
  return api<ChallengeFlow>(`${challengeBasePath(purpose)}/start`, payload);
}

export function verifyChallenge(
  purpose: ChallengePurpose,
  payload: { challengeId: string; code: string },
) {
  return api<ChallengeFlow>(`${challengeBasePath(purpose)}/verify`, payload);
}

export function resendChallenge(purpose: ChallengePurpose, payload: { challengeId: string }) {
  return api<ChallengeFlow>(`${challengeBasePath(purpose)}/resend`, payload);
}

export function completeRegistration(payload: {
  challengeId: string;
  nickname: string;
  password: string;
}) {
  return api<GameIdentity>('/auth/register/complete', payload);
}

export function completePasswordReset(payload: { challengeId: string; password: string }) {
  return api<{ ok?: boolean }>('/auth/password-reset/complete', payload);
}

export function validatePassword(password: string): boolean {
  return passwordSchema.safeParse(password).success;
}

export type PasswordQualityTone = 'idle' | 'weak' | 'fair' | 'good' | 'strong';

export interface PasswordQualityResult {
  length: number;
  lengthOk: boolean;
  tooLong: boolean;
  specialOk: boolean;
  valid: boolean;
  activeSegments: 0 | 1 | 2 | 3;
  percent: number;
  tone: PasswordQualityTone;
  levelLabel: string;
  guidance: string;
}

export function evaluatePasswordQuality(password: string): PasswordQualityResult {
  const length = Array.from(password).length;
  const minLengthMet = length >= 9;
  const maxLengthMet = length <= 128;
  const tooLong = length > 128;
  const lengthOk = minLengthMet && maxLengthMet;
  const specialOk = /[\p{P}\p{S}]/u.test(password);
  const hasLetterAndDigit = /\p{L}/u.test(password) && /\p{N}/u.test(password);

  if (length === 0) {
    return {
      length,
      lengthOk: false,
      tooLong: false,
      specialOk: false,
      valid: false,
      activeSegments: 0,
      percent: 0,
      tone: 'idle',
      levelLabel: 'Chưa nhập',
      guidance: 'Gợi ý: Nhập từ 9–128 ký tự kèm ít nhất 1 ký tự đặc biệt (ví dụ: !, @, #).',
    };
  }

  if (tooLong) {
    return {
      length,
      lengthOk: false,
      tooLong: true,
      specialOk,
      valid: false,
      activeSegments: 1,
      percent: 33,
      tone: 'weak',
      levelLabel: 'Quá độ dài',
      guidance: `Mật khẩu đang vượt quá giới hạn (${length}/128 ký tự) — hãy xóa bớt ${length - 128} ký tự.`,
    };
  }

  if (!lengthOk && !specialOk) {
    const remaining = 9 - length;
    return {
      length,
      lengthOk: false,
      tooLong: false,
      specialOk: false,
      valid: false,
      activeSegments: 1,
      percent: Math.max(15, Math.min(45, Math.round((length / 9) * 45))),
      tone: 'weak',
      levelLabel: 'Chưa đạt yêu cầu',
      guidance: `Cần nhập thêm ${remaining} ký tự nữa và ít nhất 1 ký tự đặc biệt (ví dụ: !, @, #).`,
    };
  }

  if (lengthOk && !specialOk) {
    return {
      length,
      lengthOk: true,
      tooLong: false,
      specialOk: false,
      valid: false,
      activeSegments: 2,
      percent: 66,
      tone: 'fair',
      levelLabel: 'Sắp đạt yêu cầu',
      guidance: 'Độ dài đã đạt! Hãy thêm ít nhất 1 ký tự đặc biệt (ví dụ: !, @, #, ?) để hoàn tất.',
    };
  }

  if (!lengthOk && specialOk) {
    const remaining = 9 - length;
    return {
      length,
      lengthOk: false,
      tooLong: false,
      specialOk: true,
      valid: false,
      activeSegments: 2,
      percent: Math.max(50, Math.min(75, 45 + Math.round((length / 9) * 30))),
      tone: 'fair',
      levelLabel: 'Sắp đạt yêu cầu',
      guidance: `Đã có ký tự đặc biệt! Hãy nhập thêm ${remaining} ký tự nữa để đủ tối thiểu 9 ký tự.`,
    };
  }

  if (length >= 12 && hasLetterAndDigit) {
    return {
      length,
      lengthOk: true,
      tooLong: false,
      specialOk: true,
      valid: true,
      activeSegments: 3,
      percent: 100,
      tone: 'strong',
      levelLabel: 'Bảo mật rất tốt ✓',
      guidance: 'Tuyệt vời! Mật khẩu đáp ứng đầy đủ yêu cầu và có độ bảo mật cao.',
    };
  }

  return {
    length,
    lengthOk: true,
    tooLong: false,
    specialOk: true,
    valid: true,
    activeSegments: 3,
    percent: 100,
    tone: 'good',
    levelLabel: 'Đạt yêu cầu ✓',
    guidance:
      'Hợp lệ! Mật khẩu đã đủ điều kiện tạo tài khoản (có thể kết hợp thêm chữ, số và từ 12 ký tự để mạnh hơn).',
  };
}
