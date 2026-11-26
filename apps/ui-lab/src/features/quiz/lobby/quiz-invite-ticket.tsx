'use client';

import { useState } from 'react';
import { useI18n } from '../../../i18n';
import styles from './quiz-lobby-setup.module.css';

interface QuizInviteTicketProps {
  joinCode: string;
  onJoinCodeChange: (value: string) => void;
  busy: boolean;
  connected: boolean;
  onJoinRoom: () => Promise<void>;
}

const PLACEHOLDER_CHARS = ['A', 'B', 'C', '2', '3', '4'] as const;

/** Scalloped pastel invite ticket with chunky 3x2 3D code tiles (Variant 2B Polished). */
export function QuizInviteTicket({
  joinCode,
  onJoinCodeChange,
  busy,
  connected,
  onJoinRoom,
}: QuizInviteTicketProps) {
  const { t } = useI18n();
  const [focused, setFocused] = useState(false);

  const normalized = joinCode.toUpperCase().slice(0, 6);
  const activeIndex = Math.min(normalized.length, 5);

  return (
    <aside className={styles.inviteTicketOuter} aria-labelledby="quiz-invite-heading">
      <div className={styles.inviteTicketInner}>
        <span className={styles.inviteHeaderTag}>{t('quiz.setup.joinTag')}</span>

        <div>
          <h2 id="quiz-invite-heading" className={styles.inviteTitle}>
            {t('quiz.setup.joinTitle')}
          </h2>
          <p className={styles.inviteDesc}>{t('quiz.setup.joinDesc')}</p>
        </div>

        <form
          className={styles.inviteForm}
          onSubmit={(event) => {
            event.preventDefault();
            void onJoinRoom();
          }}
        >
          <label htmlFor="room-code" className="sr-only">
            {t('quiz.setup.roomCodeLabel')}
          </label>

          <div className={styles.codeTilesWrap}>
            <input
              id="room-code"
              className={styles.codeOverlayInput}
              placeholder="ABC234"
              value={normalized}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onChange={(event) =>
                onJoinCodeChange(
                  event.target.value
                    .replace(/[^a-zA-Z0-9]/g, '')
                    .toUpperCase()
                    .slice(0, 6),
                )
              }
              maxLength={6}
              autoComplete="off"
              required
            />
            {PLACEHOLDER_CHARS.map((placeholderChar, index) => {
              const char = normalized[index] ?? '';
              const isActive = focused && index === activeIndex;
              return (
                <span
                  key={index}
                  aria-hidden="true"
                  className={`${styles.codeTile} ${char ? styles.codeTileFilled : ''} ${
                    isActive ? styles.codeTileFocused : ''
                  }`}
                >
                  {char ? (
                    char
                  ) : (
                    <span className={styles.codeTilePlaceholder}>{placeholderChar}</span>
                  )}
                </span>
              );
            })}
          </div>

          <button
            type="submit"
            className={styles.joinCta}
            disabled={busy || !connected || normalized.length !== 6}
          >
            {t('quiz.setup.joinButton')}
          </button>
        </form>
      </div>
    </aside>
  );
}
