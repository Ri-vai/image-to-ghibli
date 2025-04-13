import { getLanguageInfo } from "@/scripts/languages";
import Link from "next/link";
import { useParams } from "next/navigation";

const languageCodes = [
  "en",
  "de",
  "es",
  "zh",
  "fr",
  "it",
  "ja",
  "ko",
  "nl",
  "pt",
  "ru",
  "tr",
];

export default async function FooterLanguageSwitcher() {
  const languages = languageCodes.map((code) => getLanguageInfo(code));

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
      {languages.map((lang, index) => (
        <span key={lang.code} className="flex items-center">
          {index > 0 && <span className="mx-2">•</span>}
          <Link
            href={`/${lang.code}`}
            className="hover:text-primary transition-colors"
          >
            {lang.language}
          </Link>
        </span>
      ))}
    </div>
  );
}
