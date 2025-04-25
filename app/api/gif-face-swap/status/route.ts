import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

export async function GET(request: NextRequest) {
  try {
    // 获取预测ID
    const predictionId = request.nextUrl.searchParams.get("id");

    if (!predictionId) {
      return NextResponse.json(
        { error: "Missing prediction ID" },
        { status: 400 }
      );
    }

    // 初始化Replicate客户端
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN is not configured" },
        { status: 500 }
      );
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // 获取预测状态
    const prediction = await replicate.predictions.get(predictionId);

    // 如果预测完成并有输出
    if (prediction.status === "succeeded" && prediction.output) {
      console.log("✅ GIF face swap succeeded, output:", prediction.output);
      
      // 这里我们直接返回Replicate提供的GIF URL
      return NextResponse.json({
        success: true,
        status: prediction.status,
        output: {
          gif: prediction.output
        },
      });
    } 
    // 如果预测失败
    else if (prediction.status === "failed") {
      console.error("❌ GIF face swap failed:", prediction.error);
      return NextResponse.json(
        {
          success: false,
          status: prediction.status,
          error: prediction.error || "GIF face swap failed",
        },
        { status: 500 }
      );
    } 
    // 如果预测仍在进行中
    else {
      console.log("🔄 GIF face swap in progress:", prediction.status);
      return NextResponse.json({
        success: false,
        status: prediction.status,
      });
    }
  } catch (error) {
    console.error("❌ Error checking GIF face swap status:", error);
    return NextResponse.json(
      {
        error: "Failed to check GIF face swap status",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
} 