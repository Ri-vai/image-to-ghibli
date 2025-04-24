import { NextRequest, NextResponse } from "next/server";
import { newStorage } from "@/lib/storage";

export async function GET(req: NextRequest) {
  const predictionId = req.nextUrl.searchParams.get("id");
  // 从查询参数中获取是否需要水印标志，仅用于前端显示
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
    console.log("🔍 查询预测状态:", predictionId);
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
    console.log("📊 预测状态:", result.status);
    
    if (result.status === "succeeded") {
      // 直接返回结果，不添加水印处理
      return NextResponse.json({ 
        success: true, 
        status: result.status,
        output: result.output,
        // 保留水印标志以供前端显示
        hasWatermark: needsWatermark 
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