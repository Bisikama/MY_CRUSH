'use client';

import { useState } from 'react';
import type { QuestionImage } from '@duoquest/shared-types';
import styles from './question-images.module.css';

function QuestionImageTile({ image, lazy }: { image: QuestionImage; lazy: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={styles.tile}>
      {failed ? (
        <p role="status">Không tải được ảnh.</p>
      ) : (
        <img
          src={image.src}
          alt={image.alt}
          decoding="async"
          loading={lazy ? 'lazy' : 'eager'}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export function QuestionImages({
  images,
  lazy = false,
}: {
  images?: readonly QuestionImage[];
  lazy?: boolean;
}) {
  if (!images?.length) return null;
  return (
    <div className={images.length > 1 ? styles.grid : styles.single}>
      {images.map((image, index) => (
        <QuestionImageTile key={`${index}:${image.src}`} image={image} lazy={lazy} />
      ))}
    </div>
  );
}
