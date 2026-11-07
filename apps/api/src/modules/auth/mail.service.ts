import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly host = process.env.SMTP_HOST;
  private readonly from = process.env.MAIL_FROM;
  private readonly transport =
    this.host && this.from
      ? nodemailer.createTransport({
          host: this.host,
          port: Number(process.env.SMTP_PORT ?? 587),
          secure: process.env.SMTP_SECURE === 'true',
          requireTLS: process.env.SMTP_SECURE !== 'true',
          auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? '' }
            : undefined,
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 8000,
          dnsTimeout: 5000,
          logger: false,
          debug: false,
        })
      : undefined;

  async send(
    to: string,
    subject: string,
    text: string,
    html?: string,
  ): Promise<'accepted' | 'rejected' | 'unknown'> {
    if (!this.transport) return 'rejected';
    const delivery = this.transport.sendMail({ from: this.from, to, subject, text, html }).then(
      (result) => (result.accepted.length === 1 ? ('accepted' as const) : ('rejected' as const)),
      (error: unknown) => {
        const code = (error as { responseCode?: number }).responseCode;
        return typeof code === 'number' && code >= 400
          ? ('rejected' as const)
          : ('unknown' as const);
      },
    );
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        delivery,
        new Promise<'unknown'>((resolve) => {
          timer = setTimeout(() => resolve('unknown'), 12000);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
}
