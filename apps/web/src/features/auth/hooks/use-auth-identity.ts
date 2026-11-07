'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  isLocalAccountHost,
  loadIdentity,
  onAuthChanged,
  type GameIdentity,
} from '../../../lib/client';

export type AuthIdentityState = {
  loaded: boolean;
  localHost: boolean;
  identity: GameIdentity | null;
  initError: string;
  refreshIdentity: () => Promise<GameIdentity | null>;
};

export function useAuthIdentity(): AuthIdentityState {
  const [loaded, setLoaded] = useState(false);
  const [localHost, setLocalHost] = useState(true);
  const [identity, setIdentity] = useState<GameIdentity | null>(null);
  const [initError, setInitError] = useState('');

  const refreshIdentity = useCallback(async () => {
    const user = await loadIdentity();
    setIdentity(user);
    return user;
  }, []);

  useEffect(() => {
    let alive = true;
    const hostIsLocal = isLocalAccountHost();
    setLocalHost(hostIsLocal);

    if (!hostIsLocal) {
      setLoaded(true);
      return () => {
        alive = false;
      };
    }

    const sync = () => {
      void (async () => {
        try {
          const user = await loadIdentity();
          if (!alive) return;
          setIdentity(user);
          setInitError('');
        } catch (cause: unknown) {
          if (!alive) return;
          setInitError(cause instanceof Error ? cause.message : 'Không thể tải phiên.');
        } finally {
          if (alive) setLoaded(true);
        }
      })();
    };

    sync();
    const unsubscribe = onAuthChanged(sync);

    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  return {
    loaded,
    localHost,
    identity,
    initError,
    refreshIdentity,
  };
}
