"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileType, ArrowRight, Download } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useSession, signIn } from "next-auth/react";
import { useAppContext } from "@/contexts/app";
import { CreditsAmount } from "@/services/credit";

type GifFaceSwapProps = {
  locale: string;
  faceSwap?: any;
  faceImage: string | null;
  handleFaceImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function GifFaceSwap({ 
  locale, 
  faceSwap, 
  faceImage,
  handleFaceImageUpload
}: GifFaceSwapProps) {
  const { data: session, status } = useSession();
  const { setShowSignModal } = useAppContext();
  const [targetGif, setTargetGif] = useState<string | null>(null);
  const [resultGif, setResultGif] = useState<string | null>(null);
  const [isLoadingGif, setIsLoadingGif] = useState(false);
  const [errorGif, setErrorGif] = useState<string | null>(null);

  // GIF上传处理函数
  const handleTargetGifUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target) {
          setTargetGif(event.target.result as string);
          // 重置结果状态
          setResultGif(null);
          setErrorGif(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // GIF换脸处理函数
  const handleSwapFaceGif = async () => {
    if (!faceImage || !targetGif) return;
    
    // 检查用户是否已登录
    if (status !== "authenticated") {
      // 如果未登录，显示登录模态框
      setShowSignModal(true);
      return;
    }

    try {
      setIsLoadingGif(true);
      setErrorGif(null);

      const response = await fetch("/api/gif-face-swap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceImage: faceImage,
          targetGif: targetGif
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start GIF face swap process");
      }

      if (!data.success || !data.prediction || !data.prediction.id) {
        throw new Error(data.error || "Failed to start GIF face swap process");
      }

      const predictionId = data.prediction.id;
      let attempts = 0;
      const maxAttempts = 60; // GIF处理可能需要更长时间

      const checkStatus = async () => {
        if (attempts >= maxAttempts) {
          throw new Error("处理超时，请稍后再试");
        }

        const statusResponse = await fetch(
          `/api/gif-face-swap/status?id=${predictionId}`
        );
        const statusData = await statusResponse.json();

        if (!statusResponse.ok) {
          throw new Error(
            statusData.error || "Failed to check GIF face swap status"
          );
        }

        if (statusData.success && statusData.output) {
          setResultGif(statusData.output.gif); // 注意这里获取的是gif属性
          return true;
        } else if (statusData.status === "failed") {
          throw new Error(statusData.error || "GIF换脸处理失败");
        } else {
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 4000));
          return checkStatus();
        }
      };

      await checkStatus();
    } catch (error) {
      console.error("Error swapping face in GIF:", error);
      setErrorGif(error instanceof Error ? error.message : "未知错误，请稍后再试");
    } finally {
      setIsLoadingGif(false);
    }
  };

  // 下载GIF结果函数
  const handleDownloadGif = async () => {
    if (resultGif) {
      try {
        // 获取GIF数据
        const response = await fetch(resultGif);
        const blob = await response.blob();

        // 创建一个临时URL
        const url = window.URL.createObjectURL(blob);

        // 创建一个临时链接并设置下载属性
        const link = document.createElement("a");
        link.href = url;
        link.download = `face-swap-gif-${new Date().getTime()}.gif`;
        link.style.display = "none";

        // 添加到DOM，触发点击，然后移除
        document.body.appendChild(link);
        link.click();

        // 清理
        window.setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);
      } catch (error) {
        console.error("下载GIF时出错:", error);
      }
    }
  };

  return (
    <div className="border border-dashed border-border rounded-lg p-8 bg-card/50 shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧上传区域 */}
        <div className="flex flex-col justify-between h-full">
          {/* 步骤1：上传GIF */}
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mr-4">
                1
              </div>
              <p className="text-xl font-medium text-foreground">
                {faceSwap?.uploadGif || "Upload GIF"}
              </p>
            </div>

            <div className="relative">
              <label
                htmlFor="target-gif"
                className={cn(
                  "flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer",
                  targetGif
                    ? "border-primary bg-primary/10"
                    : "border-muted hover:border-primary hover:bg-primary/5"
                )}
              >
                {targetGif ? (
                  <div className="relative w-12 h-12 overflow-hidden rounded-full border-2 border-primary">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FileType className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      {faceSwap?.uploadGif || "Upload GIF"}
                    </p>
                  </div>
                )}
                <input
                  id="target-gif"
                  type="file"
                  className="hidden"
                  accept="image/gif"
                  onChange={handleTargetGifUpload}
                />
              </label>
              <p className="mt-2 text-xs text-muted-foreground">
                {faceSwap?.gifFormat || "GIF"}
              </p>
            </div>
          </div>

          {/* 步骤2：上传目标脸部 */}
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mr-4">
                2
              </div>
              <p className="text-xl font-medium text-foreground">
                {faceSwap?.uploadFacePhoto || "Upload Face Photo"}
              </p>
            </div>

            <div className="relative">
              <label
                htmlFor="face-image-gif"
                className={cn(
                  "flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer",
                  faceImage
                    ? "border-primary bg-primary/10"
                    : "border-muted hover:border-primary hover:bg-primary/5"
                )}
              >
                {faceImage ? (
                  <div className="relative w-12 h-12 overflow-hidden rounded-full border-2 border-primary">
                    <Image
                      src={faceImage}
                      alt="Source"
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      {faceSwap?.uploadImage || "Upload Image"}
                    </p>
                  </div>
                )}
                <input
                  id="face-image-gif"
                  type="file"
                  className="hidden"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFaceImageUpload}
                />
              </label>
              <p className="mt-2 text-xs text-muted-foreground">
                PNG/JPG/JPEG/WEBP
              </p>
            </div>
          </div>

          {/* 步骤3：开始换脸 */}
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mr-4">
                3
              </div>
              <p className="text-xl font-medium text-foreground">
                {faceSwap?.startGifFaceSwap || "Start GIF Face Swap"}
              </p>
            </div>

            <Button
              onClick={handleSwapFaceGif}
              disabled={!faceImage || !targetGif || isLoadingGif}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6"
            >
                <>
                  {faceSwap?.swapGifFace || "Swap GIF Face"}{" "}
                  ({CreditsAmount.GifSwapCost} credits) <ArrowRight className="ml-2 h-4 w-4" />
                </>
            </Button>
          </div>
        </div>

        {/* 中间和右侧预览区域 */}
        <div className="col-span-2 flex items-center">
          {/* 当没有上传内容时显示示例 */}
          {!faceImage && !targetGif ? (
            <div className="relative aspect-[16/9] md:aspect-[16/10] bg-muted rounded-lg overflow-hidden w-full shadow-md group">
              <div className="absolute top-2 left-2 bg-background/70 text-foreground text-xs px-2 py-1 rounded">
                {faceSwap?.before || "Before"}
              </div>
              <div className="absolute top-2 right-2 bg-background/70 text-foreground text-xs px-2 py-1 rounded">
                {faceSwap?.after || "After"}
              </div>
              <video
                autoPlay
                loop
                muted
                playsInline
                className="h-full w-full object-cover transition-transform duration-500 will-change-transform group-hover:scale-105"
              >
                <source
                  src="/hero-video.mp4"
                  type="video/mp4"
                />
                Your browser does not support the video tag.
              </video>
            </div>
          ) : (
            // 显示预览和结果
            <div className="grid grid-cols-1 gap-4 w-full">
              <div className="grid grid-cols-1 gap-4 w-full">
                {/* 显示目标GIF预览 */}
                <div className="bg-muted rounded-lg overflow-hidden shadow-md">
                  <div className="flex justify-between items-center p-2 bg-background/50 border-b border-border">
                    <div className="text-sm font-medium">
                      {resultGif ? faceSwap?.swapResult || "Swap Result" : faceSwap?.gifPreview || "GIF Preview"}
                    </div>
                    {resultGif && (
                      <Button
                        size="sm"
                        onClick={handleDownloadGif}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        <Download className="mr-2 h-4 w-4" />{" "}
                        {faceSwap?.download || "Download"}
                      </Button>
                    )}
                  </div>
                  
                  <div className="relative aspect-[16/9] bg-background/30 p-4 flex items-center justify-center">
                    {resultGif ? (
                      // 显示结果GIF
                      <div className="max-h-96 overflow-hidden">
                        <img 
                          src={resultGif} 
                          alt="Face Swap Result" 
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    ) : targetGif ? (
                      // 显示上传的GIF
                      <div className="max-h-96 overflow-hidden">
                        <img 
                          src={targetGif} 
                          alt="Target GIF" 
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        {faceSwap?.pleaseUploadGif || "Please upload a GIF"}
                      </div>
                    )}
                    
                    {isLoadingGif && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm">
                        <div className="text-center p-6 rounded-lg bg-background/80 shadow-lg border border-border">
                          <div className="relative h-20 w-20 mx-auto mb-4">
                            <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-primary text-xl">✨</span>
                            </div>
                          </div>
                          
                          <p className="font-medium text-foreground mb-1">
                            {faceSwap?.gifSwapInProgress || "GIF face swap in progress..."}
                          </p>
                          
                          <p className="text-sm text-muted-foreground">
                            {faceSwap?.gifCompleteSoon || "This may take a while, please be patient"}
                          </p>
                          
                          <div className="mt-3 text-xs text-muted-foreground animate-pulse">
                            {faceSwap?.magicHappening || "Magic happening..."}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {errorGif && <p className="mt-2 text-sm text-red-500">{errorGif}</p>}
    </div>
  );
} 