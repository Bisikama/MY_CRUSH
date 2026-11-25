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
      if (!video) return;
      const target = elapsedSeconds(start);
      if (Math.abs(video.currentTime - target) > 0.25) {
        video.currentTime = target;
      }
    }

    const showVideo = () => {
      video.dataset.playing = 'true';
    };
    const showPoster = () => {
      delete video.dataset.playing;
    };
    const showIfPlaying = () => {
      if (!stopped && !video.paused && !video.ended) {
        showVideo();
      }
    };
    const handleWaiting = () => {
      if (!video.seeking) showPoster();
    };

    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) seekToElapsed();
    else video.addEventListener('canplay', seekToElapsed, { once: true });
    video.addEventListener('playing', showVideo);
    video.addEventListener('canplay', showIfPlaying);
    video.addEventListener('seeked', showIfPlaying);
    video.addEventListener('timeupdate', showIfPlaying);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('error', showPoster);
    video.addEventListener('ended', showPoster);

    setInitialMute(video);
    void video
      .play()
      .then(showIfPlaying)
      .catch((error: unknown) => {
        if (stopped || !(error instanceof DOMException) || error.name !== 'NotAllowedError') return;
        video.muted = true;
        if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) seekToElapsed();
        void video.play().then(showIfPlaying).catch(showPoster);
      });

    return () => {
      stopped = true;
      video.pause();
      showPoster();
      video.removeEventListener('canplay', seekToElapsed);
      video.removeEventListener('playing', showVideo);
      video.removeEventListener('canplay', showIfPlaying);
      video.removeEventListener('seeked', showIfPlaying);
      video.removeEventListener('timeupdate', showIfPlaying);
      video.removeEventListener('waiting', handleWaiting);
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
