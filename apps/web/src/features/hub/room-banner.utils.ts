import type { ActiveRoomStatus, CurrentRoomSummary } from '@duoquest/shared-types';

export interface RoomBannerDescriptor {
  key: string;
  code: string;
  status: ActiveRoomStatus;
  headline: string;
  ctaLabel: string;
  href: string;
  tone: 'waiting' | 'live' | 'finished';
}

export function bannerKeyForRoom(summary: CurrentRoomSummary): string {
  return `${summary.code}:${summary.status}`;
}

export function getRoomBannerDescriptor(
  summary: CurrentRoomSummary | null,
  pathname: string | null,
  dismissedKey: string | null,
): RoomBannerDescriptor | null {
  if (!summary) return null;
  const targetHref = `/play/${summary.code}`;
  if (pathname?.toUpperCase() === targetHref.toUpperCase()) {
    return null;
  }
  const key = bannerKeyForRoom(summary);
  if (dismissedKey === key) {
    return null;
  }
  if (summary.status === 'IN_PROGRESS') {
    return {
      key,
      code: summary.code,
      status: summary.status,
      headline: 'Trận Quiz Battle đang diễn ra',
      ctaLabel: 'Quay lại trận',
      href: targetHref,
      tone: 'live',
    };
  }
  if (summary.status === 'FINISHED') {
    return {
      key,
      code: summary.code,
      status: summary.status,
      headline: 'Phòng đã hoàn tất trận',
      ctaLabel: 'Xem kết quả / Về phòng',
      href: targetHref,
      tone: 'finished',
    };
  }
  return {
    key,
    code: summary.code,
    status: summary.status,
    headline: 'Bạn có phòng đang mở',
    ctaLabel: 'Quay lại phòng',
    href: targetHref,
    tone: 'waiting',
  };
}

export function shouldConfirmLeaveOnNavigation(
  pathname: string | null,
  targetHref: string,
  activeStatus: string | null | undefined,
  activeCode: string | null | undefined,
): boolean {
  if (!pathname || !activeCode || activeStatus !== 'IN_PROGRESS') return false;
  const roomPath = `/play/${activeCode}`.toUpperCase();
  if (pathname.toUpperCase() !== roomPath) return false;
  const normalizedTarget = targetHref.split('?')[0]!.toUpperCase();
  return normalizedTarget !== roomPath;
}

export function createSequenceGuard() {
  let current = 0;
  return {
    next() {
      current += 1;
      return current;
    },
    isCurrent(token: number) {
      return token === current;
    },
    value() {
      return current;
    },
  };
}

/** Local ordering only: HTTP reads must not undo a newer command or socket snapshot. */
export function createRoomRequestGuard() {
  let generation = 0;
  let latestRead = 0;
  let nextMutation = 0;
  const pending = new Set<number>();
  return {
    read() {
      return { generation, id: ++latestRead };
    },
    accepts(ticket: { generation: number; id: number }) {
      return !pending.size && ticket.generation === generation && ticket.id === latestRead;
    },
    generation: () => generation,
    invalidate() {
      generation++;
    },
    beginMutation() {
      generation++;
      const id = ++nextMutation;
      pending.add(id);
      return id;
    },
    finishMutation(id: number) {
      if (pending.delete(id)) generation++;
    },
    reset() {
      generation++;
      latestRead++;
      pending.clear();
    },
  };
}
