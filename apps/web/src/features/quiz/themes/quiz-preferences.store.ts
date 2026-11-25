import { create } from 'zustand';
import {
  DEFAULT_QUIZ_THEME_ID,
  getQuizTheme,
  isQuizThemeId,
  type QuizThemeDefinition,
  type QuizThemeId,
} from './quiz-theme-registry';

export const QUIZ_PREFERENCES_STORAGE_KEY = 'duoquest.quiz-preferences';

export interface QuizPreferencesState {
  themeId: QuizThemeId;
  lobbyBgmEnabled: boolean;
  matchBgmEnabled: boolean;
  skillSfxEnabled: boolean;
  setThemeId: (themeId: QuizThemeId) => void;
  setLobbyBgmEnabled: (enabled: boolean) => void;
  setMatchBgmEnabled: (enabled: boolean) => void;
  setSkillSfxEnabled: (enabled: boolean) => void;
  resetQuizPreferences: () => void;
}

const initialPreferences = {
  themeId: DEFAULT_QUIZ_THEME_ID,
  lobbyBgmEnabled: true,
  matchBgmEnabled: true,
  skillSfxEnabled: true,
};

function saveToStorage(
  state: Pick<
    QuizPreferencesState,
    'themeId' | 'lobbyBgmEnabled' | 'matchBgmEnabled' | 'skillSfxEnabled'
  >,
) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(QUIZ_PREFERENCES_STORAGE_KEY, JSON.stringify(state));
    window.localStorage.setItem('quiz-cover-sound', state.skillSfxEnabled ? 'on' : 'off');
  } catch {
    // Ignore storage quota or private mode restrictions.
  }
}

export const useQuizPreferencesStore = create<QuizPreferencesState>((set, get) => ({
  ...initialPreferences,
  setThemeId: (themeId) => {
    if (!isQuizThemeId(themeId)) return;
    set({ themeId });
    saveToStorage({ ...get(), themeId });
  },
  setLobbyBgmEnabled: (lobbyBgmEnabled) => {
    set({ lobbyBgmEnabled });
    saveToStorage({ ...get(), lobbyBgmEnabled });
  },
  setMatchBgmEnabled: (matchBgmEnabled) => {
    set({ matchBgmEnabled });
    saveToStorage({ ...get(), matchBgmEnabled });
  },
  setSkillSfxEnabled: (skillSfxEnabled) => {
    set({ skillSfxEnabled });
    saveToStorage({ ...get(), skillSfxEnabled });
  },
  resetQuizPreferences: () => {
    set(initialPreferences);
    saveToStorage(initialPreferences);
  },
}));

/** Hydrate persisted Quiz theme and audio settings on client mount without SSR mismatch. */
export function hydrateQuizPreferences() {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(QUIZ_PREFERENCES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<typeof initialPreferences>;
      useQuizPreferencesStore.setState({
        themeId: isQuizThemeId(parsed.themeId) ? parsed.themeId : initialPreferences.themeId,
        lobbyBgmEnabled:
          typeof parsed.lobbyBgmEnabled === 'boolean'
            ? parsed.lobbyBgmEnabled
            : initialPreferences.lobbyBgmEnabled,
        matchBgmEnabled:
          typeof parsed.matchBgmEnabled === 'boolean'
            ? parsed.matchBgmEnabled
            : initialPreferences.matchBgmEnabled,
        skillSfxEnabled:
          typeof parsed.skillSfxEnabled === 'boolean'
            ? parsed.skillSfxEnabled
            : initialPreferences.skillSfxEnabled,
      });
      return;
    }
    const legacyCover = window.localStorage.getItem('quiz-cover-sound');
    if (legacyCover === 'off') {
      useQuizPreferencesStore.setState({ skillSfxEnabled: false });
    }
  } catch {
    // Ignore malformed localStorage entries.
  }
}

export function useActiveQuizTheme(): QuizThemeDefinition {
  const themeId = useQuizPreferencesStore((state) => state.themeId);
  return getQuizTheme(themeId);
}
