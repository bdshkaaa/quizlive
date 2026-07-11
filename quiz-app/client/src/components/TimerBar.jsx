import { useEffect, useRef, useState } from 'react';

/**
 * startedAt: epoch ms когда начался отсчёт
 * durationMs: сколько длится
 * onExpire: вызывается один раз, когда время вышло
 */
export default function TimerBar({ startedAt, durationMs, onExpire }) {
  const [pct, setPct] = useState(100);
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
    let raf;
    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, 1 - elapsed / durationMs);
      setPct(remaining * 100);
      if (remaining <= 0) {
        if (!firedRef.current) { firedRef.current = true; onExpire?.(); }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [startedAt, durationMs]);

  return (
    <div className="timer-track">
      <div className="timer-fill" style={{ width: pct + '%' }} />
    </div>
  );
}
