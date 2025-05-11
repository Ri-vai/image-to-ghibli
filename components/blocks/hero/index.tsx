import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import HappyUsers from "./happy-users";
import HeroBg from "./bg";
import { Hero as HeroType } from "@/types/blocks/hero";
import Icon from "@/components/icon";
import Link from "next/link";

export default function Hero({ hero }: { hero: HeroType }) {
  if (hero.disabled) {
    return null;
  }

  const highlightText = hero.highlight_text;
  let texts = null;
  if (highlightText) {
    texts = hero.title?.split(highlightText, 2);
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-background to-muted/20">
      <HeroBg />
      <div className="absolute inset-0 bg-grid-small-black/[0.02] bg-grid-small-white/[0.02]" />
      <div className="pointer-events-none absolute inset-0 bg-background [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />

      <section className="relative py-20 sm:py-32">
        <div className="container px-4 md:px-6">
          <div className="grid items-center gap-6 lg:grid-cols-2 lg:gap-12">
            <div className="flex flex-col items-start space-y-8">
              {hero.show_badge && (
                <div className="flex items-center">
                  <img
                    src="/imgs/badges/phdaily.svg"
                    alt="phdaily"
                    className="h-10 object-cover"
                  />
                </div>
              )}

              {hero.announcement && (
                <a
                  href={hero.announcement.url}
                  className="inline-flex items-center gap-2 rounded-full border bg-background/95 px-4 py-2 text-sm shadow-sm backdrop-blur transition-colors hover:bg-accent"
                >
                  {hero.announcement.label && (
                    <Badge
                      variant="secondary"
                      className="bg-primary/10 text-primary hover:bg-primary/20"
                    >
                      {hero.announcement.label}
                    </Badge>
                  )}
                  <span className="font-medium">{hero.announcement.title}</span>
                </a>
              )}

              <div className="space-y-6">
                {texts && texts.length > 1 ? (
                  <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
                    {texts[0]}
                    <span className="text-primary">{highlightText}</span>
                    {texts[1]}
                  </h1>
                ) : (
                  <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
                    {hero.title}
                  </h1>
                )}

                <p
                  className="max-w-[42rem] text-lg text-muted-foreground sm:text-xl"
                  dangerouslySetInnerHTML={{ __html: hero.description || "" }}
                />
              </div>

              {hero.buttons && (
                <div className="flex flex-col gap-4 min-[400px]:flex-row">
                  {hero.buttons.map((item, i) => {
                    return (
                      <Link
                        key={i}
                        href={item.url || ""}
                        target={item.target || ""}
                      >
                        <Button
                          size="lg"
                          variant={item.variant || "default"}
                          className={`w-full min-[400px]:w-auto ${
                            item.variant === "default"
                              ? "bg-primary hover:bg-primary/90"
                              : ""
                          }`}
                        >
                          {item.title}
                          {item.icon && (
                            <Icon name={item.icon} className="ml-2" />
                          )}
                        </Button>
                      </Link>
                    );
                  })}
                </div>
              )}

              {hero.tip && (
                <p className="text-sm text-muted-foreground">{hero.tip}</p>
              )}

              {hero.show_happy_users && <HappyUsers />}

              <div className="mt-6 flex flex-wrap gap-x-12 gap-y-4 text-sm">
                <div>
                  <p className="text-3xl font-semibold">150K+</p>
                  <p className="text-muted-foreground">Creators Trusted</p>
                </div>
                <div>
                  <p className="text-3xl font-semibold">High quality</p>
                  <p className="text-muted-foreground">Realistic face swaps</p>
                </div>
              </div>
            </div>

            <div className="relative aspect-square md:aspect-[4/3] lg:aspect-[3/4] xl:aspect-[4/3]">
              <div className="absolute inset-0 z-0 bg-gradient-to-tr from-primary/10 via-primary/5 to-transparent" />
              <div className="group relative h-full overflow-hidden rounded-[20px] border bg-gradient-to-br from-neutral-200/90 via-neutral-100/90 to-neutral-100/70 shadow-2xl dark:from-neutral-900/90 dark:via-neutral-900/90 dark:to-neutral-800/70">
                {hero.video ? (
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-full w-full object-cover transition-transform duration-500 will-change-transform group-hover:scale-105"
                  >
                    <source
                      src={hero.video.src}
                      type={hero.video.type || "video/mp4"}
                    />
                    Your browser does not support the video tag.
                  </video>
                ) : hero.image ? (
                  <img
                    src={hero.image.src}
                    alt={hero.image.alt || "Hero"}
                    className="h-full w-full object-cover transition-transform duration-500 will-change-transform group-hover:scale-105"
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
