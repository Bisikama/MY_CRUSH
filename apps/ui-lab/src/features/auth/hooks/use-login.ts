'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { authChanged, type GameIdentity } from '../../../lib/client';
import { loginWithPassword } from '../auth-api';

export function useLogin(identity: GameIdentity | null) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmSwitchOpen, setConfirmSwitchOpen] = useState(false);
  const busyRef = useRef(false);

  const performLogin = useCallback(
    async (targetEmail: string, targetPassword: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setSubmitting(true);
      setError('');
      try {
        await loginWithPassword({ email: targetEmail, password: targetPassword });
        setPassword('');
        setConfirmSwitchOpen(false);
        authChanged();
        router.replace('/');
      } catch (cause) {
        setConfirmSwitchOpen(false);
        setError(cause instanceof Error ? cause.message : 'Không thể hoàn thành yêu cầu.');
      } finally {
        busyRef.current = false;
        setSubmitting(false);
      }
    },
    [router],
  );

  const requestSubmit = useCallback(() => {
    if (busyRef.current) return;
    setError('');
    if (identity?.kind === 'guest') {
      setConfirmSwitchOpen(true);
      return;
    }
    void performLogin(email, password);
  }, [email, identity?.kind, password, performLogin]);

  const confirmGuestSwitch = useCallback(() => {
    void performLogin(email, password);
  }, [email, password, performLogin]);

  const cancelGuestSwitch = useCallback(() => {
    if (busyRef.current) return;
    setConfirmSwitchOpen(false);
  }, []);

  return {
    email,
    setEmail,
    password,
    setPassword,
    error,
    setError,
    submitting,
    confirmSwitchOpen,
    requestSubmit,
    confirmGuestSwitch,
    cancelGuestSwitch,
  };
}
