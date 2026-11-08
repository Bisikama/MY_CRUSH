import { describe, expect, it } from 'vitest';
import { evaluatePasswordQuality, validatePassword } from './auth-api';
import { sanitizeOtpCode } from './components/otp-input';
import { createEmailChallengeStore, deriveStepFromFlow } from './hooks/use-email-challenge';
import { computeRemainingSeconds } from './hooks/use-resend-countdown';

describe('auth UI helpers & state machine', () => {
  it('computes resend countdown accurately from server resendAt timestamp', () => {
    const now = Date.parse('2026-11-07T15:00:00.000Z');
    expect(computeRemainingSeconds('2026-11-07T15:01:00.000Z', now)).toBe(60);
    expect(computeRemainingSeconds('2026-11-07T15:00:00.200Z', now)).toBe(1);
    expect(computeRemainingSeconds('2026-11-07T14:59:50.000Z', now)).toBe(0);
    expect(computeRemainingSeconds(null, now)).toBe(0);
    expect(computeRemainingSeconds('invalid-date', now)).toBe(0);
  });

  it('validates password length, special characters, and Unicode', () => {
    for (const password of [
      '12345678!',
      'abcdefgh#',
      'TiếngViệt!',
      'a'.repeat(127) + '!',
      '🐰'.repeat(9),
      '      ab!',
    ]) {
      expect(validatePassword(password), password).toBe(true);
    }
    for (const password of [
      '',
      '1234567!',
      'abcdefghi',
      '123456789',
      'abcdefghi ',
      'TiếngViệt',
      'a'.repeat(128) + '!',
      '🐰'.repeat(8),
    ]) {
      expect(validatePassword(password), password).toBe(false);
    }
  });

  it('evaluates password quality progress and actionable guidance accurately', () => {
    expect(evaluatePasswordQuality('')).toMatchObject({
      length: 0,
      lengthOk: false,
      specialOk: false,
      valid: false,
      activeSegments: 0,
      tone: 'idle',
      levelLabel: 'Chưa nhập',
    });

    const missingBoth = evaluatePasswordQuality('abc123');
    expect(missingBoth).toMatchObject({
      length: 6,
      lengthOk: false,
      specialOk: false,
      valid: false,
      activeSegments: 1,
      tone: 'weak',
    });
    expect(missingBoth.guidance).toContain('3 ký tự nữa');
    expect(missingBoth.guidance).toContain('ký tự đặc biệt');

    const missingSpecial = evaluatePasswordQuality('abcdefghi');
    expect(missingSpecial).toMatchObject({
      length: 9,
      lengthOk: true,
      specialOk: false,
      valid: false,
      activeSegments: 2,
      tone: 'fair',
    });
    expect(missingSpecial.guidance).toContain('Độ dài đã đạt');

    const missingLength = evaluatePasswordQuality('abc!');
    expect(missingLength).toMatchObject({
      length: 4,
      lengthOk: false,
      specialOk: true,
      valid: false,
      activeSegments: 2,
      tone: 'fair',
    });
    expect(missingLength.guidance).toContain('Đã có ký tự đặc biệt');
    expect(missingLength.guidance).toContain('5 ký tự nữa');

    const validGood = evaluatePasswordQuality('abcdefgh!');
    expect(validGood).toMatchObject({
      length: 9,
      lengthOk: true,
      specialOk: true,
      valid: true,
      activeSegments: 3,
      tone: 'good',
    });

    const validStrong = evaluatePasswordQuality('DuoQuest2026!');
    expect(validStrong).toMatchObject({
      length: 13,
      lengthOk: true,
      specialOk: true,
      valid: true,
      activeSegments: 3,
      tone: 'strong',
    });

    const tooLong = evaluatePasswordQuality('a'.repeat(129) + '!');
    expect(tooLong).toMatchObject({
      length: 130,
      lengthOk: false,
      tooLong: true,
      valid: false,
      activeSegments: 1,
      tone: 'weak',
    });
  });

  it('sanitizes OTP input preserving leading zeros and stripping non-digits', () => {
    expect(sanitizeOtpCode('012345')).toBe('012345');
    expect(sanitizeOtpCode(' 004-829-99 ')).toBe('004829');
    expect(sanitizeOtpCode('abc')).toBe('');
  });

  it('transitions email challenge store through email -> verify -> details -> completed and reset', () => {
    const store = createEmailChallengeStore();
    expect(store.getState().step).toBe('email');
    expect(store.getState().status).toBe('loading');

    store.getState().hydrate(null);
    expect(store.getState().status).toBe('idle');
    expect(store.getState().step).toBe('email');

    store.getState().setEmail('player@example.test');
    store.getState().beginSubmit();
    expect(store.getState().status).toBe('submitting');

    const unverifiedFlow = {
      challengeId: 'ch-1',
      email: 'player@example.test',
      verified: false,
      resendAt: '2026-11-07T15:01:00.000Z',
    };
    store.getState().applyFlow(unverifiedFlow);
    expect(store.getState().step).toBe('verify');
    expect(store.getState().status).toBe('idle');

    const verifiedFlow = {
      ...unverifiedFlow,
      verified: true,
    };
    store.getState().applyFlow(verifiedFlow);
    expect(store.getState().step).toBe('details');

    store.getState().applyError('Mã xác minh chưa đúng', false);
    expect(store.getState().status).toBe('error');
    expect(store.getState().error).toBe('Mã xác minh chưa đúng');

    store.getState().applyResetToEmail();
    expect(store.getState().step).toBe('email');
    expect(store.getState().challenge).toBeNull();
    expect(store.getState().email).toBe('player@example.test');

    store.getState().applyCompleted();
    expect(deriveStepFromFlow(verifiedFlow, true)).toBe('completed');
    expect(store.getState().step).toBe('completed');
  });
});
