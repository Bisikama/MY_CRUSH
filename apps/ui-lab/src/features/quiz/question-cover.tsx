'use client';

import { useEffectEvent, useLayoutEffect, useRef, type ReactNode } from 'react';
import styles from './question-cover.module.css';

const skillMedia = {
  COVER: {
    video: '/videos/quiz/cover-thunder-v1.mp4',
    poster: '/videos/quiz/cover-thunder-v1.webp',
  },
} as const;

export function PreloadQuestionCover() {
  return (
    <>
      <link rel="preload" as="image" href={skillMedia.COVER.poster} />
      <video src={skillMedia.COVER.video} preload="auto" playsInline hidden />
    </>
  );
}

export function QuestionCover({
  children,
  startsAt,
  clockOffset,
  soundEnabled,
}: {
  children: ReactNode;
  startsAt: number | null;
  clockOffset: number;
  soundEnabled: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const covered = startsAt !== null;
  const elapsedSeconds = useEffectEvent((start: number) =>
    Math.max(0, (Date.now() + clockOffset - start) / 1000),
  );
  const setInitialMute = useEffectEvent((video: HTMLVideoElement) => {
    video.muted = !soundEnabled;
  });

  useLayoutEffect(() => {
    const video = videoRef.current;
    if (!video || startsAt === null || matchMedia('(prefers-reduced-motion: reduce)').matches)
      return;

    const start = startsAt;
    let stopped = false;
    function seekToElapsed() {
      if (video) video.currentTime = elapsedSeconds(start);
    }

    const showVideo = () => {
      video.dataset.playing = 'true';
    };
    const showPoster = () => {
      delete video.dataset.playing;
    };

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) seekToElapsed();
    else video.addEventListener('loadedmetadata', seekToElapsed, { once: true });
    video.addEventListener('playing', showVideo);
    video.addEventListener('waiting', showPoster);
    video.addEventListener('error', showPoster);
    video.addEventListener('ended', showPoster);

    setInitialMute(video);
    void video.play().catch((error: unknown) => {
      if (stopped || !(error instanceof DOMException) || error.name !== 'NotAllowedError') return;
      video.muted = true;
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) seekToElapsed();
      void video.play().catch(showPoster);
    });

    return () => {
      stopped = true;
      video.pause();
      showPoster();
      video.removeEventListener('loadedmetadata', seekToElapsed);
      video.removeEventListener('playing', showVideo);
      video.removeEventListener('waiting', showPoster);
      video.removeEventListener('error', showPoster);
      video.removeEventListener('ended', showPoster);
    };
  }, [startsAt]);

  return (
    <div className={styles.region}>
      <div
        className={covered ? `${styles.content} ${styles.concealed}` : styles.content}
        inert={covered}
      >
        {children}
      </div>
      <div
        className={styles.overlay}
        hidden={!covered}
        style={{ backgroundImage: covered ? `url(${skillMedia.COVER.poster})` : undefined }}
      >
        <video
          ref={videoRef}
          className={styles.video}
          src={skillMedia.COVER.video}
          preload="auto"
          playsInline
          muted={!soundEnabled}
          aria-hidden="true"
        />
        {covered && <span role="status">Câu hỏi đang bị che</span>}
      </div>
    </div>
  );
}
