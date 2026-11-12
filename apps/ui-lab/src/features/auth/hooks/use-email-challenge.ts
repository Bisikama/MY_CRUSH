'use client';

import { passwordRequirementsMessage } from '@duoquest/shared-types';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { ApiError, authChanged, isLocalAccountHost } from '../../../lib/client';
import {
  cancelAuthFlow,
  completePasswordReset,
  completeRegistration,
  getAuthFlows,
  resendChallenge,
  startChallenge,
  validatePassword,
  verifyChallenge,
  type ChallengeFlow,
  type ChallengePurpose,
} from '../auth-api';

export type EmailChallengeStep = 'email' | 'verify' | 'details' | 'completed';
export type EmailChallengeStatus = 'loading' | 'idle' | 'submitting' | 'error' | 'completed';

export type EmailChallengeStoreState = {
  step: EmailChallengeStep;
  status: EmailChallengeStatus;
  challenge: ChallengeFlow | null;
  email: string;
  error: string;
  emailAlreadyRegistered: boolean;
  hydrate: (flow: ChallengeFlow | null) => void;
  setLoadingError: (message: string) => void;
  setEmail: (email: string) => void;
  beginSubmit: () => void;
  applyFlow: (flow: ChallengeFlow) => void;
  applyCompleted: () => void;
  applyResetToEmail: () => void;
  applyError: (message: string, emailAlreadyRegistered?: boolean) => void;
};

export function deriveStepFromFlow(
  flow: ChallengeFlow | null,
  completed = false,
): EmailChallengeStep {
  if (completed) return 'completed';
  if (!flow) return 'email';
  return flow.verified ? 'details' : 'verify';
}

export function createEmailChallengeStore(
  initialFlow: ChallengeFlow | null = null,
): StoreApi<EmailChallengeStoreState> {
  return createStore<EmailChallengeStoreState>((set) => ({
    step: deriveStepFromFlow(initialFlow),
    status: initialFlow ? 'idle' : 'loading',
    challenge: initialFlow,
    email: initialFlow?.email ?? '',
    error: '',
    emailAlreadyRegistered: false,
    hydrate: (flow) =>
      set((prev) => ({
        challenge: flow,
        email: flow?.email ?? prev.email,
        step: deriveStepFromFlow(flow, false),
        status: 'idle',
        error: '',
        emailAlreadyRegistered: false,
      })),
    setLoadingError: (message) =>
      set({
        status: 'error',
        error: message,
      }),
    setEmail: (email) => set({ email }),
    beginSubmit: () =>
      set({
        status: 'submitting',
        error: '',
        emailAlreadyRegistered: false,
      }),
    applyFlow: (flow) =>
      set({
        challenge: flow,
        email: flow.email,
        step: deriveStepFromFlow(flow, false),
        status: 'idle',
        error: '',
        emailAlreadyRegistered: false,
      }),
    applyCompleted: () =>
      set({
        step: 'completed',
        status: 'completed',
        error: '',
        emailAlreadyRegistered: false,
      }),
    applyResetToEmail: () =>
      set((prev) => ({
        challenge: null,
        email: prev.email,
        step: 'email',
        status: 'idle',
        error: '',
        emailAlreadyRegistered: false,
      })),
    applyError: (message, emailAlreadyRegistered = false) =>
      set({
        status: 'error',
        error: message,
        emailAlreadyRegistered,
      }),
  }));
}

