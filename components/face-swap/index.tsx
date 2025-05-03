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
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import GifFaceSwap from "./GifFaceSwap";
import { useSession } from "next-auth/react";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { addDelayForRuPath } from "@/lib/path-delay";
import { useCredits } from "@/lib/credits-context";

type FaceSwapProps = {
  locale: string;
  faceSwap?: any; // 这里可以定义更具体的类型
  defaultTab?: string; // 添加默认tab属性
};

export default function FaceSwap({ locale, faceSwap, defaultTab = "photo" }: FaceSwapProps) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const { credits, refreshCredits } = useCredits();
  
  // 根据当前路径判断应该激活哪个tab
  const determineActiveTab = () => {
    if (pathname.includes('/gif-face-swap')) {
      return "gif";
    }
    return defaultTab;
  };
  
  const [activeTab, setActiveTab] = useState(determineActiveTab());
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
  const [watermarkedImage, setWatermarkedImage] = useState<string | null>(null);
  const [showWatermarkDialog, setShowWatermarkDialog] = useState(false);
  const [hasShownWatermarkDialog, setHasShownWatermarkDialog] = useState(false);
  const [isProcessingRequest, setIsProcessingRequest] = useState(false);

  // 使用全局状态中的积分
  useEffect(() => {
    if (credits) {
      setUserCredits(credits.left_credits || 0);
    }
  }, [credits]);

  // 同步组件状态和路由
  useEffect(() => {
    setActiveTab(determineActiveTab());
  }, [pathname]);

  // 处理选项卡切换
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // 根据选择的选项卡更新路由，但不重新加载页面
    if (value === "gif") {
      const baseUrl = pathname.includes('/[locale]') 
        ? `/${locale}/gif-face-swap` 
        : `/${locale === 'en' ? '' : locale + '/'}gif-face-swap`;
      router.push(baseUrl, { scroll: false });
    } else if (value === "video") {
      const baseUrl = pathname.includes('/[locale]') 
        ? `/${locale}/video-face-swap` 
        : `/${locale === 'en' ? '' : locale + '/'}video-face-swap`;
      router.push(baseUrl, { scroll: false });
    } else {
      const baseUrl = pathname.includes('/[locale]') 
        ? `/${locale}` 
        : `/${locale === 'en' ? '' : locale + '/'}`;
      router.push(baseUrl, { scroll: false });
    }
  };

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
    if (!faceImage || !bodyImage || isProcessingRequest) return;
    
    setIsProcessingRequest(true);
    
    try {
      // 开发环境中直接使用模拟token
      if (process.env.NODE_ENV === "development") {
        await handleTurnstileVerify("development_mock_token");
        return;
      }
      
      // 生产环境中正常显示Turnstile对话框
      setShowTurnstile(true);
    } catch (error) {
      console.error("处理换脸请求时出错:", error);
      setError(error instanceof Error ? error.message : "未知错误，请稍后再试");
    } finally {
      setIsProcessingRequest(false);
    }
  };

  const handleTurnstileVerify = async (token: string) => {
    setTurnstileToken(token);
    setShowTurnstile(false);
    
    try {
      setIsLoading(true);
      setError(null);
      
      // 为俄语路径用户添加隐藏延迟，在加载状态中进行
      await addDelayForRuPath(locale);
      
      const response = await fetch("/api/photo-face-swap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceImage: faceImage,
          targetImage: bodyImage,
          turnstileToken: token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start face swap process");
      }

      if (!data.success || !data.prediction || !data.prediction.id) {
        throw new Error(data.error || "Failed to start face swap process");
      }

      setHasWatermark(data.prediction.needsWatermark);
      
      const predictionId = data.prediction.id;
      let attempts = 0;
      const maxAttempts = 30;

      const needsFrontendWatermark = () => {
        // 用户未登录或积分不足
        console.log("水印检查 - 会话状态:", session.status, "用户积分:", userCredits);
        const needWatermark = session.status !== "authenticated" || userCredits <= 0;
        console.log("需要前端水印:", needWatermark);
        return needWatermark;
      };

      const addWatermark = (imageUrl: string): Promise<string> => {
        console.log("开始添加水印到图片:", imageUrl.substring(0, 50) + "...");
        return new Promise((resolve, reject) => {
          // 使用window.Image确保使用的是浏览器的原生Image构造函数
          const img = new window.Image();
          img.crossOrigin = "anonymous";
          console.log("设置图片crossOrigin为anonymous");
          
          img.onload = () => {
            console.log("图片加载成功，尺寸:", img.width, "x", img.height);
            // 创建canvas元素
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            
            // 设置canvas尺寸与图片相同
            canvas.width = img.width;
            canvas.height = img.height;
            console.log("Canvas尺寸设置为:", canvas.width, "x", canvas.height);
            
            // 绘制原图
            ctx?.drawImage(img, 0, 0);
            console.log("原图已绘制到Canvas");
            
            // 设置水印样式
            if (ctx) {
              ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
              const fontSize = Math.max(20, img.width / 15);
              ctx.font = `${fontSize}px Arial`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              console.log("水印样式已设置, 字体大小:", fontSize);
              
              // 计算水印位置（中心）
              const watermarkText = "aifaceswap.app";
              const x = img.width / 2;
              const y = img.height / 2;
              console.log("水印位置:", x, y, "文字:", watermarkText);
              
              // 绘制水印
              ctx.fillText(watermarkText, x, y);
              console.log("水印已绘制完成");
              
              // 转换为URL
              const watermarkedUrl = canvas.toDataURL("image/jpeg");
              console.log("转换完成，输出URL长度:", watermarkedUrl.length);
              resolve(watermarkedUrl);
            } else {
              console.error("无法创建Canvas上下文");
              reject(new Error("无法创建Canvas上下文"));
            }
          };
          
          img.onerror = (err) => {
            console.error("图片加载失败:", err);
            reject(new Error("加载图片失败"));
          };
          img.src = imageUrl;
          console.log("已设置图片源");
        });
      };

      const checkStatus = async () => {
        if (attempts >= maxAttempts) {
          throw new Error("处理超时，请稍后再试");
        }

        // 使用POST方法替代GET方法
        const statusResponse = await fetch(
          `/api/photo-face-swap/status`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ 
              id: predictionId,
              watermark: data.prediction.needsWatermark 
            }),
          }
        );
        const statusData = await statusResponse.json();

        if (!statusResponse.ok) {
          throw new Error(
            statusData.error || "Failed to check face swap status"
          );
        }

        if (statusData.success && statusData.output) {
          const originalImageUrl = statusData.output.image;
          console.log("获取到原始结果图片URL:", originalImageUrl.substring(0, 50) + "...");
          
          // 如果需要前端添加水印
          if (needsFrontendWatermark()) {
            console.log("需要添加前端水印，开始处理...");
            try {
              const watermarkedUrl = await addWatermark(originalImageUrl);
              console.log("水印添加成功，设置结果图片");
              setWatermarkedImage(watermarkedUrl);
              setResultImage(watermarkedUrl); // 使用带水印的图片
              setHasWatermark(true); // 设置水印状态为true
            } catch (error) {
              console.error("添加水印失败，详细错误:", error);
              console.log("使用原始图片作为结果");
              setResultImage(originalImageUrl); // 如果添加水印失败，使用原图
            }
          } else {
            console.log("不需要添加前端水印，直接使用原始图片");
            setResultImage(originalImageUrl);
          }
          
          // 如果有水印，第一次自动显示弹窗
          if (statusData.hasWatermark !== undefined) {
            setHasWatermark(statusData.hasWatermark);
            // 仅在首次发现水印时自动打开弹窗
            if (statusData.hasWatermark && !hasShownWatermarkDialog) {
              setShowWatermarkDialog(true);
              setHasShownWatermarkDialog(true); // 标记已显示过
            }
          }
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

      // 在成功处理后刷新积分
      if (!needsFrontendWatermark()) {
        await refreshCredits();
      }
    } catch (error) {
      console.error("Error swapping face:", error);
      setError(error instanceof Error ? error.message : "未知错误，请稍后再试");
    } finally {
      setIsLoading(false);
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

  return (
    <section className="w-full py-12 bg-background">
      <TurnstileDialog
        open={showTurnstile}
        onClose={() => setShowTurnstile(false)}
        onVerify={handleTurnstileVerify}
      />
      <div className="container mx-auto px-4">
        <Tabs
          defaultValue={activeTab}
          value={activeTab}
          className="w-full"
          onValueChange={handleTabChange}
        >
          <div className="flex justify-start sm:justify-center mb-8 overflow-x-auto pb-2 -mx-4 px-4">
            <TabsList className="bg-muted/50 border border-primary/20 flex-nowrap min-w-max mx-auto sm:mx-0">
              <TabsTrigger
                value="photo"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                <span className="whitespace-nowrap">{faceSwap?.photoFaceSwap || "Photo Face Swap"}</span>
              </TabsTrigger>
              <TabsTrigger
                value="gif"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <FileType className="mr-2 h-4 w-4" />
                <span className="whitespace-nowrap">{faceSwap?.gifFaceSwap || "GIF Face Swap"}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="video" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Video className="mr-2 h-4 w-4" />
                <span className="whitespace-nowrap">{faceSwap?.videoFaceSwap || "Video Face Swap"}</span>
              </TabsTrigger>
              {/* 暂时隐藏多人换脸选项卡
              <TabsTrigger value="multiple" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Users className="mr-2 h-4 w-4" />
                <span className="whitespace-nowrap">{faceSwap?.multipleFaceSwap || "Multiple Face Swap"}</span>
              </TabsTrigger>
              */}
            </TabsList>
          </div>

          <TabsContent value="photo" className="mt-0">
            <div className="border border-dashed border-border rounded-lg p-4 sm:p-8 bg-card/50 shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 在手机端显示在上方的预览区域 */}
                <div className="lg:hidden w-full mb-6">
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
                        <div className="grid grid-cols-2 gap-4 w-full">
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

                                  {/* <p className="font-medium text-foreground mb-1">
                                    {faceSwap?.swapInProgress ||
                                      "Face swap in progress..."}
                                  </p> */}

                                  {/* <p className="text-sm text-muted-foreground">
                                    {faceSwap?.completeSoon ||
                                      "Will complete in a few seconds"}
                                  </p> */}
                                  {/* 
                                  <div className="mt-3 text-xs text-muted-foreground animate-pulse">
                                    {faceSwap?.magicHappening ||
                                      "Magic happening..."}
                                  </div> */}
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

                      {resultImage && hasWatermark && (
                        <div className="text-center">
                          <Button 
                            variant="link" 
                            className="text-xs text-amber-500"
                            onClick={() => router.push(`/${locale}#pricing`)}
                          >
                            {faceSwap?.wantRemoveWatermark || "Want to remove watermark?"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

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
                        {faceSwap?.startFaceSwap || "Start Face Swap"}
                      </p>
                    </div>

                    <Button
                      onClick={handleSwapFace}
                      disabled={!faceImage || !bodyImage || isLoading}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6"
                    >
                      {faceSwap?.swapFace || "Swap Face"}{" "}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* 中间和右侧预览区域 - 在大屏幕上显示，小屏幕上隐藏 */}
                <div className="col-span-2 hidden lg:flex items-center">
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

                      {resultImage && hasWatermark && (
                        <div className="text-center">
                          <Button 
                            variant="link" 
                            className="text-xs text-amber-500"
                            onClick={() => router.push(`/${locale}#pricing`)}
                          >
                            {faceSwap?.wantRemoveWatermark || "Want to remove watermark?"}
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
            <GifFaceSwap 
              locale={locale}
              faceSwap={faceSwap}
              faceImage={faceImage}
              handleFaceImageUpload={handleFaceImageUpload}
            />
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
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
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
    </section>
  );
}
