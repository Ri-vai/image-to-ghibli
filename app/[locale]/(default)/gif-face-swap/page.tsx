import FaceSwap from "@/components/face-swap";
import { LandingPage } from "@/types/pages/landing";
import { getLandingPage } from "@/services/page";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations();
  const landingPage = await getLandingPage(locale);
  const gifData = landingPage.faceSwap?.gif || {};
  
  return {
    title: {
      absolute: gifData.title || "GIF Face Swap - Create Hilarious GIF Face Swaps with AI Technology"
    },
    description: gifData.description || "Swap faces on GIFs with our advanced AI technology. Create funny, shareable GIFs in seconds. No registration required, free to use, unlimited swaps!",
    openGraph: {
      title: gifData.title || "GIF Face Swap - Create Hilarious GIF Face Swaps with AI Technology",
      description: gifData.description || "Swap faces on GIFs with our advanced AI technology. Create funny, shareable GIFs in seconds. No registration required, free to use, unlimited swaps!",
      url: `${process.env.NEXT_PUBLIC_WEB_URL}${locale === "en" ? "" : `/${locale}`}/gif-face-swap`,
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

export default async function GifFaceSwapPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const landingPage = await getLandingPage(locale);

  console.log("🚀 ~ landingPage:", landingPage);

  return (
    <div>
      
      <FaceSwap locale={locale} faceSwap={landingPage.faceSwap} defaultTab="gif" />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-6">{landingPage.faceSwap.gif.heading}</h1>
        <p className="text-xl text-center text-muted-foreground mb-10">
          {landingPage.faceSwap.gif.subheading}
        </p>
      </div>
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-8">{landingPage.faceSwap.gif.features.title}</h2>
        
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h3 className="text-xl font-semibold mb-4">{landingPage.faceSwap.gif.features.items[0].title}</h3>
            <p className="text-muted-foreground">
              {landingPage.faceSwap.gif.features.items[0].description}
            </p>
          </div>
          
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h3 className="text-xl font-semibold mb-4">{landingPage.faceSwap.gif.features.items[1].title}</h3>
            <p className="text-muted-foreground">
              {landingPage.faceSwap.gif.features.items[1].description}
            </p>
          </div>
          
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h3 className="text-xl font-semibold mb-4">{landingPage.faceSwap.gif.features.items[2].title}</h3>
            <p className="text-muted-foreground">
              {landingPage.faceSwap.gif.features.items[2].description}
            </p>
          </div>
        </div>
        
        <h2 className="text-3xl font-bold mb-8">{landingPage.faceSwap.gif.howTo.title}</h2>
        
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mx-auto mb-4">{landingPage.faceSwap.gif.howTo.steps[0].number}</div>
            <h3 className="text-xl font-semibold mb-2">{landingPage.faceSwap.gif.howTo.steps[0].title}</h3>
            <p className="text-muted-foreground">{landingPage.faceSwap.gif.howTo.steps[0].description}</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mx-auto mb-4">{landingPage.faceSwap.gif.howTo.steps[1].number}</div>
            <h3 className="text-xl font-semibold mb-2">{landingPage.faceSwap.gif.howTo.steps[1].title}</h3>
            <p className="text-muted-foreground">{landingPage.faceSwap.gif.howTo.steps[1].description}</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mx-auto mb-4">{landingPage.faceSwap.gif.howTo.steps[2].number}</div>
            <h3 className="text-xl font-semibold mb-2">{landingPage.faceSwap.gif.howTo.steps[2].title}</h3>
            <p className="text-muted-foreground">{landingPage.faceSwap.gif.howTo.steps[2].description}</p>
          </div>
        </div>
        
        <h2 className="text-3xl font-bold mb-8">{landingPage.faceSwap.gif.usageScenarios.title}</h2>
        
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h3 className="text-xl font-semibold mb-4">{landingPage.faceSwap.gif.usageScenarios.items[0].title}</h3>
            <p className="text-muted-foreground">
              {landingPage.faceSwap.gif.usageScenarios.items[0].description}
            </p>
          </div>
          
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h3 className="text-xl font-semibold mb-4">{landingPage.faceSwap.gif.usageScenarios.items[1].title}</h3>
            <p className="text-muted-foreground">
              {landingPage.faceSwap.gif.usageScenarios.items[1].description}
            </p>
          </div>
          
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h3 className="text-xl font-semibold mb-4">{landingPage.faceSwap.gif.usageScenarios.items[2].title}</h3>
            <p className="text-muted-foreground">
              {landingPage.faceSwap.gif.usageScenarios.items[2].description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 