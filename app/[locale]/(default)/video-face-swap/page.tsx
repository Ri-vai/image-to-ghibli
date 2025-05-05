import FaceSwap from "@/components/face-swap";
import { LandingPage } from "@/types/pages/landing";
import { getLandingPage } from "@/services/page";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

interface VideoFeature {
  title: string;
  description: string;
}

interface VideoStep {
  number?: string;
  title: string;
  description: string;
}

interface VideoScenario {
  title: string;
  description: string;
}

interface VideoFaqItem {
  title: string;
  description: string;
}

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations();
  const landingPage = await getLandingPage(locale);
  const videoData = landingPage.faceSwap?.video || {};
  
  return {
    title: {
      absolute: videoData.title || "Video Face Swap | AIFACESWAP.APP"
    },
    description: videoData.description || "Swap faces in videos with our advanced AI technology. Easy to use, high quality results.",
    openGraph: {
      title: videoData.title || "Video Face Swap | AIFACESWAP.APP",
      description: videoData.description || "Swap faces in videos with our advanced AI technology. Easy to use, high quality results.",
      url: `${process.env.NEXT_PUBLIC_WEB_URL}${locale === "en" ? "" : `/${locale}`}/video-face-swap`,
      siteName: "AI Face Swap",
      images: [
        {
          url: `${process.env.NEXT_PUBLIC_WEB_URL}/imgs/og-image.jpg`,
          width: 1200,
          height: 630,
        },
      ],
      locale: locale,
      type: "website",
    },
  };
}

export default async function VideoFaceSwapPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const landingPage = await getLandingPage(locale);
  const videoData = landingPage.faceSwap?.video || {};

  return (
    <div>
      <FaceSwap locale={locale} faceSwap={landingPage.faceSwap} defaultTab="video" />
      
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col justify-center items-center text-center mb-16">
          <h1 className="text-4xl font-bold mb-6">
            {videoData.heading || "AI Video Face Swap"}
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl">
            {videoData.subheading || "Experience powerful AI face swap for videos, making every frame exciting and seamless."}
          </p>
        </div>
        
        <h2 className="text-3xl font-bold mb-8">
          {videoData.features?.title || "Features of Our Video Face Swap"}
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {(videoData.features?.items || []).map((feature: VideoFeature, index: number) => (
            <div key={index} className="bg-card rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-4">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
        
        <h2 className="text-3xl font-bold mb-8">
          {videoData.howTo?.title || "How It Works"}
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {(videoData.howTo?.steps || []).map((step: VideoStep, index: number) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mx-auto mb-4">
                {step.number || index + 1}
              </div>
              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
        
        <h2 className="text-3xl font-bold mb-8">
          {videoData.usageScenarios?.title || "Creative Uses for Video Face Swap"}
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {(videoData.usageScenarios?.items || []).map((scenario: VideoScenario, index: number) => (
            <div key={index} className="bg-card rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-4">{scenario.title}</h3>
              <p className="text-muted-foreground">{scenario.description}</p>
            </div>
          ))}
        </div>
        
        <div className="bg-card border border-border rounded-lg p-8 mb-16">
          <h2 className="text-2xl font-bold mb-6">
            {videoData.faq?.title || "Frequently Asked Questions"}
          </h2>
          
          <div className="space-y-4">
            {(videoData.faq?.items || []).map((faqItem: VideoFaqItem, index: number) => (
              <div key={index}>
                <h3 className="text-lg font-semibold mb-2">{faqItem.title}</h3>
                <p className="text-muted-foreground">{faqItem.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
