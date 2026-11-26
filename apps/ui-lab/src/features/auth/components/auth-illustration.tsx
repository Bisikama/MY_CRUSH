'use client';

import { useI18n, type TranslationKey } from '../../../i18n';

export type AuthIllustrationVariant = 'login' | 'email' | 'otp' | 'password' | 'success';

const ILLUSTRATION_CONFIG: Record<
  AuthIllustrationVariant,
  { src: string; altKey: TranslationKey; captionKey: TranslationKey }
> = {
  login: {
    src: '/images/auth/auth-login.jpg',
    altKey: 'auth.illustrations.loginAlt',
    captionKey: 'auth.illustrations.loginCaption',
  },
  email: {
    src: '/images/auth/auth-email.jpg',
    altKey: 'auth.illustrations.emailAlt',
    captionKey: 'auth.illustrations.emailCaption',
  },
  otp: {
    src: '/images/auth/auth-otp.jpg',
    altKey: 'auth.illustrations.otpAlt',
    captionKey: 'auth.illustrations.otpCaption',
  },
  password: {
    src: '/images/auth/auth-password.jpg',
    altKey: 'auth.illustrations.passwordAlt',
    captionKey: 'auth.illustrations.passwordCaption',
  },
  success: {
    src: '/images/auth/auth-success.jpg',
    altKey: 'auth.illustrations.successAlt',
    captionKey: 'auth.illustrations.successCaption',
  },
};

export function AuthIllustration({
  variant,
  captionOverride,
}: {
  variant: AuthIllustrationVariant;
  captionOverride?: string;
}) {
  const { t } = useI18n();
  const item = ILLUSTRATION_CONFIG[variant];
  return (
    <div className="auth-mascot-wrapper">
      <div className="auth-mascot-frame auth-mascot-float">
        <img
          src={item.src}
          alt={t(item.altKey)}
          className="auth-mascot-img"
          loading="eager"
          width={380}
          height={380}
        />
      </div>
      <p className="auth-mascot-caption">{captionOverride ?? t(item.captionKey)}</p>
    </div>
  );
}
