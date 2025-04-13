import languages from "@/lib/languages";
import Link from "next/link";
import { useParams } from "next/navigation";

export default async function FooterLanguageSwitcher() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
      {languages.map((lang, index) => (
        <span key={lang.code} className="flex items-center">
          {index > 0 && <span className="mx-2">•</span>}
          <Link
            href={`/${lang.lang}`}
            className="hover:text-primary transition-colors flex items-center gap-1.5"
          >
            <span className="text-base">{lang.flag}</span>
            <span>{lang.language}</span>
          </Link>
        </span>
      ))}
    </div>
  );
}
