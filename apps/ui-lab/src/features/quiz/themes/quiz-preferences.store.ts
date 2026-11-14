import { create } from 'zustand';
import {
  DEFAULT_QUIZ_THEME_ID,
  getQuizTheme,
  isQuizThemeId,
  type QuizThemeDefinition,
  type QuizThemeId,
} from './quiz-theme-registry';

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

export const useQuizPreferencesStore = create<QuizPreferencesState>((set) => ({
  ...initialPreferences,
  setThemeId: (themeId) => {
    if (!isQuizThemeId(themeId)) return;
    set({ themeId });
  },
  setLobbyBgmEnabled: (lobbyBgmEnabled) => set({ lobbyBgmEnabled }),
  setMatchBgmEnabled: (matchBgmEnabled) => set({ matchBgmEnabled }),
  setSkillSfxEnabled: (skillSfxEnabled) => set({ skillSfxEnabled }),
  resetQuizPreferences: () => set(initialPreferences),
}));

export function useActiveQuizTheme(): QuizThemeDefinition {
  const themeId = useQuizPreferencesStore((state) => state.themeId);
  return getQuizTheme(themeId);
}

