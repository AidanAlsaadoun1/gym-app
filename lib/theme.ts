export type ThemeChoice = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "gym:theme";

/** What the app opens with before anyone touches the toggle. */
export const DEFAULT_THEME: ThemeChoice = "dark";

/**
 * Runs before first paint, inlined into <head>. Stamps an explicit `light` or
 * `dark` class on <html> so the stylesheet never has to guess, which is what
 * keeps a light flash off the screen on a dark-themed load.
 *
 * Kept as a string (rather than a real function we stringify) so the minifier
 * can't rename anything out from under it.
 */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var choice = stored === 'light' || stored === 'dark' || stored === 'system'
      ? stored
      : '${DEFAULT_THEME}';
    var isDark = choice === 'dark' ||
      (choice === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    var root = document.documentElement;
    root.classList.add(isDark ? 'dark' : 'light');
    root.classList.remove(isDark ? 'light' : 'dark');
    root.dataset.themeChoice = choice;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#1b1a18' : '#f8f6f1');
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export function resolveTheme(choice: ThemeChoice): "light" | "dark" {
  if (choice !== "system") return choice;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function readThemeChoice(): ThemeChoice {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // Private mode / storage disabled — fall through to the default.
  }
  return DEFAULT_THEME;
}

export function applyThemeChoice(choice: ThemeChoice) {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(choice);
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.classList.toggle("light", resolved === "light");
  root.dataset.themeChoice = choice;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", resolved === "dark" ? "#1b1a18" : "#f8f6f1");
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Best-effort only.
  }
}
