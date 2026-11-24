import type { DomainErrorCode } from '@duoquest/shared-types';

export interface DomainErrorOptions {
  cause?: unknown;
  details?: Record<string, unknown>;
}

export class DomainError extends Error {
  public readonly details?: Record<string, unknown>;

  constructor(
    public readonly code: DomainErrorCode,
    message: string,
    options?: DomainErrorOptions,
  ) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'DomainError';
    this.details = options?.details;
  }
}
export function assertDomain(
  condition: unknown,
  code: DomainErrorCode,
  message: string,
  options?: DomainErrorOptions,
): asserts condition {
  if (!condition) throw new DomainError(code, message, options);
}

/** Commands, timers and disconnects share this queue; rejected tasks never poison it. */
export class KeyedQueue {
  private readonly tails = new Map<string, Promise<unknown>>();
  run<T>(key: string, task: () => T | Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(task);
    this.tails.set(key, next);
    void next
      .finally(() => {
        if (this.tails.get(key) === next) this.tails.delete(key);
      })
      .catch(() => undefined);
    return next;
  }
}
