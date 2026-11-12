'use client';

import { useEffect, useState } from 'react';

export function computeRemainingSeconds(
  resendAt: string | null | undefined,
  nowMs: number,
): number {
  if (!resendAt) return 0;
  const targetMs = Date.parse(resendAt);
  if (Number.isNaN(targetMs)) return 0;
  return Math.max(0, Math.ceil((targetMs - nowMs) / 1000));
}

export function useResendCountdown(resendAt: string | null | undefined, active = true): number {
  const [remaining, setRemaining] = useState<number>(() =>
    active ? computeRemainingSeconds(resendAt, Date.now()) : 0,
  );

  useEffect(() => {
    if (!active || !resendAt) {
      setRemaining(0);
      return;
    }

    const tick = () => {
      const next = computeRemainingSeconds(resendAt, Date.now());
      setRemaining(next);
      return next;
    };

    if (tick() <= 0) return;

    const interval = setInterval(() => {
      if (tick() <= 0) {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [resendAt, active]);

  return remaining;
}
