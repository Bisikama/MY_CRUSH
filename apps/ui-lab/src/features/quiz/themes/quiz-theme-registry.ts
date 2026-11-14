import type { QuizSkill } from '@duoquest/shared-types';

export type QuizThemeId = 'forest' | 'christmas' | 'tropical';

export interface QuizThemeDefinition {
  id: QuizThemeId;
  name: string;
  tagline: string;
  badge: string;
  visuals: {
    shellBgColor: string;
    arenaBgColor: string;
    arenaBgImage: string;
    thumbnailUrl: string;
    accentColor: string;
  };
  audio: {
    /**
     * Optional static audio file URLs under `/audio/quiz/themes/<id>/...`.
     * When omitted, the audio controller synthesizes the theme melody via Web Audio API.
     */
    lobbyBgmUrl?: string;
    matchBgmUrl?: string;
    skillSfxUrls?: Partial<Record<QuizSkill, string>>;
    synth: {
      lobbyNotes: readonly number[];
      lobbyStepMs: number;
      matchNotes: readonly number[];
      matchStepMs: number;
      waveform: OscillatorType;
      skillPitchMultiplier: number;
    };
  };
}

export const DEFAULT_QUIZ_THEME_ID: QuizThemeId = 'forest';

export const QUIZ_THEMES: readonly QuizThemeDefinition[] = [
  {
    id: 'forest',
    name: 'Rừng nguyên sinh',
    tagline: 'Tán cây cổ thụ tĩnh lặng và nhịp trống gỗ thư thái.',
    badge: 'Mặc định',
    visuals: {
      shellBgColor: '#183f2b',
      arenaBgColor: '#375941',
      arenaBgImage: "url('/images/quiz/forest-arena.png')",
      thumbnailUrl: '/images/quiz/forest-arena.png',
      accentColor: '#8fb361',
    },
    audio: {
      synth: {
        lobbyNotes: [261.63, 329.63, 392.0, 493.88, 392.0, 329.63],
        lobbyStepMs: 520,
        matchNotes: [293.66, 349.23, 440.0, 523.25, 440.0, 392.0, 349.23, 329.63],
        matchStepMs: 300,
        waveform: 'triangle',
        skillPitchMultiplier: 1,
      },
    },
  },
  {
    id: 'christmas',
    name: 'Giáng sinh ấm áp',
    tagline: 'Đêm tuyết rừng thông, ánh đèn vàng ấm và tiếng chuông ngân.',
    badge: 'Lễ hội',
    visuals: {
      shellBgColor: '#102536',
      arenaBgColor: '#1b3b52',
      arenaBgImage: "url('/images/quiz/themes/christmas-arena.svg')",
      thumbnailUrl: '/images/quiz/themes/christmas-arena.svg',
      accentColor: '#ffd166',
    },
    audio: {
      synth: {
        lobbyNotes: [329.63, 392.0, 523.25, 493.88, 392.0, 440.0, 392.0, 329.63],
        lobbyStepMs: 460,
        matchNotes: [329.63, 329.63, 329.63, 392.0, 523.25, 392.0, 440.0, 523.25],
        matchStepMs: 260,
        waveform: 'sine',
        skillPitchMultiplier: 1.18,
      },
    },
  },
  {
    id: 'tropical',
    name: 'Rừng rậm nhiệt đới',
    tagline: 'Nắng xuyên tán cọ, đom đóm ngọc lục bảo và giai điệu marimba.',
    badge: 'Sôi động',
    visuals: {
      shellBgColor: '#0d352d',
      arenaBgColor: '#175245',
      arenaBgImage: "url('/images/quiz/themes/tropical-arena.svg')",
      thumbnailUrl: '/images/quiz/themes/tropical-arena.svg',
      accentColor: '#52b788',
    },
    audio: {
      synth: {
        lobbyNotes: [293.66, 369.99, 440.0, 587.33, 493.88, 440.0, 369.99, 329.63],
        lobbyStepMs: 420,
        matchNotes: [329.63, 392.0, 440.0, 493.88, 587.33, 493.88, 440.0, 392.0],
        matchStepMs: 230,
        waveform: 'triangle',
        skillPitchMultiplier: 1.08,
      },
    },
  },
] as const;

export function isQuizThemeId(value: unknown): value is QuizThemeId {
  return value === 'forest' || value === 'christmas' || value === 'tropical';
}

export function getQuizTheme(themeId?: string | null): QuizThemeDefinition {
  return QUIZ_THEMES.find((theme) => theme.id === themeId) ?? QUIZ_THEMES[0]!;
}

