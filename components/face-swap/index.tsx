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
  ZoomIn 
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type FaceSwapProps = {
  locale: string;
  faceSwap?: any; // 这里可以定义更具体的类型
};

export default function FaceSwap({ locale, faceSwap }: FaceSwapProps) {
  const [activeTab, setActiveTab] = useState("photo");
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [targetImage, setTargetImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  
  const handleSourceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target) {
          setSourceImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleTargetImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target) {
          setTargetImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSwapFace = () => {
    // 这里只是模拟效果，实际应该调用API
    // 暂时只是将目标图像设为结果
    setResultImage(targetImage);
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
                        htmlFor="source-image" 
                        className={cn(
                          "flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer",
                          sourceImage ? "border-primary bg-primary/10" : "border-muted hover:border-primary hover:bg-primary/5"
                        )}
                      >
                        {sourceImage ? (
                          <div className="relative w-12 h-12 overflow-hidden rounded-full border-2 border-primary">
                            <Image 
                              src={sourceImage} 
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
                          id="source-image" 
                          type="file" 
                          className="hidden" 
                          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" 
                          onChange={handleSourceImageUpload}
                        />
                      </label>
                      <p className="mt-2 text-xs text-muted-foreground">PNG/JPG/JPEG/WEBP/GIF</p>
                    </div>
                  </div>
                  
                  {/* 步骤2：上传目标脸部 */}
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mr-4">
                        2
                      </div>
                      <h3 className="text-xl font-medium text-foreground">{faceSwap?.uploadFacePhoto || "Upload Face Photo"}</h3>
                    </div>
                    
                    <div className="relative">
                      <label 
                        htmlFor="target-image" 
                        className={cn(
                          "flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer",
                          targetImage ? "border-primary bg-primary/10" : "border-muted hover:border-primary hover:bg-primary/5"
                        )}
                      >
                        {targetImage ? (
                          <div className="relative w-12 h-12 overflow-hidden rounded-full border-2 border-primary">
                            <Image 
                              src={targetImage} 
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
                          id="target-image" 
                          type="file" 
                          className="hidden" 
                          accept="image/png,image/jpeg,image/jpg,image/webp" 
                          onChange={handleTargetImageUpload}
                        />
                      </label>
                      <p className="mt-2 text-xs text-muted-foreground">PNG/JPG/JPEG/WEBP</p>
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
                      disabled={!sourceImage || !targetImage}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6"
                    >
                      {faceSwap?.swapFace || "Swap Face"} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* 中间和右侧预览区域 - 调整为flex布局，使内容垂直居中 */}
                <div className="col-span-2 flex items-center">
                  {/* 当没有上传图片时显示示例对比图 */}
                  {!sourceImage && !targetImage ? (
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
                      <div className="relative aspect-square bg-muted rounded-lg overflow-hidden shadow-md group">
                        <div className="absolute top-2 left-2 bg-background/70 text-foreground text-xs px-2 py-1 rounded">
                          {faceSwap?.before || "Before"}
                        </div>
                        {sourceImage && (
                          <Image 
                            src={sourceImage} 
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
                        ) : sourceImage && targetImage ? (
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
                      
                      {resultImage && (
                        <div className="col-span-2 flex justify-center space-x-4 mt-4">
                          <Button variant="outline" className="border-border">
                            <ZoomIn className="mr-2 h-4 w-4" /> {faceSwap?.zoomIn || "Zoom In"}
                          </Button>
                          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
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
    </section>
  );
} 