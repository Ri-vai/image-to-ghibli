import { NextRequest, NextResponse } from "next/server";
import sharp from 'sharp';
import { newStorage } from "@/lib/storage";

export async function GET(req: NextRequest) {
  const predictionId = req.nextUrl.searchParams.get("id");
  // 从查询参数中获取是否需要水印，默认为true
  const needsWatermark = req.nextUrl.searchParams.get("watermark") !== "false";
  
  if (!predictionId) {
    return NextResponse.json(
      { error: "Prediction ID is required" },
      { status: 400 }
    );
  }
  
  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json(
      { error: "REPLICATE_API_TOKEN is not configured" },
      { status: 500 }
    );
  }
  
  try {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get prediction status: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.status === "succeeded") {
      // 如果需要添加水印，进行处理
      if (needsWatermark && result.output && result.output.image) {
        try {
          // 获取原始图片
          const imageUrl = result.output.image;
          const imageResponse = await fetch(imageUrl);
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          
          // 使用Sharp添加水印
          const watermarkedImageBuffer = await addWatermark(imageBuffer);
          
          // 上传水印图片到存储
          const storage = newStorage();
          const key = `face-swap/watermarked-${Date.now()}.jpg`;
          
          const uploadResult = await storage.uploadFile({
            body: watermarkedImageBuffer,
            key: key,
            contentType: 'image/jpeg',
          });
          
          // 返回带水印的图片URL
          return NextResponse.json({ 
            success: true, 
            status: result.status,
            output: { 
              image: uploadResult.url,
              hasWatermark: true 
            } 
          });
        } catch (error) {
          console.error("添加水印失败:", error);
          // 如果水印处理失败，返回原始图片
          return NextResponse.json({ 
            success: true, 
            status: result.status,
            output: result.output,
            hasWatermark: false
          });
        }
      }
      
      // 不需要水印或处理失败，直接返回原始结果
      return NextResponse.json({ 
        success: true, 
        status: result.status,
        output: result.output,
        hasWatermark: false 
      });
    } else if (result.status === "failed") {
      return NextResponse.json({ 
        success: false, 
        status: result.status,
        error: result.error || "Face swap processing failed" 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        status: result.status,
        message: "Face swap is still processing" 
      });
    }
  } catch (error) {
    console.error("Error checking prediction status:", error);
    return NextResponse.json(
      { error: "Failed to check prediction status" },
      { status: 500 }
    );
  }
}

// 水印添加函数
async function addWatermark(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // 获取图片信息
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 600;
    
    // 创建包含水印文字的SVG
    const watermarkText = 'aifaceswap.app';
    const fontSize = Math.max(width, height) * 0.06; // 增加字体大小系数
    const svgText = `
      <svg width="${width}" height="${height}">
        <style>
          .watermark {
            font-family: Arial, sans-serif;
            font-size: ${fontSize}px;
            font-weight: bold;
            fill: rgba(255, 255, 255, 0.4);
            filter: drop-shadow(1px 1px 1px rgba(0, 0, 0, 0.5));
          }
        </style>
        <text x="50%" y="80%" text-anchor="middle" class="watermark">${watermarkText}</text>
      </svg>`;
    
    // 合成水印和图片
    return await sharp(imageBuffer)
      .composite([
        {
          input: Buffer.from(svgText),
          gravity: 'center'
        }
      ])
      .jpeg({ quality: 90 })
      .toBuffer();
  } catch (error) {
    console.error('添加水印时出错:', error);
    throw error;
  }
} 