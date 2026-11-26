import { DEFAULT_LOCALE, translate, type LocaleCode } from '../../i18n';

export interface ProfileModeDescriptor {
  title: string;
  tag: string;
  tone: 'solo' | 'duel' | 'coop';
}

export function getProfileModeDescriptor(
  mode: string,
  locale: LocaleCode = DEFAULT_LOCALE,
): ProfileModeDescriptor {
  switch (mode.toUpperCase()) {
    case 'SOLO':
      return { title: 'Solo', tag: translate(locale, 'profile.history.modeSoloTag'), tone: 'solo' };
    case 'DUEL':
      return { title: 'Duel', tag: translate(locale, 'profile.history.modeDuelTag'), tone: 'duel' };
    case 'COOP':
      return { title: 'Co-op', tag: translate(locale, 'profile.history.modeCoopTag'), tone: 'coop' };
    default:
      return { title: mode, tag: 'Quiz Battle', tone: 'solo' };
  }
}

export function formatProfileMatchTime(
  finishedAt: string | null | undefined,
  now: Date = new Date(),
  locale: LocaleCode = DEFAULT_LOCALE,
): string {
  if (!finishedAt) return translate(locale, 'profile.history.justFinished');
  const date = new Date(finishedAt);
  if (Number.isNaN(date.getTime())) return finishedAt;

  const pad = (value: number) => String(value).padStart(2, '0');
  const timePart = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

  if (diffDays === 0) return translate(locale, 'profile.history.todayAt', { time: timePart });
  if (diffDays === 1) return translate(locale, 'profile.history.yesterdayAt', { time: timePart });

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}, ${timePart}`;
}
