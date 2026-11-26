'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n';
import { quizAudioController, type AudioPreviewKind } from '../quiz/themes/quiz-audio-controller';
import { useQuizPreferencesStore } from '../quiz/themes/quiz-preferences.store';
import { QUIZ_THEMES, type QuizThemeDefinition } from '../quiz/themes/quiz-theme-registry';
import styles from './quiz-theme-settings.module.css';

export function QuizThemeSettings() {
  const { t } = useI18n();
  const {
    themeId,
    lobbyBgmEnabled,
    matchBgmEnabled,
    skillSfxEnabled,
    setThemeId,
    setLobbyBgmEnabled,
    setMatchBgmEnabled,
    setSkillSfxEnabled,
  } = useQuizPreferencesStore();
  const [previewing, setPreviewing] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      quizAudioController.stopBgm();
    };
  }, []);

  function handlePreview(theme: QuizThemeDefinition, kind: AudioPreviewKind) {
    const key = `${theme.id}:${kind}`;
    if (previewing === key) {
      quizAudioController.stopBgm();
      setPreviewing(null);
      return;
    }
    setPreviewing(key);
    quizAudioController.preview(kind, theme, () => {
      setPreviewing((current) => (current === key ? null : current));
    });
  }

  return (
    <section className="profile-section-card" aria-labelledby="profile-theme-heading">
      <div className="profile-section-header">
        <h2 id="profile-theme-heading" className="profile-section-title">
          <svg
            aria-hidden="true"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="profile-section-icon"
          >
            <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
            <circle cx="8.5" cy="8.5" r="1" />
            <circle cx="14.5" cy="7.5" r="1" />
            <circle cx="7.5" cy="13.5" r="1" />
          </svg>
          {t('profile.themeSettings.heading')}
        </h2>
        <span className="profile-section-pill">{t('profile.themeSettings.pill')}</span>
      </div>

      <div className={styles.container}>
        <p className={styles.intro}>{t('profile.themeSettings.intro')}</p>

        <div
          className={styles.themeGrid}
          role="group"
          aria-label={t('profile.themeSettings.themeListAria')}
        >
          {QUIZ_THEMES.map((theme) => {
            const selected = theme.id === themeId;
            const themeName = t(`quiz.themes.${theme.id}.name`);
            const themeTagline = t(`quiz.themes.${theme.id}.tagline`);
            const themeBadge = t(`quiz.themes.${theme.id}.badge`);
            return (
              <div
                key={theme.id}
                className={`${styles.themeCard} ${selected ? styles.themeCardActive : ''}`}
              >
                <div
                  className={styles.previewBanner}
                  style={{
                    backgroundColor: theme.visuals.arenaBgColor,
                    backgroundImage: theme.visuals.arenaBgImage,
                  }}
                >
                  <span className={styles.badge}>{themeBadge}</span>
                  {selected && (
                    <span className={styles.activeTag}>{t('profile.themeSettings.activeTag')}</span>
                  )}
                </div>

                <div className={styles.cardBody}>
                  <div>
                    <h3 className={styles.themeTitle}>{themeName}</h3>
                    <p className={styles.themeTagline}>{themeTagline}</p>
                  </div>

                  <div className={styles.previewRow}>
                    <button
                      type="button"
                      className={`${styles.previewBtn} ${
                        previewing === `${theme.id}:lobby` ? styles.previewBtnActive : ''
                      }`}
                      onClick={() => handlePreview(theme, 'lobby')}
                    >
                      {previewing === `${theme.id}:lobby`
                        ? t('profile.themeSettings.stopPreview')
                        : t('profile.themeSettings.previewLobby')}
                    </button>
                    <button
                      type="button"
                      className={`${styles.previewBtn} ${
                        previewing === `${theme.id}:match` ? styles.previewBtnActive : ''
                      }`}
                      onClick={() => handlePreview(theme, 'match')}
                    >
                      {previewing === `${theme.id}:match`
                        ? t('profile.themeSettings.stopPreview')
                        : t('profile.themeSettings.previewMatch')}
                    </button>
                    <button
                      type="button"
                      className={`${styles.previewBtn} ${
                        previewing === `${theme.id}:skill` ? styles.previewBtnActive : ''
                      }`}
                      onClick={() => handlePreview(theme, 'skill')}
                    >
                      {previewing === `${theme.id}:skill`
                        ? t('profile.themeSettings.stopPreview')
                        : t('profile.themeSettings.previewSkill')}
                    </button>
                  </div>

                  <button
                    type="button"
                    aria-pressed={selected}
                    aria-label={t('profile.themeSettings.selectThemeAria', { name: themeName })}
                    className={`${styles.selectBtn} ${selected ? styles.selectBtnSelected : ''}`}
                    onClick={() => setThemeId(theme.id)}
                  >
                    {selected
                      ? t('profile.themeSettings.selectedButton')
                      : t('profile.themeSettings.selectButton')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div
          className={styles.audioChannels}
          role="group"
          aria-label={t('profile.themeSettings.audioChannelsAria')}
        >
          <h3 className={styles.channelHeading}>{t('profile.themeSettings.audioHeading')}</h3>
          <div className={styles.channelList}>
            <label className={styles.channelItem}>
              <input
                type="checkbox"
                checked={lobbyBgmEnabled}
                onChange={(event) => setLobbyBgmEnabled(event.target.checked)}
              />
              <span className={styles.channelText}>
                <span className={styles.channelTitle}>
                  {t('profile.themeSettings.lobbyBgmTitle')}
                </span>
                <span className={styles.channelDesc}>
                  {t('profile.themeSettings.lobbyBgmDesc')}
                </span>
              </span>
            </label>

            <label className={styles.channelItem}>
              <input
                type="checkbox"
                checked={matchBgmEnabled}
                onChange={(event) => setMatchBgmEnabled(event.target.checked)}
              />
              <span className={styles.channelText}>
                <span className={styles.channelTitle}>
                  {t('profile.themeSettings.matchBgmTitle')}
                </span>
                <span className={styles.channelDesc}>
                  {t('profile.themeSettings.matchBgmDesc')}
                </span>
              </span>
            </label>

            <label className={styles.channelItem}>
              <input
                type="checkbox"
                checked={skillSfxEnabled}
                onChange={(event) => setSkillSfxEnabled(event.target.checked)}
              />
              <span className={styles.channelText}>
                <span className={styles.channelTitle}>
                  {t('profile.themeSettings.skillSfxTitle')}
                </span>
                <span className={styles.channelDesc}>
                  {t('profile.themeSettings.skillSfxDesc')}
                </span>
              </span>
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