export function useEmailChallenge(purpose: ChallengePurpose, defaultNickname = '') {
  const router = useRouter();
  const storeRef = useRef<StoreApi<EmailChallengeStoreState> | null>(null);
  if (!storeRef.current) {
    storeRef.current = createEmailChallengeStore();
  }
  const store = storeRef.current;
  const state = useStore(store);

  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState(defaultNickname);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const seqRef = useRef(0);
  const busyRef = useRef(false);

  useEffect(() => {
    if (defaultNickname && !nickname) {
      setNickname(defaultNickname);
    }
  }, [defaultNickname, nickname]);

  useEffect(() => {
    let alive = true;
    const token = ++seqRef.current;
    if (!isLocalAccountHost()) {
      store.getState().hydrate(null);
      return () => {
        alive = false;
      };
    }

    void (async () => {
      try {
        const saved = await getAuthFlows();
        if (!alive || seqRef.current !== token) return;
        const active = purpose === 'reset' ? saved.reset : saved.register;
        store.getState().hydrate(active);
      } catch (cause) {
        if (!alive || seqRef.current !== token) return;
        store
          .getState()
          .setLoadingError(cause instanceof Error ? cause.message : 'Không thể tải phiên.');
      }
    })();

    return () => {
      alive = false;
    };
  }, [purpose, store]);

  const runAction = useCallback(
    async (task: (token: number) => Promise<void>) => {
      if (busyRef.current) return;
      busyRef.current = true;
      const token = ++seqRef.current;
      store.getState().beginSubmit();
      try {
        await task(token);
      } catch (cause) {
        if (seqRef.current !== token) return;
        const isRegistered = cause instanceof ApiError && cause.code === 'EMAIL_ALREADY_REGISTERED';
        store
          .getState()
          .applyError(
            cause instanceof Error ? cause.message : 'Không thể hoàn thành yêu cầu.',
            isRegistered,
          );
      } finally {
        if (seqRef.current === token) {
          busyRef.current = false;
        }
      }
    },
    [store],
  );

  const start = useCallback(() => {
    const currentEmail = store.getState().email;
    void runAction(async (token) => {
      const flow = await startChallenge(purpose, { email: currentEmail });
      if (seqRef.current !== token) return;
      setCode('');
      store.getState().applyFlow(flow);
    });
  }, [purpose, runAction, store]);

  const verify = useCallback(() => {
    const active = store.getState().challenge;
    if (!active) return;
    void runAction(async (token) => {
      const flow = await verifyChallenge(purpose, {
        challengeId: active.challengeId,
        code,
      });
      if (seqRef.current !== token) return;
      setCode('');
      store.getState().applyFlow(flow);
    });
  }, [code, purpose, runAction, store]);

  const resend = useCallback(() => {
    const active = store.getState().challenge;
    if (!active) return;
    void runAction(async (token) => {
      const flow = await resendChallenge(purpose, {
        challengeId: active.challengeId,
      });
      if (seqRef.current !== token) return;
      setCode('');
      store.getState().applyFlow(flow);
    });
  }, [purpose, runAction, store]);

  const changeEmail = useCallback(() => {
    busyRef.current = false;
    void runAction(async (token) => {
      await cancelAuthFlow(purpose);
      if (seqRef.current !== token) return;
      setCode('');
      setPassword('');
      setConfirmation('');
      store.getState().applyResetToEmail();
    });
  }, [purpose, runAction, store]);

  const complete = useCallback(() => {
    const active = store.getState().challenge;
    if (!active) return;
    void runAction(async (token) => {
      if (!validatePassword(password)) {
        throw new Error(passwordRequirementsMessage);
      }
      if (password !== confirmation) {
        throw new Error('Hai mật khẩu chưa khớp.');
      }
      if (purpose === 'register') {
        await completeRegistration({
          challengeId: active.challengeId,
          nickname,
          password,
        });
        if (seqRef.current !== token) return;
        setPassword('');
        setConfirmation('');
        authChanged();
        router.replace('/');
      } else {
        await completePasswordReset({
          challengeId: active.challengeId,
          password,
        });
        if (seqRef.current !== token) return;
        setPassword('');
        setConfirmation('');
        authChanged();
        store.getState().applyCompleted();
      }
    });
  }, [confirmation, nickname, password, purpose, router, runAction, store]);

  return {
    step: state.step,
    status: state.status,
    submitting: state.status === 'submitting',
    loading: state.status === 'loading',
    challenge: state.challenge,
    email: state.email,
    setEmail: state.setEmail,
    code,
    setCode,
    nickname,
    setNickname,
    password,
    setPassword,
    confirmation,
    setConfirmation,
    error: state.error,
    emailAlreadyRegistered: state.emailAlreadyRegistered,
    start,
    verify,
    resend,
    changeEmail,
    complete,
  };
}
