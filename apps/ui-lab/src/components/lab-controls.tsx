'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '../i18n';
import { demoCode, demoEmail, demoPassword } from '../mock/data';
import { labScenes, type LabScene } from '../mock/match';
import { usePlatform } from '../providers/platform-provider';
import styles from './lab-controls.module.css';

export function LabControls() {
  const { t } = useI18n();
  const [scene, setScene] = useState<LabScene>('lobby');
  const {
    room,
    matchFocused,
    lastScene,
    connected,
    canSwitch,
    perspective,
    switchPlayer,
    toggleConnection,
    openScene,
    previewPending,
  } = usePlatform();
  const panel = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function toggle(event: KeyboardEvent) {
      if (!event.shiftKey || event.key !== 'F2' || event.repeat || !panel.current) return;
      event.preventDefault();
      panel.current.open = !panel.current.open;
    }
    window.addEventListener('keydown', toggle);
    return () => window.removeEventListener('keydown', toggle);
  }, []);

  return (
    <details
      ref={panel}
      className={matchFocused ? `${styles.panel} ${styles.inMatch}` : styles.panel}
    >
      <summary>{t('lab.summary')}</summary>
      <div className={styles.controls}>
        <label htmlFor="lab-scene">{t('lab.sceneLabel')}</label>
        <select
          id="lab-scene"
          value={scene}
          onChange={(event) => setScene(event.target.value as LabScene)}
        >
          {Object.entries(labScenes).map(([id, { label }]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <div className={styles.row}>
          <button type="button" onClick={() => openScene(scene)}>
            {t('lab.openScene')}
          </button>
          <button
            type="button"
            disabled={!lastScene}
            onClick={() => lastScene && openScene(lastScene)}
          >
            {t('lab.replay')}
          </button>
          <button type="button" onClick={() => window.location.replace('/')}>
            {t('lab.reset')}
          </button>
        </div>
        {canSwitch && (
          <div className={styles.row} role="group" aria-label={t('lab.lanPerspectiveAria')}>
            <button
              type="button"
              aria-pressed={perspective === 0}
              disabled={previewPending}
              onClick={() => switchPlayer(0)}
            >
              P1
            </button>
            <button
              type="button"
              aria-pressed={perspective === 1}
              disabled={previewPending}
              onClick={() => switchPlayer(1)}
            >
              P2
            </button>
          </div>
        )}
        {room && (
          <button type="button" disabled={previewPending} onClick={toggleConnection}>
            {connected ? t('lab.disconnect') : t('lab.reconnect')}
          </button>
        )}
        <p>
          <Link href="/login">{t('lab.demoAccountLink')}</Link> {demoEmail} · {demoPassword}
          <br />
          {t('lab.demoCodeNote', { code: demoCode })}
        </p>
      </div>
    </details>
  );
}
