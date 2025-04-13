import { Pathnames } from "next-intl/routing";

export const locales = [
  "en",
  "zh",
  "ar",
  "de",
  "es",
  "fr",
  "it",
  "ja",
  "ko",
  "nl",
  "pt",
  "ru",
  "tr",
  "tw",
  "vi",
];

export const localeNames: any = {
  en: "English",
  zh: "中文",
  ar: "العربية",
  de: "Deutsch",
  es: "Español",
  fr: "Français",
  it: "Italiano",
  ja: "日本語",
  ko: "한국어",
  nl: "Nederlands",
  pt: "Português",
  ru: "Русский",
  tr: "Türkçe",
  tw: "繁體中文",
  vi: "Tiếng Việt",
};

export const defaultLocale = "en";

export const localePrefix = "as-needed";

export const localeDetection =
  process.env.NEXT_PUBLIC_LOCALE_DETECTION === "true";

export const pathnames = {
  en: {
    "privacy-policy": "/privacy-policy",
    "terms-of-service": "/terms-of-service",
  },
} satisfies Pathnames<typeof locales>;
