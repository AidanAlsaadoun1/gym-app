import type { CSSProperties } from "react";

/**
 * Categorical colour for muscle groups and split types.
 *
 * Each category owns a hue angle; the lightness and chroma come from
 * `--tone-l` / `--tone-c`, which globals.css redefines per theme. That's what
 * lets one hue table stay readable on both a near-black and a warm-white
 * canvas — the alternative (a Tailwind class pair per category per theme) was
 * 22 hard-coded palette classes that only worked in light mode.
 */

const MUSCLE_HUES: Record<string, number> = {
  chest: 25,
  back: 250,
  shoulders: 75,
  biceps: 295,
  triceps: 330,
  quads: 145,
  hamstrings: 175,
  glutes: 45,
  calves: 120,
  core: 275,
  forearms: 210,
};

const SPLIT_HUES: Record<string, number> = {
  push: 25,
  pull: 250,
  legs: 145,
  upper: 295,
  lower: 175,
  full: 275,
  custom: 85,
};

/** Neutral fallback hue for anything not in the tables. */
const FALLBACK_HUE = 85;

export function muscleHue(group: string): number {
  return MUSCLE_HUES[group] ?? FALLBACK_HUE;
}

export function splitHue(splitType: string): number {
  return SPLIT_HUES[splitType] ?? FALLBACK_HUE;
}

/** Foreground colour only — for text, icons and chart strokes. */
export function toneColor(hue: number): string {
  return `oklch(var(--tone-l) var(--tone-c) ${hue})`;
}

/** Text + translucent background, for badges and pills. */
export function toneStyle(hue: number): CSSProperties {
  return {
    color: toneColor(hue),
    backgroundColor: `oklch(var(--tone-l) var(--tone-c) ${hue} / var(--tone-soft-alpha))`,
  };
}

/** Solid fill, for meter bars and dots. */
export function toneFill(hue: number): CSSProperties {
  return { backgroundColor: toneColor(hue) };
}
