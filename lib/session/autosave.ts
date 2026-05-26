"use client";

import { useEffect, useRef } from "react";

const PREFIX = "gym:session:";
const VERSION = 1;
const SAVE_INTERVAL_MS = 5_000;

interface Envelope<T> {
  v: number;
  t: number; // saved-at timestamp (ms)
  data: T;
}

function key(sessionId: string) {
  return `${PREFIX}${sessionId}`;
}

/**
 * Persists `value` to localStorage:
 *   - Immediately (debounced 800 ms) whenever the value changes.
 *   - On a 5 s interval as a belt-and-suspenders fallback.
 *   - Whenever the page is hidden / unloaded / frozen.
 *
 * iOS Safari aggressively reloads backgrounded tabs, so we always have a
 * recent snapshot to restore from.
 *
 * The value should be JSON-serializable. Functions, Dates, etc. won't
 * round-trip — keep it primitive.
 */
export function useSessionAutosave<T>(sessionId: string, value: T) {
  const valueRef = useRef(value);
  valueRef.current = value;

  // Debounced reactive save: fires ~800 ms after any state change.
  // This is the primary mechanism — it keeps localStorage current at all
  // times regardless of whether page-lifecycle events fire.
  const serialized = JSON.stringify(value);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      try {
        const envelope: Envelope<T> = {
          v: VERSION,
          t: Date.now(),
          data: valueRef.current,
        };
        window.localStorage.setItem(key(sessionId), JSON.stringify(envelope));
      } catch {
        // Storage full / disabled / private mode — best-effort only.
      }
    }, 800);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, serialized]);

  // Interval + page-lifecycle events as belt-and-suspenders fallbacks.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const save = () => {
      try {
        const envelope: Envelope<T> = {
          v: VERSION,
          t: Date.now(),
          data: valueRef.current,
        };
        window.localStorage.setItem(key(sessionId), JSON.stringify(envelope));
      } catch {
        // Storage full / disabled / private mode — best-effort only.
      }
    };

    const onHide = () => {
      if (document.visibilityState === "hidden") save();
    };

    const interval = window.setInterval(save, SAVE_INTERVAL_MS);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", save);
    // `freeze` fires when the browser is about to put the page into the
    // Back/Forward Cache or discard it — more reliable than pagehide on
    // some iOS versions.
    window.addEventListener("freeze", save);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", save);
      window.removeEventListener("freeze", save);
      // Fire one last save on unmount.
      save();
    };
  }, [sessionId]);
}

export function loadAutosave<T>(
  sessionId: string,
): { data: T; savedAt: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Envelope<T>;
    if (parsed.v !== VERSION) return null;
    return { data: parsed.data, savedAt: parsed.t };
  } catch {
    return null;
  }
}

export function clearAutosave(sessionId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key(sessionId));
  } catch {
    // ignore
  }
}
