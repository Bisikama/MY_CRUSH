'use client';

import { useState } from 'react';
import Link from 'next/link';
import { demoCode, demoEmail, demoPassword } from '../mock/data';
import { labScenes, type LabScene } from '../mock/match';
import { usePlatform } from '../providers/platform-provider';
import styles from './lab-controls.module.css';

export function LabControls() {
  const [scene, setScene] = useState<LabScene>('lobby');
  const {
    room,
    lastScene,
    connected,
    canSwitch,
    perspective,
    switchPlayer,
    toggleConnection,
    openScene,
    previewPending,
  } = usePlatform();

  return (
    <details className={styles.panel}>
      <summary>UI Lab</summary>
      <div className={styles.controls}>
        <label htmlFor="lab-scene">Cảnh thử</label>
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
            Mở cảnh
          </button>
          <button
            type="button"
            disabled={!lastScene}
            onClick={() => lastScene && openScene(lastScene)}
          >
            Phát lại
          </button>
          <button type="button" onClick={() => window.location.replace('/')}>
            Đặt lại
          </button>
        </div>
        {canSwitch && (
          <div className={styles.row} role="group" aria-label="Góc nhìn LAN">
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
            {connected ? 'Giả lập mất kết nối' : 'Kết nối lại'}
          </button>
        )}
        <p>
          <Link href="/login">Tài khoản mẫu mặc định</Link> {demoEmail} · {demoPassword}
          <br />
          Mã xác minh {demoCode}. Chỉ dùng thông tin thử.
        </p>
      </div>
    </details>
  );
}
