export interface ProfileModeDescriptor {
  title: string;
  tag: string;
  tone: 'solo' | 'duel' | 'coop';
}

export function getProfileModeDescriptor(mode: string): ProfileModeDescriptor {
  switch (mode.toUpperCase()) {
    case 'SOLO':
      return { title: 'Solo', tag: 'Luyện tập', tone: 'solo' };
    case 'DUEL':
      return { title: 'Duel', tag: 'Đối kháng', tone: 'duel' };
    case 'COOP':
      return { title: 'Co-op', tag: 'Đồng đội', tone: 'coop' };
    default:
      return { title: mode, tag: 'Quiz Battle', tone: 'solo' };
  }
}

export function formatProfileMatchTime(
  finishedAt: string | null | undefined,
  now: Date = new Date(),
): string {
  if (!finishedAt) return 'Vừa hoàn tất';
  const date = new Date(finishedAt);
  if (Number.isNaN(date.getTime())) return finishedAt;

  const pad = (value: number) => String(value).padStart(2, '0');
  const timePart = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

  if (diffDays === 0) return `Hôm nay, ${timePart}`;
  if (diffDays === 1) return `Hôm qua, ${timePart}`;

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}, ${timePart}`;
}
