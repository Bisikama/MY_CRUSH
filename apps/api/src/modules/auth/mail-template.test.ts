import { describe, expect, it } from 'vitest';
import { passwordChangedEmail, verificationEmail } from './mail-template';

describe('DuoQuest authentication emails', () => {
  it.each(['REGISTER', 'RESET_PASSWORD'] as const)(
    'preserves the code and expiry for %s',
    (purpose) => {
      const email = verificationEmail(purpose, '000000');
      expect(email.html).toContain('>000000</p>');
      expect(email.text).toContain('Mã xác minh: 000000');
      expect(email.html).toContain('<strong>5 phút</strong>');
      expect(email.text).toContain('5 phút');
      expect(email.subject).not.toContain('000000');
      expect(email.html.split('<table')[0]).not.toContain('000000');
      expect(email.html).toContain('lang="vi"');
      expect(email.html).not.toMatch(/<script|<img|<a\s|https?:\/\//i);
      expect(email.text).toContain('Không chia sẻ mã');
    },
  );

  it('distinguishes registration and reset instructions', () => {
    const registration = verificationEmail('REGISTER', '000000');
    const reset = verificationEmail('RESET_PASSWORD', '000000');
    expect(registration.subject).not.toBe(reset.subject);
    expect(registration.text).toContain('trang đăng ký');
    expect(reset.text).toContain('trang đặt lại mật khẩu');
    expect(reset.text).toContain('Mật khẩu hiện tại của bạn vẫn giữ nguyên.');
  });

  it.each(['<img/>', '12345', '1234567', 'abcdef', '000000\n'])(
    'rejects invalid code input: %j',
    (code) => expect(() => verificationEmail('REGISTER', code)).toThrow(),
  );

  it('includes recovery instructions in both password change formats', () => {
    const email = passwordChangedEmail();
    for (const content of [email.text, email.html]) {
      expect(content).toContain('Quên mật khẩu');
      expect(content).toContain('Nếu bạn không thực hiện');
    }
    expect(email.html).not.toContain('MÃ XÁC MINH');
  });
});
