'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { PurpleCloudSkyEngine } from './sky-engine';
import styles from './shop-sky.module.css';

export interface ShopSkyCanvasHandle {
  spawnMeteorShower: () => void;
}

interface ShopSkyCanvasProps {
  motionEnabled: boolean;
}

export const ShopSkyCanvas = forwardRef<ShopSkyCanvasHandle, ShopSkyCanvasProps>(
  function ShopSkyCanvas({ motionEnabled }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const engineRef = useRef<PurpleCloudSkyEngine | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        spawnMeteorShower() {
          engineRef.current?.spawnMeteorShower();
        },
      }),
      [],
    );

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      let engine: PurpleCloudSkyEngine;
      try {
        engine = new PurpleCloudSkyEngine(canvas, motionEnabled);
      } catch {
        return;
      }
      engineRef.current = engine;
      engine.start();

      const onResize = () => engine.resize(window.innerWidth, window.innerHeight);
      const onPointerMove = (event: PointerEvent) =>
        engine.setPointer(event.clientX, event.clientY);
      const onVisibilityChange = () => engine.setHidden(document.hidden);

      window.addEventListener('resize', onResize, { passive: true });
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      document.addEventListener('visibilitychange', onVisibilityChange);

      return () => {
        window.removeEventListener('resize', onResize);
        window.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        engine.destroy();
        engineRef.current = null;
      };
      // Initialize engine once; subsequent motionEnabled changes sync via the effect below.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      engineRef.current?.setMotionEnabled(motionEnabled);
    }, [motionEnabled]);

    return (
      <>
        <div className={styles.fallbackSky} aria-hidden="true" />
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        <div className={styles.aura} aria-hidden="true" />
      </>
    );
  },
);
