"use client";

import { useState } from "react";
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
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { 
  ReactCompareSlider, 
  ReactCompareSliderImage,
  ReactCompareSliderHandle
} from 'react-compare-slider';

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
    
    try {
      setIsLoading(true);
      setError(null);
      
      // 发送请求时，确保参数名称与API期望的一致
      const response = await fetch('/api/photo-face-swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceImage: faceImage,  // 脸部照片 (source_image)
          targetImage: bodyImage,  // 身体照片 (target_image)
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start face swap process');
      }
      
      if (!data.success || !data.prediction || !data.prediction.id) {
        throw new Error(data.error || 'Failed to start face swap process');
      }
      
      // 第二步：轮询检查处理状态
      const predictionId = data.prediction.id;
      let attempts = 0;
      const maxAttempts = 30; // 最多尝试30次，每次间隔2秒
      
      const checkStatus = async () => {
        if (attempts >= maxAttempts) {
          throw new Error('处理超时，请稍后再试');
        }
        
        const statusResponse = await fetch(`/api/photo-face-swap/status?id=${predictionId}`);
        const statusData = await statusResponse.json();
        
        if (!statusResponse.ok) {
          throw new Error(statusData.error || 'Failed to check face swap status');
        }
        
        if (statusData.success && statusData.output) {
          // 处理成功，设置结果图片
          setResultImage(statusData.output.image);
          return true;
        } else if (statusData.status === 'failed') {
          // 处理失败，显示友好的错误信息
          throw new Error(statusData.error || '换脸处理失败');
        } else {
          // 继续处理中，等待后再次检查
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 2000));
          return checkStatus();
        }
      };
      
      await checkStatus();
      // 成功生成图片后，启用对比滑块
      setShowCompareSlider(true);
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
        const link = document.createElement('a');
        link.href = url;
        link.download = `face-swap-${new Date().getTime()}.jpg`;
        link.style.display = 'none';
        
        // 添加到DOM，触发点击，然后移除
        document.body.appendChild(link);
        link.click();
        
        // 清理
        window.setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);
      } catch (error) {
        console.error('下载图片时出错:', error);
      }
    }
  };

  return (
    <section className="w-full py-12 bg-background">
      <div className="container mx-auto px-4">
        <Tabs defaultValue="photo" className="w-full" onValueChange={setActiveTab}>
          <div className="flex justify-center mb-8">
            <TabsList className="bg-muted/50 border border-primary/20">
              <TabsTrigger value="photo" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <ImageIcon className="mr-2 h-4 w-4" />
                {faceSwap?.photoFaceSwap || "Photo Face Swap"}
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
                      <h3 className="text-xl font-medium text-foreground">{faceSwap?.uploadOriginalImage || "Upload Original Image"}</h3>
                    </div>
                    
                    <div className="relative">
                      <label 
                        htmlFor="body-image" 
                        className={cn(
                          "flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer",
                          bodyImage ? "border-primary bg-primary/10" : "border-muted hover:border-primary hover:bg-primary/5"
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
                            <p className="mt-2 text-sm text-muted-foreground">{faceSwap?.uploadImage || "Upload Image"}</p>
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
                      <p className="mt-2 text-xs text-muted-foreground">PNG/JPG/JPEG/WEBP</p>
                    </div>
                  </div>
                  
                  {/* 步骤2：上传目标脸部 */}
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mr-4">
                        2
                      </div>
                      <h3 className="text-xl font-medium text-foreground">{faceSwap?.uploadFaceImage || "Upload Face Photo"}</h3>
                    </div>
                    
                    <div className="relative">
                      <label 
                        htmlFor="face-image" 
                        className={cn(
                          "flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer",
                          faceImage ? "border-primary bg-primary/10" : "border-muted hover:border-primary hover:bg-primary/5"
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
                            <p className="mt-2 text-sm text-muted-foreground">{faceSwap?.uploadImage || "Upload Image"}</p>
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
                      <p className="mt-2 text-xs text-muted-foreground">PNG/JPG/JPEG/WEBP/GIF</p>
                    </div>
                  </div>
                  
                  {/* 步骤3：开始换脸 */}
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mr-4">
                        3
                      </div>
                      <h3 className="text-xl font-medium text-foreground">{faceSwap?.startFaceSwap || "Start Face Swap"}</h3>
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
                              {faceSwap?.swapInProgress || "Face swap in progress..."}
                            </p>
                            
                            <p className="text-sm text-muted-foreground">
                              {faceSwap?.completeSoon || "Will complete in a few seconds"}
                            </p>
                            
                            <div className="mt-3 text-xs text-muted-foreground animate-pulse">
                              {faceSwap?.magicHappening || "Magic happening..."}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {faceSwap?.swapFace || "Swap Face"} <ArrowRight className="ml-2 h-4 w-4" />
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
                                  backgroundColor: "#f8f9fa"
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
                                  backgroundColor: "#f8f9fa"
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
                                linesStyle={{ width: 2, color: "rgba(0, 0, 0, 0.5)" }}
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
                                      <span className="text-primary text-xl">✨</span>
                                    </div>
                                  </div>
                                  
                                  <p className="font-medium text-foreground mb-1">
                                    {faceSwap?.swapInProgress || "Face swap in progress..."}
                                  </p>
                                  
                                  <p className="text-sm text-muted-foreground">
                                    {faceSwap?.completeSoon || "Will complete in a few seconds"}
                                  </p>
                                  
                                  <div className="mt-3 text-xs text-muted-foreground animate-pulse">
                                    {faceSwap?.magicHappening || "Magic happening..."}
                                  </div>
                                </div>
                              </div>
                            ) : faceImage && bodyImage ? (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-muted-foreground text-center">
                                  <p>{faceSwap?.readyToSwap || "Ready to Swap"}</p>
                                </div>
                              </div>
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-muted-foreground text-center">
                                  <p>{faceSwap?.uploadBothImages || "Upload Both Images"}</p>
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
                            onClick={() => setShowCompareSlider(!showCompareSlider)}
                          >
                            <SplitSquareVertical className="mr-2 h-4 w-4" /> 
                            {showCompareSlider ? faceSwap?.splitView : faceSwap?.compareView}
                          </Button>
                          <Button 
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={handleDownload}
                          >
                            <Download className="mr-2 h-4 w-4" /> {faceSwap?.download || "Download"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* 保留但不显示其他选项卡内容 */}
          <TabsContent value="video" className="mt-0 hidden">
            <div className="flex justify-center items-center h-64 border border-dashed border-border rounded-lg bg-card/50">
              <p className="text-muted-foreground">{faceSwap?.comingSoon || "Coming Soon"}</p>
            </div>
          </TabsContent>
          
          <TabsContent value="multiple" className="mt-0 hidden">
            <div className="flex justify-center items-center h-64 border border-dashed border-border rounded-lg bg-card/50">
              <p className="text-muted-foreground">{faceSwap?.comingSoon || "Coming Soon"}</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}
    </section>
  );
} 