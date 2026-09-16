import { Platform } from "react-native";
import type { Locale } from "../shared/usage";

declare const window: {
  localStorage: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
  };
};
declare const navigator: { languages: readonly string[]; language: string };

const storageKey = "sub2api-usage-locale";

export function readWebLocale(): Locale | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored === "en" || stored === "zh" ? stored : null;
  } catch {
    return null;
  }
}

export function browserLanguages(): string[] {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return [];
  const languages = Array.isArray(navigator.languages) ? [...navigator.languages] : [];
  if (navigator.language) languages.push(navigator.language);
  return languages;
}

export function rememberWebLocale(locale: Locale): void {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, locale);
  } catch {
    // The selection still applies for the current surface session.
  }
}
