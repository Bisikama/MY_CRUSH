import { beforeEach, describe, expect, it } from 'vitest';
import { useQuizPreferencesStore } from './quiz-preferences.store';
import {
  DEFAULT_QUIZ_THEME_ID,
  getQuizTheme,
  isQuizThemeId,
  QUIZ_THEMES,
} from './quiz-theme-registry';

describe('quiz-theme-registry & preferences store', () => {
  beforeEach(() => {
    useQuizPreferencesStore.getState().resetQuizPreferences();
  });

  it('defines forest, christmas and tropical themes with visuals and 3-channel synth presets', () => {
    expect(QUIZ_THEMES.map((theme) => theme.id)).toEqual(['forest', 'christmas', 'tropical']);
    for (const theme of QUIZ_THEMES) {
      expect(theme.visuals.arenaBgImage).toContain('/images/quiz/');
      expect(theme.audio.synth.lobbyNotes.length).toBeGreaterThan(0);
      expect(theme.audio.synth.matchNotes.length).toBeGreaterThan(0);
      expect(theme.audio.synth.skillPitchMultiplier).toBeGreaterThan(0);
    }
  });

  it('resolves valid theme ids and falls back to default forest theme', () => {
    expect(isQuizThemeId('christmas')).toBe(true);
    expect(isQuizThemeId('tropical')).toBe(true);
    expect(isQuizThemeId('unknown')).toBe(false);
    expect(getQuizTheme('christmas').name).toBe('Giáng sinh ấm áp');
    expect(getQuizTheme('tropical').name).toBe('Rừng rậm nhiệt đới');
    expect(getQuizTheme('invalid').id).toBe(DEFAULT_QUIZ_THEME_ID);
    expect(getQuizTheme(undefined).id).toBe(DEFAULT_QUIZ_THEME_ID);
  });

  it('updates theme and independent 3-channel audio toggles in store', () => {
    const store = useQuizPreferencesStore.getState();
    expect(store.themeId).toBe('forest');
    expect(store.lobbyBgmEnabled).toBe(true);
    expect(store.matchBgmEnabled).toBe(true);
    expect(store.skillSfxEnabled).toBe(true);

    store.setThemeId('christmas');
    store.setLobbyBgmEnabled(false);
    store.setMatchBgmEnabled(false);
    store.setSkillSfxEnabled(false);

    const updated = useQuizPreferencesStore.getState();
    expect(updated.themeId).toBe('christmas');
    expect(updated.lobbyBgmEnabled).toBe(false);
    expect(updated.matchBgmEnabled).toBe(false);
    expect(updated.skillSfxEnabled).toBe(false);

    updated.resetQuizPreferences();
    expect(useQuizPreferencesStore.getState()).toMatchObject({
      themeId: 'forest',
      lobbyBgmEnabled: true,
      matchBgmEnabled: true,
      skillSfxEnabled: true,
    });
  });
});

