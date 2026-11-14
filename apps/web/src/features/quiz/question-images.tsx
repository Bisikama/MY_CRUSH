'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { QuestionImage } from '@duoquest/shared-types';
import styles from './question-images.module.css';

function QuestionImageTile({
  image,
  lazy,
  inMatch,
  concealed,
}: {
  image: QuestionImage;
  lazy: boolean;
  inMatch: boolean;
  concealed: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const viewer = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (concealed) viewer.current?.close();
  }, [concealed]);

  if (failed) {
    return (
      <div className={styles.tile}>
        <p role="status">Không tải được ảnh.</p>
      </div>
    );
  }

  const thumbnail = (
    <img
      src={image.src}
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
        {expanded && <img src={image.src} alt={image.alt} referrerPolicy="no-referrer" />}
      </dialog>
    </>
  );
}

export function QuestionImages({
  images,
  lazy = false,
  inMatch = false,
  concealed = false,
}: {
  images?: readonly QuestionImage[];
  lazy?: boolean;
  inMatch?: boolean;
  concealed?: boolean;
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
          concealed={concealed}
        />
      ))}
    </div>
  );
}
