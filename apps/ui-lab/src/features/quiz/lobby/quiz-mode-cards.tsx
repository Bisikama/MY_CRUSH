'use client';

import type { GameMode } from '@duoquest/shared-types';
import { useI18n } from '../../../i18n';
import styles from './quiz-lobby-setup.module.css';

interface QuizModeCardsProps {
  mode: GameMode;
  onChange: (mode: GameMode) => void;
}

const MODE_META: readonly { id: GameMode; icon: string }[] = [
  { id: 'SOLO', icon: '01' },
  { id: 'DUEL', icon: '02' },
  { id: 'COOP', icon: '∞' },
];

/** 3 centered chunky 3D Toybox mode tiles with SELECTED badge and glowing rim. */
export function QuizModeCards({ mode, onChange }: QuizModeCardsProps) {
  const { t } = useI18n();

  return (
    <div className={styles.modeRow} role="group" aria-label={t('quiz.setup.sectionHeading')}>
      {MODE_META.map((item) => {
        const selected = mode === item.id;
        return (
          <button
            key={item.id}
            type="button"
            title={t(`quiz.modes.${item.id}.description`)}
            className={`${styles.modeCard} ${selected ? styles.modeCardSelected : ''}`}
            onClick={() => onChange(item.id)}
            aria-pressed={selected}
          >
            {selected && (
              <>
                <span className={styles.modeSelectedPill}>{t('quiz.setup.selectedBadge')}</span>
                <span className={styles.modeSelectedSpark} aria-hidden="true">
                  ✦
                </span>
              </>
            )}
            <span className={styles.modeNumber}>{item.icon}</span>
            <span className={styles.modeTitle}>{t(`quiz.modes.${item.id}.title`)}</span>
          </button>
        );
      })}
    </div>
  );
}
