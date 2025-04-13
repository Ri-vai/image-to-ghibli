const languageMap = {
  en: { language: "English", code: "en" },
  zh: { language: "Chinese", code: "zh" },
  ar: { language: "Arabic", code: "ar" },
  de: { language: "German", code: "de" },
  es: { language: "Spanish", code: "es" },
  fr: { language: "French", code: "fr" },
  it: { language: "Italian", code: "it" },
  ja: { language: "Japanese", code: "ja" },
  ko: { language: "Korean", code: "ko" },
  nl: { language: "Dutch", code: "nl" },
  pt: { language: "Portuguese", code: "pt" },
  ru: { language: "Russian", code: "ru" },
  tr: { language: "Turkish", code: "tr" },
  vi: { language: "Vietnamese", code: "vi" },
  tw: { language: "Traditional Chinese", code: "tw" },
};

function getLanguageInfo(langCode) {
  return languageMap[langCode] || { language: langCode, code: langCode };
}

module.exports = {
  getLanguageInfo,
};
