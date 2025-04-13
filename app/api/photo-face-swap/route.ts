import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { newStorage } from "@/lib/storage";

export async function POST(req: NextRequest) {
  console.log("🔄 Face swap API request received");
  
  try {
    const { sourceImage, targetImage } = await req.json();
    console.log("📥 Received images data", { 
      sourceImageLength: sourceImage?.length || 0,
      targetImageLength: targetImage?.length || 0 
    });

    if (!sourceImage || !targetImage) {
      console.error("❌ Missing source or target image");
      return NextResponse.json(
        { error: "Source and target images are required" },
        { status: 400 }
      );
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      console.error("❌ REPLICATE_API_TOKEN not configured");
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN is not configured" },
        { status: 500 }
      );
    }

    // 验证图像格式
    if (!sourceImage.startsWith('data:image/') || !targetImage.startsWith('data:image/')) {
      console.error("❌ Invalid image format");
      return NextResponse.json(
        { error: "Images must be in data URL format (data:image/...)" },
        { status: 400 }
      );
    }

    // 上传图片到存储桶
    console.log("📤 Uploading images to storage bucket");
    const storage = newStorage();
    
    // 从 base64 数据中提取图片内容和类型
    const sourceImageData = sourceImage.split(';base64,');
    const sourceImageMimeType = sourceImageData[0].replace('data:', '');
    const sourceImageBuffer = Buffer.from(sourceImageData[1], 'base64');
    
    const targetImageData = targetImage.split(';base64,');
    const targetImageMimeType = targetImageData[0].replace('data:', '');
    const targetImageBuffer = Buffer.from(targetImageData[1], 'base64');
    
    // 生成带扩展名的文件名
    const sourceExt = sourceImageMimeType === 'image/jpeg' ? '.jpg' : '.png';
    const targetExt = targetImageMimeType === 'image/jpeg' ? '.jpg' : '.png';
    
    const sourceKey = `face-swap/source-${Date.now()}${sourceExt}`;
    const targetKey = `face-swap/target-${Date.now()}${targetExt}`;
    
    // 上传到存储桶
    const sourceUpload = await storage.uploadFile({
      body: sourceImageBuffer,
      key: sourceKey,
      contentType: sourceImageMimeType
    });
    
    const targetUpload = await storage.uploadFile({
      body: targetImageBuffer,
      key: targetKey,
      contentType: targetImageMimeType
    });
    
    console.log("✅ Images uploaded successfully", {
      sourceUrl: sourceUpload.url,
      targetUrl: targetUpload.url
    });

    console.log("🔑 Initializing Replicate client");
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
    
    // 使用存储桶 URL 而不是 base64 数据
    const input = {
      weight: 0.5,
      cache_days: 10,
      det_thresh: 0.1,
      source_image: sourceUpload.url,
      target_image: targetUpload.url,
    };
    
    console.log("⚙️ Prepared input parameters", { 
      weight: input.weight,
      cache_days: input.cache_days,
      det_thresh: input.det_thresh,
      source_image: input.source_image,
      target_image: input.target_image
    });

    console.log("🚀 Sending request to Replicate API");
    
    try {
      const prediction = await replicate.predictions.create({
        version: "d5900f9ebed33e7ae08a07f17e0d98b4ebc68ab9528a70462afc3899cfe23bab",
        input: input,
      });
      console.log("✅ Received prediction response", prediction);
      
      return NextResponse.json({ 
        success: true, 
        message: "Face swap processing started",
        prediction: {
          id: prediction.id,
          status: prediction.status
        }
      });
    } catch (error) {
      console.error("❌ Error creating prediction:", error);
      return NextResponse.json(
        { error: "Failed to start face swap process", details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Error in face swap API:", error);
    return NextResponse.json(
      { error: "Failed to process face swap", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
