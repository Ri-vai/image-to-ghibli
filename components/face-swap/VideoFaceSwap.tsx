"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, ArrowRight, Download, Sparkles, Play, Pause, Volume2, VolumeX } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useAppContext } from "@/contexts/app";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useCredits } from "@/lib/credits-context";

type VideoFaceSwapProps = {
  locale: string;
  faceSwap?: any;
  faceImage: string | null;
  handleFaceImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function VideoFaceSwap({ 
  locale, 
  faceSwap, 
  faceImage,
  handleFaceImageUpload
}: VideoFaceSwapProps) {
  const { data: session, status } = useSession();
  const { setShowSignModal } = useAppContext();
  const router = useRouter();
  const [targetVideo, setTargetVideo] = useState<string | null>(null);
  const [resultVideo, setResultVideo] = useState<string | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [errorVideo, setErrorVideo] = useState<string | null>(null);
  const { credits, refreshCredits } = useCredits();
  const [userCredits, setUserCredits] = useState<number>(0);
  const [showWatermarkDialog, setShowWatermarkDialog] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const resultVideoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);

  // 使用全局状态中的积分
  useEffect(() => {
    if (credits) {
      setUserCredits(credits.left_credits || 0);
    }
  }, [credits]);

  // 视频上传处理函数
  const handleTargetVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // 检查文件大小（限制为100MB）
      if (file.size > 100 * 1024 * 1024) {
        setErrorVideo("视频文件过大，请上传小于100MB的视频");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target) {
          setTargetVideo(event.target.result as string);
          // 重置结果状态
          setResultVideo(null);
          setErrorVideo(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 视频播放控制
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // 结果视频播放控制
  const toggleResultPlay = () => {
    if (resultVideoRef.current) {
      if (isPlaying) {
        resultVideoRef.current.pause();
      } else {
        resultVideoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // 静音控制
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
    if (resultVideoRef.current) {
      resultVideoRef.current.muted = !isMuted;
    }
  };

  // 视频换脸处理函数
  const handleSwapFaceVideo = async () => {
    if (!faceImage || !targetVideo) return;
    
    // 检查用户是否已登录，如果未登录，显示弹窗
    if (status !== "authenticated") {
      setShowSignModal(true);
      return;
    }
    
    // 检查用户积分是否足够（视频需要5积分）
    if (userCredits < 5) {
      setShowWatermarkDialog(true);
      return;
    }

    try {
      setIsLoadingVideo(true);
      setErrorVideo(null);
      setProgress(0);

      const response = await fetch("/api/video-face-swap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceImage: faceImage,
          targetVideo: targetVideo
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start video face swap process");
      }

      if (!data.success || !data.prediction || !data.prediction.id) {
        throw new Error(data.error || "Failed to start video face swap process");
      }

      const predictionId = data.prediction.id;
      let attempts = 0;
      const maxAttempts = 120; // 视频处理可能需要更长时间

      const checkStatus = async () => {
        if (attempts >= maxAttempts) {
          throw new Error("处理超时，请稍后再试");
        }

        const statusResponse = await fetch(
          `/api/video-face-swap/status`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ id: predictionId }),
          }
        );
        const statusData = await statusResponse.json();

        if (!statusResponse.ok) {
          throw new Error(
            statusData.error || "Failed to check video face swap status"
          );
        }

        // 更新进度
        setProgress(Math.min(95, Math.floor((attempts / maxAttempts) * 100)));

        if (statusData.success && statusData.output) {
          setResultVideo(statusData.output.video);
          setProgress(100);
        
          // 在成功处理后刷新积分
          await refreshCredits();
          
          return true;
        } else if (statusData.status === "failed") {
          throw new Error(statusData.error || "视频换脸处理失败");
        } else {
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 5000));
          return checkStatus();
        }
      };

      await checkStatus();
    } catch (error) {
      console.error("Error swapping face in video:", error);
      setErrorVideo(error instanceof Error ? error.message : "未知错误，请稍后再试");
    } finally {
      setIsLoadingVideo(false);
    }
  };

  // 下载视频结果函数
  const handleDownloadVideo = async () => {
    if (resultVideo) {
      try {
        // 获取视频数据
        const response = await fetch(resultVideo);
        const blob = await response.blob();

        // 创建一个临时URL
        const url = window.URL.createObjectURL(blob);

        // 创建一个临时链接并设置下载属性
        const link = document.createElement("a");
        link.href = url;
        link.download = `face-swap-video-${new Date().getTime()}.mp4`;
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
        console.error("下载视频时出错:", error);
      }
    }
  };

  return (
    <div className="border border-dashed border-border rounded-lg p-4 sm:p-8 bg-card/50 shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 在手机端显示在上方的预览区域 */}
        <div className="lg:hidden w-full mb-6">
          {/* 当没有上传内容时显示示例 */}
          {!faceImage && !targetVideo ? (
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
                {/* 显示目标视频预览或结果 */}
                <div className="bg-muted rounded-lg overflow-hidden shadow-md">
                  <div className="flex justify-between items-center p-2 bg-background/50 border-b border-border">
                    <div className="text-sm font-medium">
                      {resultVideo ? faceSwap?.swapResult || "Swap Result" : faceSwap?.videoPreview || "Video Preview"}
                    </div>
                    {resultVideo && (
                      <Button
                        size="sm"
                        onClick={handleDownloadVideo}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        <Download className="mr-2 h-4 w-4" />{" "}
                        {faceSwap?.download || "Download"}
                      </Button>
                    )}
                  </div>
                  
                  <div className="relative aspect-[16/9] bg-background/30 flex items-center justify-center">
                    {resultVideo ? (
                      // 显示结果视频
                      <div className="w-full h-full relative">
                        <video 
                          ref={resultVideoRef}
                          src={resultVideo} 
                          className="w-full h-full object-contain"
                          controls
                          onPlay={() => setIsPlaying(true)}
                          onPause={() => setIsPlaying(false)}
                        />
                      </div>
                    ) : targetVideo ? (
                      // 显示上传的视频
                      <div className="w-full h-full relative">
                        <video 
                          ref={videoRef}
                          src={targetVideo} 
                          className="w-full h-full object-contain"
                          controls
                          onPlay={() => setIsPlaying(true)}
                          onPause={() => setIsPlaying(false)}
                        />
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        {faceSwap?.pleaseUploadVideo || "Please upload a video"}
                      </div>
                    )}
                    
                    {isLoadingVideo && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm">
                        <div className="text-center p-6 rounded-lg bg-background/80 shadow-lg border border-border">
                          <div className="relative h-20 w-20 mx-auto mb-4">
                            <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-primary text-xl">✨</span>
                            </div>
                          </div>
                          
                          <p className="font-medium text-foreground mb-1">
                            {faceSwap?.videoSwapInProgress || "Video face swap in progress..."}
                          </p>
                          
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                            <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            {faceSwap?.videoCompleteSoon || "This may take a while, please be patient"}
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

        {/* 左侧上传区域 */}
        <div className="flex flex-col justify-between h-full">
          {/* 步骤1：上传视频 */}
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mr-4">
                1
              </div>
              <p className="text-xl font-medium text-foreground">
                {faceSwap?.uploadVideo || "Upload Video"}
              </p>
            </div>

            <div className="relative">
              <label
                htmlFor="target-video"
                className={cn(
                  "flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer",
                  targetVideo
                    ? "border-primary bg-primary/10"
                    : "border-muted hover:border-primary hover:bg-primary/5"
                )}
              >
                {targetVideo ? (
                  <div className="relative w-12 h-12 overflow-hidden rounded-full border-2 border-primary">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      {faceSwap?.uploadVideo || "Upload Video"}
                    </p>
                  </div>
                )}
                <input
                  id="target-video"
                  type="file"
                  className="hidden"
                  accept="video/mp4,video/mov,video/quicktime,video/x-msvideo"
                  onChange={handleTargetVideoUpload}
                />
              </label>
              <p className="mt-2 text-xs text-muted-foreground">
                {faceSwap?.videoFormat || "M4V, MP4, MOV videos"}
              </p>
              <p className="text-xs text-muted-foreground">
              {faceSwap?.videoSizeLimit || "Subscribers: 1024MB / 300s / 4K"}
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
                htmlFor="face-image-video"
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
                  id="face-image-video"
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
                {faceSwap?.startVideoFaceSwap || "Start Video Face Swap"}
              </p>
            </div>

            <Button
              onClick={handleSwapFaceVideo}
              disabled={!faceImage || !targetVideo || isLoadingVideo}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6"
            >
                <>
                  {faceSwap?.swapVideoFace || "Swap Video Face"}{" "}
                  (5 credits) <ArrowRight className="ml-2 h-4 w-4" />
                </>
            </Button>
          </div>
        </div>

        {/* 中间和右侧预览区域 - 在大屏幕上显示，小屏幕上隐藏 */}
        <div className="col-span-2 hidden lg:flex items-center">
          {/* 当没有上传内容时显示示例 */}
          {!faceImage && !targetVideo ? (
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
                {/* 显示目标视频预览或结果 */}
                <div className="bg-muted rounded-lg overflow-hidden shadow-md">
                  <div className="flex justify-between items-center p-2 bg-background/50 border-b border-border">
                    <div className="text-sm font-medium">
                      {resultVideo ? faceSwap?.swapResult || "Swap Result" : faceSwap?.videoPreview || "Video Preview"}
                    </div>
                    {resultVideo && (
                      <Button
                        size="sm"
                        onClick={handleDownloadVideo}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        <Download className="mr-2 h-4 w-4" />{" "}
                        {faceSwap?.download || "Download"}
                      </Button>
                    )}
                  </div>
                  
                  <div className="relative aspect-[16/9] bg-background/30 flex items-center justify-center">
                    {resultVideo ? (
                      // 显示结果视频
                      <div className="w-full h-full relative">
                        <video 
                          ref={resultVideoRef}
                          src={resultVideo} 
                          className="w-full h-full object-contain"
                          controls
                          onPlay={() => setIsPlaying(true)}
                          onPause={() => setIsPlaying(false)}
                        />
                      </div>
                    ) : targetVideo ? (
                      // 显示上传的视频
                      <div className="w-full h-full relative">
                        <video 
                          ref={videoRef}
                          src={targetVideo} 
                          className="w-full h-full object-contain"
                          controls
                          onPlay={() => setIsPlaying(true)}
                          onPause={() => setIsPlaying(false)}
                        />
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        {faceSwap?.pleaseUploadVideo || "Please upload a video"}
                      </div>
                    )}
                    
                    {isLoadingVideo && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm">
                        <div className="text-center p-6 rounded-lg bg-background/80 shadow-lg border border-border">
                          <div className="relative h-20 w-20 mx-auto mb-4">
                            <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-primary text-xl">✨</span>
                            </div>
                          </div>
                          
                          <p className="font-medium text-foreground mb-1">
                            {faceSwap?.videoSwapInProgress || "Video face swap in progress..."}
                          </p>
                          
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                            <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            {faceSwap?.videoCompleteSoon || "This may take a while, please be patient"}
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
      {errorVideo && <p className="mt-2 text-sm text-red-500">{errorVideo}</p>}
      {showWatermarkDialog && (
        <Dialog open={showWatermarkDialog} onOpenChange={setShowWatermarkDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Sparkles className="h-5 w-5 mr-2 text-amber-500" />
                {faceSwap?.upgradePremium || "Unlock Premium Features"}
              </DialogTitle>
              <DialogDescription>
                {faceSwap?.watermarkDescription || 
                  "Subscribe today to enjoy all premium features of our platform."}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
                <h3 className="font-medium text-amber-800 mb-2">
                  {faceSwap?.premiumBenefits || "With subscription you get:"}
                </h3>
                <ul className="text-amber-700 text-sm space-y-2">
                  <li className="flex items-start">
                    <svg className="h-5 w-5 mr-2 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {faceSwap?.benefit1 || "Ad-free experience"}
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 mr-2 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {faceSwap?.benefit2 || "Watermark-free photos"}
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 mr-2 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {faceSwap?.benefit3 || "GIF face swap capability"}
                  </li> 
                  <li className="flex items-start">
                    <svg className="h-5 w-5 mr-2 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {faceSwap?.benefit4 || "Video face swap capability"}
                  </li>
                </ul>
              </div>
            </div>
            
            <DialogFooter className="sm:justify-end">
              <Button 
                onClick={() => {
                  setShowWatermarkDialog(false);
                  // 导航至订阅页面
                  router.push(`/${locale}#pricing`);
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {faceSwap?.subscribeNow || "Subscribe Now"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
