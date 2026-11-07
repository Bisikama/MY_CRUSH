'use client';

import Link from 'next/link';
import { AuthShell } from './components/auth-shell';
import { AuthFeedback } from './components/auth-ui';
import type { AuthIllustrationVariant } from './components/auth-illustration';
import { useAuthIdentity } from './hooks/use-auth-identity';
import { useEmailChallenge } from './hooks/use-email-challenge';
import { useLogin } from './hooks/use-login';
import { useResendCountdown } from './hooks/use-resend-countdown';
import { EmailStep } from './screens/email-step';
import { LoginForm } from './screens/login-form';
import { RegistrationDetailsStep } from './screens/registration-details-step';
import { ResetPasswordStep } from './screens/reset-password-step';
import { ResetSuccess } from './screens/reset-success';
import { VerificationStep } from './screens/verification-step';

export type AuthMode = 'register' | 'login' | 'reset';

function GuardView({
  title,
  variant,
  children,
}: {
  title: string;
  variant: AuthIllustrationVariant;
  children: React.ReactNode;
}) {
  return (
    <AuthShell variant={variant}>
      <div className="auth-screen-enter">
        <div className="auth-header-block">
          <h1 className="auth-title">{title}</h1>
        </div>
        {children}
      </div>
    </AuthShell>
  );
}

function LoginFlowView() {
  const { loaded, localHost, identity, initError } = useAuthIdentity();
  const login = useLogin(identity);

  if (!loaded) {
    return (
      <GuardView title="Đăng nhập" variant="login">
        <p role="status" className="auth-status-text">
          Đang tải phiên…
        </p>
      </GuardView>
    );
  }

  if (!localHost) {
    return (
      <GuardView title="Đăng nhập" variant="login">
        <p className="auth-status-text">
          Đăng nhập tài khoản hiện dùng trên localhost. <Link href="/">Chơi dưới dạng khách</Link>{' '}
          trên máy này.
        </p>
      </GuardView>
    );
  }

  if (identity?.kind === 'account') {
    return (
      <GuardView title="Đăng nhập" variant="login">
        <p className="auth-status-text">
          Bạn đang đăng nhập với email {identity.email}. <Link href="/profile">Mở hồ sơ</Link>.
        </p>
        <AuthFeedback variant="error">{initError}</AuthFeedback>
      </GuardView>
    );
  }

  return (
    <AuthShell variant="login">
      <AuthFeedback variant="error">{initError}</AuthFeedback>
      <LoginForm
        email={login.email}
        onEmailChange={login.setEmail}
        password={login.password}
        onPasswordChange={login.setPassword}
        submitting={login.submitting}
        error={login.error}
        guestNickname={identity?.kind === 'guest' ? identity.nickname : undefined}
        confirmSwitchOpen={login.confirmSwitchOpen}
        onSubmit={login.requestSubmit}
        onConfirmSwitch={login.confirmGuestSwitch}
        onCancelSwitch={login.cancelGuestSwitch}
      />
    </AuthShell>
  );
}

function ChallengeFlowView({ purpose }: { purpose: 'register' | 'reset' }) {
  const { loaded, localHost, identity, initError } = useAuthIdentity();
  const defaultNickname =
    purpose === 'register' && identity?.kind === 'guest' ? identity.nickname : '';
  const flow = useEmailChallenge(purpose, defaultNickname);
  const remainingSeconds = useResendCountdown(
    flow.challenge?.resendAt,
    Boolean(flow.challenge && !flow.challenge.verified && flow.step === 'verify'),
  );

  const pageTitle = purpose === 'register' ? 'Tạo tài khoản' : 'Đặt lại mật khẩu';

  const variant: AuthIllustrationVariant =
    flow.step === 'completed'
      ? 'success'
      : flow.step === 'details'
        ? 'password'
        : flow.step === 'verify'
          ? 'otp'
          : 'email';

  const captionOverride =
    purpose === 'register' && flow.step === 'email' ? 'Bắt đầu hành trình' : undefined;

  if (!loaded || flow.loading) {
    return (
      <GuardView title={pageTitle} variant={variant}>
        <p role="status" className="auth-status-text">
          Đang tải phiên…
        </p>
      </GuardView>
    );
  }

  if (!localHost) {
    return (
      <GuardView title={pageTitle} variant={variant}>
        <p className="auth-status-text">
          Đăng nhập tài khoản hiện dùng trên localhost. <Link href="/">Chơi dưới dạng khách</Link>{' '}
          trên máy này.
        </p>
      </GuardView>
    );
  }

  if (identity?.kind === 'account' && purpose === 'register') {
    return (
      <GuardView title={pageTitle} variant="login">
        <p className="auth-status-text">
          Bạn đang đăng nhập với email {identity.email}. <Link href="/profile">Mở hồ sơ</Link>.
        </p>
        <AuthFeedback variant="error">{initError}</AuthFeedback>
      </GuardView>
    );
  }

  return (
    <AuthShell variant={variant} captionOverride={captionOverride}>
      <AuthFeedback variant="error">{initError}</AuthFeedback>

      {flow.step === 'completed' ? (
        <ResetSuccess />
      ) : flow.step === 'details' && flow.challenge ? (
        purpose === 'register' ? (
          <RegistrationDetailsStep
            email={flow.challenge.email}
            nickname={flow.nickname}
            onNicknameChange={flow.setNickname}
            password={flow.password}
            onPasswordChange={flow.setPassword}
            confirmation={flow.confirmation}
            onConfirmationChange={flow.setConfirmation}
            submitting={flow.submitting}
            error={flow.error}
            onSubmit={flow.complete}
            onChangeEmail={flow.changeEmail}
          />
        ) : (
          <ResetPasswordStep
            email={flow.challenge.email}
            password={flow.password}
            onPasswordChange={flow.setPassword}
            confirmation={flow.confirmation}
            onConfirmationChange={flow.setConfirmation}
            submitting={flow.submitting}
            error={flow.error}
            onSubmit={flow.complete}
            onChangeEmail={flow.changeEmail}
          />
        )
      ) : flow.step === 'verify' && flow.challenge ? (
        <VerificationStep
          purpose={purpose}
          email={flow.challenge.email}
          code={flow.code}
          onCodeChange={flow.setCode}
          remainingSeconds={remainingSeconds}
          submitting={flow.submitting}
          error={flow.error}
          onSubmit={flow.verify}
          onResend={flow.resend}
          onChangeEmail={flow.changeEmail}
        />
      ) : (
        <EmailStep
          purpose={purpose}
          email={flow.email}
          onEmailChange={flow.setEmail}
          submitting={flow.submitting}
          error={flow.error}
          emailAlreadyRegistered={flow.emailAlreadyRegistered}
          guestNickname={
            purpose === 'register' && identity?.kind === 'guest' ? identity.nickname : undefined
          }
          onSubmit={flow.start}
        />
      )}
    </AuthShell>
  );
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  if (mode === 'login') {
    return <LoginFlowView />;
  }
  return <ChallengeFlowView purpose={mode} />;
}
