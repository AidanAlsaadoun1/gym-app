/**
 * Audio + haptic confirmation for the live screen. Every entry point is
 * best-effort: a blocked AudioContext or an unsupported vibrate API must never
 * interrupt logging a set.
 */

function withAudioContext(play: (ctx: AudioContext) => number) {
  if (typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const closeAfterMs = play(ctx);
    // Release the hardware audio resource — mobile Safari leaks it otherwise.
    window.setTimeout(() => void ctx.close().catch(() => undefined), closeAfterMs);
  } catch {
    // Autoplay policy / no audio device — silent fallback.
  }
}

export function vibrate(pattern: number | number[]) {
  if (typeof navigator === "undefined") return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Not supported (iOS Safari) — the sound carries the feedback instead.
  }
}

/** Short rising blip when a set is checked off. */
export function playSetLogged() {
  withAudioContext((ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1320, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.16, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
    return 400;
  });
  vibrate(12);
}

/** Bright two-note flourish for a personal best. */
export function playPersonalBest() {
  withAudioContext((ctx) => {
    [1046.5, 1568].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t0 = ctx.currentTime + i * 0.09;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.16, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.45);
    });
    return 900;
  });
  vibrate([15, 40, 25]);
}

/** Rest is over — needs to cut through gym noise from a pocket. */
export function playRestOver() {
  withAudioContext((ctx) => {
    [784, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t0 = ctx.currentTime + i * 0.22;
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.1, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.2);
    });
    return 700;
  });
  vibrate([200, 100, 200]);
}

/** Ascending arpeggio on finishing a workout. */
export function playWorkoutComplete() {
  withAudioContext((ctx) => {
    [261.63, 329.63, 392.0, 523.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t0 = ctx.currentTime + i * 0.12;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.14, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.6);
    });
    return 1500;
  });
  vibrate([30, 60, 30, 60, 80]);
}
