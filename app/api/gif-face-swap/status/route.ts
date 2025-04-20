import { NextRequest, NextResponse } from "next/server";
import { newStorage } from "@/lib/storage";

export async function GET(req: NextRequest) {
  const predictionId = req.nextUrl.searchParams.get("id");
  const needsWatermark = req.nextUrl.searchParams.get("watermark") === "true";
  
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
      // GIF模型的输出是一个URL，不需要像图片那样处理
      // 目前我们保留水印参数但GIF不添加水印，可以根据需要后续实现
      // 注意：zetyquickly-org/faceswap-a-gif模型输出格式是 { output: "url_to_gif" }
      
      if (result.output) {
        // 检查输出格式并适配
        const outputUrl = typeof result.output === 'string' ? result.output : result.output.output || result.output.gif;
        
        return NextResponse.json({ 
          success: true, 
          status: result.status,
          output: { 
            gif: outputUrl,
            hasWatermark: false 
          } 
        });
      }
      
      return NextResponse.json({ 
        success: true, 
        status: result.status,
        output: result.output 
      });
    } else if (result.status === "failed") {
      return NextResponse.json({ 
        success: false, 
        status: result.status,
        error: result.error || "GIF face swap processing failed" 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        status: result.status,
        message: "GIF face swap is still processing" 
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