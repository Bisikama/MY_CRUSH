'use client';

import { useEffect, useState } from 'react';
import { quizAudioController, type AudioPreviewKind } from '../quiz/themes/quiz-audio-controller';
import { useQuizPreferencesStore } from '../quiz/themes/quiz-preferences.store';
import { QUIZ_THEMES, type QuizThemeDefinition } from '../quiz/themes/quiz-theme-registry';
import styles from './quiz-theme-settings.module.css';

export function QuizThemeSettings() {
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
          Chủ đề & Âm thanh phòng chơi
        </h2>
        <span className="profile-section-pill">Tùy chỉnh cá nhân</span>
      </div>

      <div className={styles.container}>
        <p className={styles.intro}>
          Chọn phông nền sân đấu và bộ âm thanh yêu thích của bạn. Thay đổi chỉ áp dụng cho giao
          diện và trải nghiệm nghe nhìn trên máy của bạn, giữ nguyên bố cục và luật tính điểm.
        </p>

        <div className={styles.themeGrid} role="group" aria-label="Danh sách chủ đề sân đấu">
          {QUIZ_THEMES.map((theme) => {
            const selected = theme.id === themeId;
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
                  <span className={styles.badge}>{theme.badge}</span>
                  {selected && <span className={styles.activeTag}>Đang dùng</span>}
                </div>

                <div className={styles.cardBody}>
                  <div>
                    <h3 className={styles.themeTitle}>{theme.name}</h3>
                    <p className={styles.themeTagline}>{theme.tagline}</p>
                  </div>

                  <div className={styles.previewRow}>
                    <button
                      type="button"
                      className={`${styles.previewBtn} ${
                        previewing === `${theme.id}:lobby` ? styles.previewBtnActive : ''
                      }`}
                      onClick={() => handlePreview(theme, 'lobby')}
                    >
                      {previewing === `${theme.id}:lobby` ? 'Dừng thử' : 'Nghe nhạc sảnh'}
                    </button>
                    <button
                      type="button"
                      className={`${styles.previewBtn} ${
                        previewing === `${theme.id}:match` ? styles.previewBtnActive : ''
                      }`}
                      onClick={() => handlePreview(theme, 'match')}
                    >
                      {previewing === `${theme.id}:match` ? 'Dừng thử' : 'Nghe nhạc trận'}
                    </button>
                    <button
                      type="button"
                      className={`${styles.previewBtn} ${
                        previewing === `${theme.id}:skill` ? styles.previewBtnActive : ''
                      }`}
                      onClick={() => handlePreview(theme, 'skill')}
                    >
                      {previewing === `${theme.id}:skill` ? 'Dừng thử' : 'Nghe âm skill'}
                    </button>
                  </div>

                  <button
                    type="button"
                    aria-pressed={selected}
                    aria-label={`Chọn chủ đề ${theme.name}`}
                    className={`${styles.selectBtn} ${selected ? styles.selectBtnSelected : ''}`}
                    onClick={() => setThemeId(theme.id)}
                  >
                    {selected ? 'Đang sử dụng' : 'Chọn chủ đề'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.audioChannels} role="group" aria-label="Cài đặt 3 kênh âm thanh">
          <h3 className={styles.channelHeading}>Kênh âm thanh trong phòng chơi</h3>
          <div className={styles.channelList}>
            <label className={styles.channelItem}>
              <input
                type="checkbox"
                checked={lobbyBgmEnabled}
                onChange={(event) => setLobbyBgmEnabled(event.target.checked)}
              />
              <span className={styles.channelText}>
                <span className={styles.channelTitle}>Nhạc nền sảnh chờ</span>
                <span className={styles.channelDesc}>
                  Phát nhạc dạo theo chủ đề khi đang đợi người chơi khác Sẵn sàng.
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
                <span className={styles.channelTitle}>Nhạc nền trong trận</span>
                <span className={styles.channelDesc}>
                  Phát nhạc nền xuyên suốt các câu hỏi khi trận đấu đang diễn ra.
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
                <span className={styles.channelTitle}>Âm thanh hiệu ứng Skill</span>
                <span className={styles.channelDesc}>
                  Phát tiếng hiệu ứng khi dùng Gợi ý, 50/50, Che câu hỏi (tiếng sét) và Làm mờ.
                </span>
              </span>
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
