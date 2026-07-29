"use client";

import { useEffect, useState } from "react";

import { Segmented } from "@/components/ui/segmented";
import {
  applyThemeChoice,
  readThemeChoice,
  type ThemeChoice,
} from "@/lib/theme";

const OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Auto" },
];

export function ThemeToggle() {
  // Rendered from the default on the server; corrected on mount from
  // localStorage, which is the only place the real choice lives.
  const [choice, setChoice] = useState<ThemeChoice>("dark");

  useEffect(() => {
    setChoice(readThemeChoice());
  }, []);

  // Follow the OS while the user has "Auto" selected.
  useEffect(() => {
    if (choice !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeChoice("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [choice]);

  return (
    <Segmented
      ariaLabel="Colour theme"
      options={OPTIONS}
      value={choice}
      onChange={(next) => {
        setChoice(next);
        applyThemeChoice(next);
      }}
      className="w-full"
    />
  );
}
