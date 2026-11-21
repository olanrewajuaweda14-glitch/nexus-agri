import { useEffect, useRef, useState } from 'react';

export const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Counts from the previous value to the new one with an ease-out curve.
 * First render counts up from 0, so a screen's key numbers "arrive" once;
 * later changes (editing a cost) glide rather than jump.
 */
export function useCountUp(target: number, durationMs = 750) {
  const [v, setV] = useState(() => (prefersReducedMotion() ? target : 0));
  const from = useRef(prefersReducedMotion() ? target : 0);
  useEffect(() => {
    if (!Number.isFinite(target)) return setV(target);
    if (prefersReducedMotion()) {
      from.current = target;
      return setV(target);
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const e = 1 - Math.pow(1 - t, 3);
      const cur = a + (target - a) * e;
      setV(cur);
      from.current = cur;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return v;
}

export function CountUp({ value, format = (n) => String(Math.round(n)) }: { value: number; format?: (n: number) => string }) {
  const v = useCountUp(value);
  // Screen readers get the final value, not every frame.
  return (
    <>
      <span aria-hidden>{format(v)}</span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}
