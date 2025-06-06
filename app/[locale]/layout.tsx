import "@/app/globals.css";

import { getMessages, getTranslations } from "next-intl/server";

import { AppContextProvider } from "@/contexts/app";
import { Inter as FontSans } from "next/font/google";
import { Metadata } from "next";
import { NextAuthSessionProvider } from "@/auth/session";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "@/providers/theme";
import { cn } from "@/lib/utils";
import { locales } from "@/i18n/locale";
import { UTMHandler } from "@/lib/utm_handler";
import ScrollToHash from "@/components/ScrollToHash";
import { CreditsProvider } from "@/lib/credits-context";
import AdScript from "@/components/ads/AdScript";
const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations();

  return {
    title: {
      template: `%s | ${t("metadata.title")}`,
      default: t("metadata.title") || "",
    },
    description: t("metadata.description") || "",
    keywords: t("metadata.keywords") || "",
  };
}

export default async function RootLayout({
  children,
  params: { locale },
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string };
}>) {
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Base URL for canonical and hreflang tags */}
        <link
          rel="canonical"
          href={`https://aifaceswap.app${locale === "en" ? "" : `/${locale}`}`}
        />

        {/* Add hreflang tags for all supported languages */}
        <link
          rel="alternate"
          hrefLang="x-default"
          href="https://aifaceswap.app"
        />
        {locales
          .filter((lang) => lang !== "en")
          .map((lang) => (
            <link
              key={lang}
              rel="alternate"
              hrefLang={lang}
              href={`https://aifaceswap.app/${lang}`}
            />
          ))}
        <script
          defer
          data-domain="aifaceswap.app"
          src="https://application-plausible-f9470a-77-37-67-93.traefik.me/js/script.js"
        ></script>
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased overflow-x-hidden",
          fontSans.variable
        )}
      >
        <ScrollToHash />
        <UTMHandler />
        <CreditsProvider>
          <AdScript />
          <NextIntlClientProvider messages={messages}>
            <NextAuthSessionProvider>
              <AppContextProvider>
                <ThemeProvider attribute="class" disableTransitionOnChange>
                  {children}
                </ThemeProvider>
              </AppContextProvider>
            </NextAuthSessionProvider>
          </NextIntlClientProvider>
        </CreditsProvider>
      </body>
    </html>
  );
}
