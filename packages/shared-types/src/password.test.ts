import { describe, expect, it } from 'vitest';
import { passwordRequirementsMessage, passwordSchema } from './index';

describe('new password contract', () => {
  it.each(['12345678!', 'abcdefgh@', 'TiếngViệt#', '🐰'.repeat(9), 'a'.repeat(127) + '!'])(
    'accepts a valid password: %s',
    (password) => expect(passwordSchema.parse(password)).toBe(password),
  );

  it.each([
    '',
    '1234567!',
    'abcdefghi',
    '123456789',
    'abcdefgh ',
    'TiếngViệt',
    '🐰'.repeat(8),
    'a'.repeat(128) + '!',
  ])('rejects invalid length or missing special character: %s', (password) => {
    const result = passwordSchema.safeParse(password);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe(passwordRequirementsMessage);
  });
});
