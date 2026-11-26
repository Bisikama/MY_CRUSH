'use client';

import { useI18n } from '../../../i18n';
import styles from './quiz-lobby-setup.module.css';

interface QuizLobbyHeroProps {
  nickname: string;
  motionEnabled: boolean;
  onToggleMotion: () => void;
}

function LavenderBunnyMascot() {
  return (
    <svg viewBox="0 0 80 80" width="66" height="66" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="bunnyBodyGrad" cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#F1D9FF" />
          <stop offset="65%" stopColor="#C9A2F8" />
          <stop offset="100%" stopColor="#A67CE8" />
        </radialGradient>
      </defs>
      {/* Ears */}
      <ellipse cx="29" cy="21" rx="8" ry="18" transform="rotate(-12 29 21)" fill="url(#bunnyBodyGrad)" />
      <ellipse cx="29" cy="22" rx="4" ry="11" transform="rotate(-12 29 22)" fill="#F9B8DA" />
      <ellipse cx="50" cy="21" rx="8" ry="18" transform="rotate(10 50 21)" fill="url(#bunnyBodyGrad)" />
      <ellipse cx="50" cy="22" rx="4" ry="11" transform="rotate(10 50 22)" fill="#F9B8DA" />
      {/* Head */}
      <circle cx="40" cy="49" r="23" fill="url(#bunnyBodyGrad)" />
      {/* Cheeks */}
      <ellipse cx="27" cy="54" rx="4.5" ry="2.8" fill="#FFA6CC" fillOpacity="0.65" />
      <ellipse cx="53" cy="54" rx="4.5" ry="2.8" fill="#FFA6CC" fillOpacity="0.65" />
      {/* Eyes */}
      <circle cx="32" cy="48" r="3.1" fill="#2A1E46" />
      <circle cx="31" cy="46.8" r="1.1" fill="#FFFFFF" />
      <circle cx="48" cy="48" r="3.1" fill="#2A1E46" />
      <circle cx="47" cy="46.8" r="1.1" fill="#FFFFFF" />
      {/* Nose & Smile */}
      <ellipse cx="40" cy="52" rx="2.4" ry="1.7" fill="#FF79B0" />
      <path d="M36.5 55.5C38 57.3 42 57.3 43.5 55.5" stroke="#4D2E72" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BlueBirdMascot() {
  return (
    <svg viewBox="0 0 80 80" width="66" height="66" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="birdBodyGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#B8EAFF" />
          <stop offset="60%" stopColor="#6EC7F8" />
          <stop offset="100%" stopColor="#419CE0" />
        </radialGradient>
      </defs>
      {/* Tuft */}
      <path d="M40 16C36 22 39 27 43 27C47 27 50 22 46 17C44 19 42 18 40 16Z" fill="#6EC7F8" />
      {/* Body */}
      <circle cx="42" cy="47" r="22" fill="url(#birdBodyGrad)" />
      {/* Wing */}
      <ellipse cx="58" cy="50" rx="9" ry="12" transform="rotate(-18 58 50)" fill="#4DA8EB" />
      {/* Belly */}
      <ellipse cx="38" cy="56" rx="12" ry="9" fill="#E6F8FF" fillOpacity="0.88" />
      {/* Eyes */}
      <circle cx="33" cy="44" r="3" fill="#1E2F4D" />
      <circle cx="32" cy="42.8" r="1" fill="#FFFFFF" />
      <circle cx="46" cy="44" r="3" fill="#1E2F4D" />
      <circle cx="45" cy="42.8" r="1" fill="#FFFFFF" />
      {/* Beak */}
      <path d="M35 48.5L39.5 46L44 48.5L39.5 53.5L35 48.5Z" fill="#FFB732" />
      {/* Blush */}
      <ellipse cx="28" cy="49" rx="3.8" ry="2.2" fill="#FF9FC2" fillOpacity="0.6" />
      <ellipse cx="51" cy="49" rx="3.8" ry="2.2" fill="#FF9FC2" fillOpacity="0.6" />
    </svg>
  );
}

/** Puffy cloud-shaped title flanked by 3D pastel mascots (Variant 2B Polished). */
export function QuizLobbyHero({
  nickname,
  motionEnabled,
  onToggleMotion,
}: QuizLobbyHeroProps) {
  const { localeMeta, t } = useI18n();

  return (
    <section className={styles.heroCloudRow} aria-labelledby="quiz-lobby-hero-heading">
      <div className={styles.heroMetaStrip}>
        <p className={styles.heroEyebrow}>
          <span aria-hidden="true">☀</span>
          <span>
            {t('quiz.setup.heroEyebrow', {
              nickname: nickname.toLocaleUpperCase(localeMeta.code),
            })}
          </span>
        </p>
        <button
          type="button"
          className={styles.motionToggleBtn}
          aria-pressed={motionEnabled}
          onClick={onToggleMotion}
        >
          <span aria-hidden="true">{motionEnabled ? '🌈' : '☁'}</span>
          <span>
            {motionEnabled ? t('quiz.setup.skyMotionOn') : t('quiz.setup.skyMotionOff')}
          </span>
        </button>
      </div>

      <div className={styles.cloudHeroWrap}>
        <svg
          className={styles.cloudHeroSvg}
          viewBox="0 0 480 116"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="lobbyTitleCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="72%" stopColor="#F9FCFF" />
              <stop offset="100%" stopColor="#E1F1FF" />
            </linearGradient>
          </defs>
          <path
            d="M78 98 C40 98 18 82 18 62 C18 45 36 33 60 32 C72 15 102 8 136 14 C162 3 206 2 238 14 C272 2 318 3 346 15 C382 8 416 16 432 34 C454 36 466 49 466 65 C466 84 442 98 406 98 C374 106 322 106 286 100 C252 108 196 108 164 100 C130 106 98 104 78 98 Z"
            fill="url(#lobbyTitleCloudGrad)"
            stroke="#FFFFFF"
            strokeWidth="3.5"
          />
        </svg>

        <span className={`${styles.mascotBadge} ${styles.mascotLeft}`}>
          <LavenderBunnyMascot />
        </span>

        <h1 id="quiz-lobby-hero-heading" className={styles.cloudHeroTitle}>
          {t('quiz.setup.lobbyCloudTitle')}
        </h1>

        <span className={`${styles.mascotBadge} ${styles.mascotRight}`}>
          <BlueBirdMascot />
        </span>
      </div>
    </section>
  );
}
