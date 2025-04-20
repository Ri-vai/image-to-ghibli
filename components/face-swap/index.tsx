"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  Image as ImageIcon,
  Video,
  Users,
  ArrowRight,
  Download,
  SplitSquareVertical,
  FileType,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  ReactCompareSlider,
  ReactCompareSliderImage,
  ReactCompareSliderHandle,
} from "react-compare-slider";
import { TurnstileDialog } from "@/components/ui/turnstile-dialog";

type FaceSwapProps = {
  locale: string;
  faceSwap?: any; // 这里可以定义更具体的类型
};

export default function FaceSwap({ locale, faceSwap }: FaceSwapProps) {
  const [activeTab, setActiveTab] = useState("photo");
  const [bodyImage, setBodyImage] = useState<string | null>(null); // 第一张上传的照片 (target_image)
  const [faceImage, setFaceImage] = useState<string | null>(null); // 第二张上传的照片 (source_image)
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompareSlider, setShowCompareSlider] = useState(false);
  const [showTurnstile, setShowTurnstile] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [hasWatermark, setHasWatermark] = useState(false);
  const [userCredits, setUserCredits] = useState<number>(0);

  // 为GIF功能添加新的状态变量
  const [targetGif, setTargetGif] = useState<string | null>(null);
  const [resultGif, setResultGif] = useState<string | null>(null);
  const [isLoadingGif, setIsLoadingGif] = useState(false);
  const [errorGif, setErrorGif] = useState<string | null>(null);

  // 获取用户积分
  useEffect(() => {
    async function fetchUserCredits() {
      try {
        const response = await fetch('/api/user/credits');
        if (response.ok) {
          const data = await response.json();
          console.log("🚀 ~ fetchUserCredits ~ data:", data)
          setUserCredits(data.credits?.left_credits || 0);
        }
      } catch (error) {
        console.error('获取用户积分失败:', error);
      }
    }
    
    fetchUserCredits();
  }, []);

  const handleBodyImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target) {
          setBodyImage(event.target.result as string);
          // 重置结果和对比滑块状态
          setResultImage(null);
          setShowCompareSlider(false);
          setError(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target) {
          setFaceImage(event.target.result as string);
          // 重置结果和对比滑块状态
          setResultImage(null);
          setShowCompareSlider(false);
          setError(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSwapFace = async () => {
    if (!faceImage || !bodyImage) return;

    // 开发环境中直接使用模拟token
    if (process.env.NODE_ENV === "development") {
      await handleTurnstileVerify("development_mock_token");
      return;
    }

    // 生产环境中正常显示Turnstile对话框
    setShowTurnstile(true);
  };

  const handleTurnstileVerify = async (token: string) => {
    setTurnstileToken(token);
    setShowTurnstile(false);

    try {
      setIsLoading(true);
      setError(null);

      // 检查用户积分，决定是否需要水印
      const needsWatermark = userCredits <= 0; // 修正判断条件：积分不足时添加水印
      console.log("🚀 ~ handleTurnstileVerify ~ needsWatermark:", needsWatermark, "userCredits:", userCredits);
      setHasWatermark(needsWatermark);

      const response = await fetch("/api/photo-face-swap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceImage: faceImage,
          targetImage: bodyImage,
          turnstileToken: token,
          needsWatermark, // 传递水印标志到API
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start face swap process");
      }

      if (!data.success || !data.prediction || !data.prediction.id) {
        throw new Error(data.error || "Failed to start face swap process");
      }

      const predictionId = data.prediction.id;
      let attempts = 0;
      const maxAttempts = 30;

      const checkStatus = async () => {
        if (attempts >= maxAttempts) {
          throw new Error("处理超时，请稍后再试");
        }

        const statusResponse = await fetch(
          `/api/photo-face-swap/status?id=${predictionId}&watermark=${needsWatermark}`
        );
        const statusData = await statusResponse.json();

        if (!statusResponse.ok) {
          throw new Error(
            statusData.error || "Failed to check face swap status"
          );
        }

        if (statusData.success && statusData.output) {
          setResultImage(statusData.output.image);
          return true;
        } else if (statusData.status === "failed") {
          throw new Error(statusData.error || "换脸处理失败");
        } else {
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 2000));
          return checkStatus();
        }
      };

      await checkStatus();
      setShowCompareSlider(true);
    } catch (error) {
      console.error("Error swapping face:", error);
      setError(error instanceof Error ? error.message : "未知错误，请稍后再试");
    } finally {
      setIsLoading(false);
    }
  };

  // 新增GIF上传处理函数
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

    // 开发环境中直接使用模拟token
    if (process.env.NODE_ENV === "development") {
      await handleTurnstileVerifyGif("development_mock_token");
      return;
    }

    // 生产环境中正常显示Turnstile对话框
    setShowTurnstile(true);
  };

  // 处理GIF换脸的Turnstile验证回调
  const handleTurnstileVerifyGif = async (token: string) => {
    setTurnstileToken(token);
    setShowTurnstile(false);

    try {
      setIsLoadingGif(true);
      setErrorGif(null);

      // 检查用户积分，决定是否需要水印
      const needsWatermark = userCredits <= 0;
      console.log("🚀 ~ handleTurnstileVerifyGif ~ needsWatermark:", needsWatermark, "userCredits:", userCredits);
      setHasWatermark(needsWatermark);

      const response = await fetch("/api/gif-face-swap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceImage: faceImage,
          targetGif: targetGif,
          turnstileToken: token,
          needsWatermark, // 传递水印标志到API
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
          `/api/gif-face-swap/status?id=${predictionId}&watermark=${needsWatermark}`
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
          await new Promise((resolve) => setTimeout(resolve, 2000));
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

  // 修改下载函数
  const handleDownload = async () => {
    if (resultImage) {
      try {
        // 获取图片数据
        const response = await fetch(resultImage);
        const blob = await response.blob();

        // 创建一个临时URL
        const url = window.URL.createObjectURL(blob);

        // 创建一个临时链接并设置下载属性
        const link = document.createElement("a");
        link.href = url;
        link.download = `face-swap-${new Date().getTime()}.jpg`;
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
        console.error("下载图片时出错:", error);
      }
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
    <section className="w-full py-12 bg-background">
      <TurnstileDialog
        open={showTurnstile}
        onClose={() => setShowTurnstile(false)}
        onVerify={activeTab === "gif" ? handleTurnstileVerifyGif : handleTurnstileVerify}
      />
      <div className="container mx-auto px-4">
        <Tabs
          defaultValue="photo"
          className="w-full"
          onValueChange={setActiveTab}
        >
          <div className="flex justify-center mb-8">
            <TabsList className="bg-muted/50 border border-primary/20">
              <TabsTrigger
                value="photo"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                {faceSwap?.photoFaceSwap || "Photo Face Swap"}
              </TabsTrigger>
              <TabsTrigger
                value="gif"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <FileType className="mr-2 h-4 w-4" />
                {faceSwap?.gifFaceSwap || "GIF Face Swap"}
              </TabsTrigger>
              {/* 暂时隐藏视频和多人换脸选项卡
              <TabsTrigger value="video" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Video className="mr-2 h-4 w-4" />
                {faceSwap?.videoFaceSwap || "Video Face Swap"}
              </TabsTrigger>
              <TabsTrigger value="multiple" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Users className="mr-2 h-4 w-4" />
                {faceSwap?.multipleFaceSwap || "Multiple Face Swap"}
              </TabsTrigger>
              */}
            </TabsList>
          </div>

          <TabsContent value="photo" className="mt-0">
            <div className="border border-dashed border-border rounded-lg p-8 bg-card/50 shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 左侧上传区域 - 调整为flex布局，使三个步骤均匀分布 */}
                <div className="flex flex-col justify-between h-full">
                  {/* 步骤1：上传原始图片 */}
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mr-4">
                        1
                      </div>
                      <p className="text-xl font-medium text-foreground">
                        {faceSwap?.uploadOriginalImage ||
                          "Upload Original Image"}
                      </p>
                    </div>

                    <div className="relative">
                      <label
                        htmlFor="body-image"
                        className={cn(
                          "flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer",
                          bodyImage
                            ? "border-primary bg-primary/10"
                            : "border-muted hover:border-primary hover:bg-primary/5"
                        )}
                      >
                        {bodyImage ? (
                          <div className="relative w-12 h-12 overflow-hidden rounded-full border-2 border-primary">
                            <Image
                              src={bodyImage}
                              alt="Target"
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
                          id="body-image"
                          type="file"
                          className="hidden"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          onChange={handleBodyImageUpload}
                        />
                      </label>
                      <p className="mt-2 text-xs text-muted-foreground">
                        PNG/JPG/JPEG/WEBP
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
                        {faceSwap?.uploadFaceImage || "Upload Face Photo"}
                      </p>
                    </div>

                    <div className="relative">
                      <label
                        htmlFor="face-image"
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
                          id="face-image"
                          type="file"
                          className="hidden"
                          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                          onChange={handleFaceImageUpload}
                        />
                      </label>
                      <p className="mt-2 text-xs text-muted-foreground">
                        PNG/JPG/JPEG/WEBP/GIF
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
                        {faceSwap?.startFaceSwap || "Start Face Swap"}
                      </p>
                    </div>

                    <Button
                      onClick={handleSwapFace}
                      disabled={!faceImage || !bodyImage || isLoading}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6"
                    >
                      {isLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div className="text-muted-foreground text-center">
                            {/* 有趣的加载动画 */}
                            <div className="relative h-20 w-20 mx-auto mb-4">
                              <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-primary text-xl">✨</span>
                              </div>
                            </div>

                            <p className="font-medium text-foreground mb-1">
                              {faceSwap?.swapInProgress ||
                                "Face swap in progress..."}
                            </p>

                            <p className="text-sm text-muted-foreground">
                              {faceSwap?.completeSoon ||
                                "Will complete in a few seconds"}
                            </p>

                            <div className="mt-3 text-xs text-muted-foreground animate-pulse">
                              {faceSwap?.magicHappening || "Magic happening..."}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {faceSwap?.swapFace || "Swap Face"}{" "}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* 中间和右侧预览区域 - 调整为flex布局，使内容垂直居中 */}
                <div className="col-span-2 flex items-center">
                  {/* 当没有上传图片时显示示例对比图 */}
                  {!faceImage && !bodyImage ? (
                    <div className="relative aspect-[16/9] md:aspect-[16/10] bg-muted rounded-lg overflow-hidden w-full shadow-md group">
                      <div className="absolute top-2 left-2 bg-background/70 text-foreground text-xs px-2 py-1 rounded">
                        {faceSwap?.before || "Before"}
                      </div>
                      <div className="absolute top-2 right-2 bg-background/70 text-foreground text-xs px-2 py-1 rounded">
                        {faceSwap?.after || "After"}
                      </div>
                      <Image
                        src="/imgs/face-swap/show.png"
                        alt="Face Swap Example"
                        fill
                        className="object-cover transition-transform duration-500 will-change-transform group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    // 当上传了图片后显示分开的预览区域
                    <div className="grid grid-cols-1 gap-4 w-full">
                      {/* 如果有结果图片且启用了对比滑块，显示滑动对比效果 */}
                      {resultImage && showCompareSlider ? (
                        <div className="relative aspect-[16/9] w-full bg-muted rounded-lg overflow-hidden shadow-md">
                          <ReactCompareSlider
                            itemOne={
                              <ReactCompareSliderImage
                                src={bodyImage!}
                                alt="Before"
                                style={{
                                  objectFit: "contain",
                                  width: "100%",
                                  height: "100%",
                                  backgroundColor: "#f8f9fa",
                                }}
                              />
                            }
                            itemTwo={
                              <ReactCompareSliderImage
                                src={resultImage}
                                alt="After"
                                style={{
                                  objectFit: "contain",
                                  width: "100%",
                                  height: "100%",
                                  backgroundColor: "#f8f9fa",
                                }}
                              />
                            }
                            handle={
                              <ReactCompareSliderHandle
                                buttonStyle={{
                                  backdropFilter: "none",
                                  border: "none",
                                  boxShadow: "0 0 0 2px rgba(0, 0, 0, 0.3)",
                                  color: "#fff",
                                  backgroundColor: "rgba(0, 0, 0, 0.7)",
                                }}
                                linesStyle={{
                                  width: 2,
                                  color: "rgba(0, 0, 0, 0.5)",
                                }}
                              />
                            }
                            style={{
                              height: "100%",
                              width: "100%",
                              borderRadius: "0.5rem",
                            }}
                            className="rounded-lg"
                          />
                          <div className="absolute top-2 left-2 bg-background/70 text-foreground text-xs px-2 py-1 rounded">
                            {faceSwap?.before || "Before"}
                          </div>
                          <div className="absolute top-2 right-2 bg-background/70 text-foreground text-xs px-2 py-1 rounded">
                            {faceSwap?.after || "After"}
                          </div>
                        </div>
                      ) : (
                        // 否则显示原来的分开预览
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
                          <div className="relative aspect-square bg-muted rounded-lg overflow-hidden shadow-md group">
                            <div className="absolute top-2 left-2 bg-background/70 text-foreground text-xs px-2 py-1 rounded">
                              {faceSwap?.before || "Before"}
                            </div>
                            {bodyImage && (
                              <Image
                                src={bodyImage}
                                alt="Before"
                                fill
                                className="object-cover transition-transform duration-500 will-change-transform group-hover:scale-105"
                              />
                            )}
                          </div>

                          <div className="relative aspect-square bg-muted rounded-lg overflow-hidden shadow-md group">
                            <div className="absolute top-2 left-2 bg-background/70 text-foreground text-xs px-2 py-1 rounded">
                              {faceSwap?.after || "After"}
                            </div>
                            {resultImage ? (
                              <Image
                                src={resultImage}
                                alt="After"
                                fill
                                className="object-cover transition-transform duration-500 will-change-transform group-hover:scale-105"
                              />
                            ) : isLoading ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
                                <div className="text-center p-6 rounded-lg bg-background/80 shadow-lg border border-border">
                                  {/* 有趣的加载动画 */}
                                  <div className="relative h-20 w-20 mx-auto mb-4">
                                    <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className="text-primary text-xl">
                                        ✨
                                      </span>
                                    </div>
                                  </div>

                                  <p className="font-medium text-foreground mb-1">
                                    {faceSwap?.swapInProgress ||
                                      "Face swap in progress..."}
                                  </p>

                                  <p className="text-sm text-muted-foreground">
                                    {faceSwap?.completeSoon ||
                                      "Will complete in a few seconds"}
                                  </p>

                                  <div className="mt-3 text-xs text-muted-foreground animate-pulse">
                                    {faceSwap?.magicHappening ||
                                      "Magic happening..."}
                                  </div>
                                </div>
                              </div>
                            ) : faceImage && bodyImage ? (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-muted-foreground text-center">
                                  <p>
                                    {faceSwap?.readyToSwap || "Ready to Swap"}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-muted-foreground text-center">
                                  <p>
                                    {faceSwap?.uploadBothImages ||
                                      "Upload Both Images"}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {resultImage && (
                        <div className="flex justify-center space-x-4 mt-4">
                          <Button
                            variant="outline"
                            className="border-border"
                            onClick={() =>
                              setShowCompareSlider(!showCompareSlider)
                            }
                          >
                            <SplitSquareVertical className="mr-2 h-4 w-4" />
                            {showCompareSlider
                              ? faceSwap?.splitView
                              : faceSwap?.compareView}
                          </Button>
                          <Button
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={handleDownload}
                          >
                            <Download className="mr-2 h-4 w-4" />{" "}
                            {faceSwap?.download || "Download"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 新增GIF换脸内容 */}
          <TabsContent value="gif" className="mt-0">
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
                        {faceSwap?.uploadGif || "上传GIF动图"}
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
                              {faceSwap?.uploadGif || "上传GIF动图"}
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
                        GIF格式
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
                        {faceSwap?.uploadFaceImage || "上传人脸照片"}
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
                              {faceSwap?.uploadImage || "上传照片"}
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
                        {faceSwap?.startGifFaceSwap || "开始GIF换脸"}
                      </p>
                    </div>

                    <Button
                      onClick={handleSwapFaceGif}
                      disabled={!faceImage || !targetGif || isLoadingGif}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6"
                    >
                      {isLoadingGif ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div className="text-muted-foreground text-center">
                            {/* 加载动画 */}
                            <div className="relative h-20 w-20 mx-auto mb-4">
                              <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-primary text-xl">✨</span>
                              </div>
                            </div>

                            <p className="font-medium text-foreground mb-1">
                              {faceSwap?.gifSwapInProgress || "GIF换脸处理中..."}
                            </p>

                            <p className="text-sm text-muted-foreground">
                              {faceSwap?.gifCompleteSoon || "需要较长时间，请耐心等待"}
                            </p>

                            <div className="mt-3 text-xs text-muted-foreground animate-pulse">
                              {faceSwap?.magicHappening || "魔法正在发生..."}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {faceSwap?.swapGifFace || "GIF换脸"}{" "}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* 中间和右侧预览区域 */}
                <div className="col-span-2 flex items-center">
                  {/* 当没有上传内容时显示示例 */}
                  {!faceImage && !targetGif ? (
                    <div className="relative aspect-[16/9] md:aspect-[16/10] bg-muted rounded-lg overflow-hidden w-full shadow-md group">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center p-6">
                          <FileType className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">
                            {faceSwap?.gifExampleText || "上传GIF和照片进行换脸"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // 显示预览和结果
                    <div className="grid grid-cols-1 gap-4 w-full">
                      <div className="grid grid-cols-1 gap-4 w-full">
                        {/* 显示目标GIF预览 */}
                        <div className="bg-muted rounded-lg overflow-hidden shadow-md">
                          <div className="flex justify-between items-center p-2 bg-background/50 border-b border-border">
                            <div className="text-sm font-medium">
                              {resultGif ? "换脸结果" : "GIF预览"}
                            </div>
                            {resultGif && (
                              <Button
                                size="sm"
                                onClick={handleDownloadGif}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                              >
                                <Download className="mr-2 h-4 w-4" />{" "}
                                {faceSwap?.download || "下载"}
                              </Button>
                            )}
                          </div>
                          
                          <div className="relative aspect-video bg-background/30 p-4 flex items-center justify-center">
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
                                {faceSwap?.pleaseUploadGif || "请上传GIF动图"}
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
                                    {faceSwap?.gifSwapInProgress || "GIF换脸处理中..."}
                                  </p>
                                  
                                  <p className="text-sm text-muted-foreground">
                                    {faceSwap?.gifCompleteSoon || "需要较长时间，请耐心等待"}
                                  </p>
                                  
                                  <div className="mt-3 text-xs text-muted-foreground animate-pulse">
                                    {faceSwap?.magicHappening || "魔法正在发生..."}
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
            </div>
            {errorGif && <p className="mt-2 text-sm text-red-500">{errorGif}</p>}
          </TabsContent>

          {/* 保留但不显示其他选项卡内容 */}
          <TabsContent value="video" className="mt-0 hidden">
            <div className="flex justify-center items-center h-64 border border-dashed border-border rounded-lg bg-card/50">
              <p className="text-muted-foreground">
                {faceSwap?.comingSoon || "Coming Soon"}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="multiple" className="mt-0 hidden">
            <div className="flex justify-center items-center h-64 border border-dashed border-border rounded-lg bg-card/50">
              <p className="text-muted-foreground">
                {faceSwap?.comingSoon || "Coming Soon"}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      {/* 在结果图片附近添加水印提示 */}
      {resultImage && hasWatermark && (
        <div className="text-center mt-2">
          <p className="text-amber-500 text-sm flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {faceSwap?.watermarkNotice || "积分不足，图片上已添加水印"}
          </p>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </section>
  );
}
