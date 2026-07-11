"use client";

import { Moon, Sun } from "lucide-react";

const themeStorageKey = "tier-list-maker-theme";

export function ThemeToggle() {
  function toggleTheme() {
    const root = document.documentElement;
    const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";

    root.dataset.theme = nextTheme;
    root.style.colorScheme = nextTheme;
    localStorage.setItem(themeStorageKey, nextTheme);
  }

  return (
    <button
      aria-label="Toggle color theme"
      className="button icon theme-toggle"
      onClick={toggleTheme}
      title="Toggle color theme"
      type="button"
    >
      <Sun aria-hidden="true" className="theme-icon theme-icon-sun" size={19} />
      <Moon aria-hidden="true" className="theme-icon theme-icon-moon" size={19} />
    </button>
  );
}
