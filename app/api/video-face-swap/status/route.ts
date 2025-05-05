// export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

export async function POST(request: NextRequest) {
  console.log("🔍 视频换脸状态检查API请求开始处理 - 时间:", new Date().toISOString());
  
  try {
    // 从请求体中获取预测ID
    console.log("📥 解析请求数据...");
    const data = await request.json();
    const predictionId = data.id;
    
    // 添加日志记录每次请求的时间和ID
    console.log(`🔍 检查视频换脸状态 - ID: ${predictionId}, 时间: ${new Date().toISOString()}`);

    if (!predictionId) {
      console.error("❌ 缺少预测ID");
      return NextResponse.json(
        { error: "Missing prediction ID" },
        { status: 400 }
      );
    }

    // 初始化Replicate客户端
    console.log("🔑 检查Replicate API令牌...");
    if (!process.env.REPLICATE_API_TOKEN) {
      console.error("❌ REPLICATE_API_TOKEN未配置");
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN is not configured" },
        { status: 500 }
      );
    }

    console.log("🔑 初始化Replicate客户端...");
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // 获取预测状态
    console.log(`🔄 获取预测状态 - ID: ${predictionId}...`);
    const prediction = await replicate.predictions.get(predictionId);
    
    // 输出完整的prediction对象（开发调试用）
    console.log(`🔄 Replicate预测完整响应:`, JSON.stringify(prediction, null, 2));

    // 如果预测完成并有输出
    if (prediction.status === "succeeded" && prediction.output) {
      console.log("✅ 视频换脸成功, output:", prediction.output);

      // 添加禁止缓存的响应头
      return NextResponse.json({
        success: true,
        status: prediction.status,
        output: {
          video: prediction.output,
        },
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }
    // 如果预测失败
    else if (prediction.status === "failed") {
      console.error("❌ 视频换脸失败:", prediction.error);
      return NextResponse.json(
        {
          success: false,
          status: prediction.status,
          error: prediction.error || "视频换脸失败",
        },
        { status: 500 }
      );
    }
    // 如果预测仍在进行中
    else {
      console.log("🔄 视频换脸处理中:", prediction.status);
      // 计算并返回进度百分比（如果可用）
      let progress = 0;
      if (prediction.logs) {
        // 尝试从日志中提取进度信息
        const progressMatch = prediction.logs.match(/progress: (\d+)%/);
        if (progressMatch && progressMatch[1]) {
          progress = parseInt(progressMatch[1], 10);
          console.log(`📊 处理进度: ${progress}%`);
        }
      }
      
      return NextResponse.json({
        success: false,
        status: prediction.status,
        progress: progress
      });
    }
  } catch (error) {
    console.error("❌ 检查视频换脸状态时出错:", error);
    return NextResponse.json(
      {
        error: "Failed to check video face swap status",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
