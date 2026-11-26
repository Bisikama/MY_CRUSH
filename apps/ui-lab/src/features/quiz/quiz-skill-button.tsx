import { useId, type CSSProperties } from 'react';
import type { QuizSkill } from '@duoquest/shared-types';
import { useI18n } from '../../i18n';
import styles from './quiz-skill-button.module.css';

const skillIcons = {
  HINT: { src: '/images/quiz/skills/hint.svg', accent: '#ffe09a' },
  FIFTY_FIFTY: { src: '/images/quiz/skills/fifty-fifty.svg', accent: '#a6f2ca' },
  COVER: { src: '/images/quiz/skills/cover.svg', accent: '#bfe88d' },
  BLUR: { src: '/images/quiz/skills/blur.svg', accent: '#e2ceff' },
} satisfies Record<QuizSkill, { src: string; accent: string }>;

interface Props {
  skill: QuizSkill;
  usage: string;
  disabled: boolean;
  onActivate: () => void;
}

export function QuizSkillButton({ skill, usage, disabled, onActivate }: Props) {
  const { t } = useI18n();
  const { src, accent } = skillIcons[skill];
  const nameId = useId();
  const usageId = useId();

  return (
    <button
      type="button"
      className={styles.button}
      style={{ '--skill-accent': accent } as CSSProperties}
      disabled={disabled}
      onClick={onActivate}
      aria-labelledby={nameId}
      aria-describedby={usageId}
    >
      <img className={styles.icon} src={src} alt="" width={88} height={88} />
      <span className={styles.name} id={nameId}>
        {t(`common.skills.${skill}`)}
      </span>
      <span className={styles.usage} id={usageId}>
        {usage}
      </span>
    </button>
  );
}
