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
