'use client';

import { useRef, useState } from 'react';
import type { QuestionImage } from '@duoquest/shared-types';
import { sampleImage } from '../../mock/packs';
import styles from './question-images.module.css';

function QuestionImageTile({
  image,
  lazy,
  inMatch,
}: {
  image: QuestionImage;
  lazy: boolean;
  inMatch: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const viewer = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  if (failed) {
    return (
      <div className={styles.tile}>
        <p role="status">Không tải được ảnh.</p>
      </div>
    );
  }

  const thumbnail = (
    <img
      src={sampleImage}
      alt={image.alt}
      decoding="async"
      loading={lazy ? 'lazy' : 'eager'}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );

  if (!inMatch) return <div className={styles.tile}>{thumbnail}</div>;

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={`${styles.tile} ${styles.zoomTrigger}`}
        aria-label={`Phóng to ảnh: ${image.alt}`}
        aria-haspopup="dialog"
        onClick={() => {
          setExpanded(true);
          viewer.current?.showModal();
        }}
      >
        {thumbnail}
        <span aria-hidden="true" className={styles.zoomIcon}>
          ⤢
        </span>
      </button>
      <dialog
        ref={viewer}
        className={styles.viewer}
        aria-label="Ảnh câu hỏi phóng to"
        onKeyDown={(event) => event.stopPropagation()}
        onClose={() => {
          setExpanded(false);
          trigger.current?.focus();
        }}
      >
        <button
          type="button"
          className={styles.close}
          aria-label="Đóng ảnh"
          onClick={() => viewer.current?.close()}
        >
          ×
        </button>
        {expanded && <img src={sampleImage} alt={image.alt} />}
      </dialog>
    </>
  );
}

export function QuestionImages({
  images,
  lazy = false,
  inMatch = false,
}: {
  images?: readonly QuestionImage[];
  lazy?: boolean;
  inMatch?: boolean;
}) {
  if (!images?.length) return null;
  return (
    <div
      className={inMatch ? styles.matchGallery : images.length > 1 ? styles.grid : styles.single}
    >
      {images.map((image, index) => (
        <QuestionImageTile
          key={`${index}:${image.src}`}
          image={image}
          lazy={lazy}
          inMatch={inMatch}
        />
      ))}
    </div>
  );
}
