import { afterEach, describe, expect, it, vi } from 'vitest';
import nodemailer from 'nodemailer';
import { MailService } from './mail.service';
import { verificationEmail } from './mail-template';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('authentication mail transport', () => {
  it('sends HTML and plain text together through the existing transport', async () => {
    vi.stubEnv('SMTP_HOST', 'smtp.example.test');
    vi.stubEnv('MAIL_FROM', 'DuoQuest <no-reply@example.test>');
    const sendMail = vi.fn().mockResolvedValue({ accepted: ['player@example.test'] });
    vi.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail } as unknown as ReturnType<
      typeof nodemailer.createTransport
    >);
    const email = verificationEmail('REGISTER', '000000');
    expect(
      await new MailService().send('player@example.test', email.subject, email.text, email.html),
    ).toBe('accepted');
    expect(sendMail).toHaveBeenCalledWith({
      from: 'DuoQuest <no-reply@example.test>',
      to: 'player@example.test',
      ...email,
    });
  });
});
