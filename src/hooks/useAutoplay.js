import { useEffect, useRef, useState } from "react";

// Drives the demo on its own: pump traffic each tick, and when the round window
// fills, auto-decide + evolve, then keep going. This is the hands-off "watch the
// site improve" loop used in live demos and for recording the deck GIF.
//
// We read the latest experiment state through a ref so the interval callback
// never closes over stale values, and a busy flag prevents overlapping decides.

const TICK_MS = 280;
const BASE_BATCH = 65; // visitors per tick at 1x

export function useAutoplay(exp) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);

  const latest = useRef(exp);
  latest.current = exp;
  const busy = useRef(false);

  useEffect(() => {
    if (!isPlaying) return undefined;

    const interval = setInterval(async () => {
      if (busy.current) return;
      const s = latest.current;
      if (!s || s.experiment.status !== "running") return;

      if (s.roundProgress < 1) {
        const batch = Math.round(BASE_BATCH * speed);
        s.simulate(batch);
      } else {
        // Round window is full — decide and evolve, then continue next tick.
        busy.current = true;
        try {
          await s.decide();
        } finally {
          busy.current = false;
        }
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [isPlaying, speed]);

  // Stop autoplay whenever we leave a running experiment (e.g. reset).
  useEffect(() => {
    if (exp.experiment.status !== "running" && isPlaying) {
      setIsPlaying(false);
    }
  }, [exp.experiment.status, isPlaying]);

  return {
    isPlaying,
    play: () => setIsPlaying(true),
    pause: () => setIsPlaying(false),
    toggle: () => setIsPlaying((p) => !p),
    speed,
    setSpeed,
  };
}
