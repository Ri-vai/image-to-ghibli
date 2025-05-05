import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { newStorage } from "@/lib/storage";
import { auth } from "@/auth";
import { CreditsAmount, CreditsTransType, decreaseCredits, getUserCredits } from "@/services/credit";
import { getFirstPaidOrderByUserUuid } from "@/models/order";

// 记录API调用到Cloudflare KV
async function recordApiUsage() {
  console.log("📊 开始记录视频换脸API使用量...");
  try {
    // 获取北京时间的日期字符串（YYYY-MM-DD格式）
    const today = (() => {
      const date = new Date();
      // 调整为北京时间 (UTC+8)
      const beijingDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
      return beijingDate.toISOString().split('T')[0]; // 格式：YYYY-MM-DD
    })();
    
    const key = `video-face-swap:${today}`;
    console.log(`📊 使用统计键名: ${key}`);
    
    // Cloudflare KV API的账户信息
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const namespaceId = process.env.CLOUDFLARE_KV_NAMESPACE_ID;
    const apiKey = process.env.CLOUDFLARE_API_KEY;
    
    if (!accountId || !namespaceId || !apiKey) {
      console.warn("⚠️ Cloudflare KV配置缺失，跳过统计");
      return;
    }
    
    // 1. 先获取当前值
    console.log(`📊 获取当前计数...`);
    const getUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${key}`;
    
    const getResponse = await fetch(getUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    // 如果值存在，则+1；否则设为1
    let count = 1;
    if (getResponse.status === 200) {
      const currentValue = await getResponse.text();
      count = parseInt(currentValue, 10) + 1;
      console.log(`📊 当前计数: ${parseInt(currentValue, 10)}, 新计数: ${count}`);
    } else {
      console.log(`📊 未找到现有计数，初始化为: ${count}`);
    }
    
    // 2. 更新值
    console.log(`📊 更新计数值...`);
    const putUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${key}`;
    
    const putResponse = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'text/plain'
      },
      body: count.toString()
    });
    
    // 验证PUT请求是否成功
    const putResult = await putResponse.json();
    if (!putResult.success) {
      console.log("🚀 ~ Cloudflare KV ~ putResult:", putResult)
      console.error("❌ Cloudflare KV更新失败:", putResult.errors);
      throw new Error(`Cloudflare KV更新失败: ${JSON.stringify(putResult.errors)}`);
    }
    
    console.log(`📊 API 调用次数已更新: ${today} = ${count} (北京时间)`);
  } catch (error) {
    console.error("❌ 记录API使用量时出错:", error);
    // 不影响主流程，只记录错误
  }
}

export async function POST(req: NextRequest) {
  console.log("🔄 视频换脸API请求开始处理 - 时间:", new Date().toISOString());

  try {
    // 记录API使用量
    recordApiUsage().catch(err => console.error("❌ 记录API使用量失败:", err));
    
    // 验证用户是否已登录
    console.log("🔐 验证用户身份...");
    const session = await auth();
    console.log("🚀 ~ POST ~ 用户会话:", session ? "已登录" : "未登录");
    if (!session) {
      console.error("❌ 未授权的访问尝试");
      return NextResponse.json(
        { error: "Unauthorized. Please login to use this feature." },
        { status: 401 }
      );
    }

    const user_uuid = session.user.uuid;
    console.log(`👤 用户ID: ${user_uuid}`);
    
    // 检查用户是否有付费订阅
    console.log("💰 检查用户订阅状态...");
    const paidOrder = await getFirstPaidOrderByUserUuid(user_uuid);
    console.log("🚀 ~ 用户订单:", paidOrder ? "已订阅" : "未订阅");
    if (!paidOrder) {
      console.error("❌ 用户未订阅", { userId: user_uuid });
      return NextResponse.json(
        { 
          error: "Subscription required for video face swap", 
          needSubscription: true 
        },
        { status: 403 }
      );
    }

    // 验证用户是否有足够的积分
    console.log("💳 检查用户积分...");
    const userCredits = await getUserCredits(user_uuid);
    console.log("🚀 ~ POST ~ 用户积分:", userCredits);
    if (userCredits.left_credits < CreditsAmount.VideoSwapCost) {
      console.error("❌ 用户积分不足", { 
        userId: user_uuid, 
        requiredCredits: CreditsAmount.VideoSwapCost, 
        leftCredits: userCredits.left_credits 
      });
      return NextResponse.json(
        { 
          error: "Insufficient credits for video face swap", 
          creditsNeeded: CreditsAmount.VideoSwapCost,
          creditsLeft: userCredits.left_credits
        },
        { status: 402 }
      );
    }

    console.log("📥 解析请求数据...");
    const { sourceImage, targetVideo } = await req.json();
    console.log("📥 接收到的数据", {
      sourceImageLength: sourceImage?.length || 0,
      targetVideoLength: targetVideo?.length || 0,
    });

    if (!sourceImage || !targetVideo) {
      console.error("❌ 缺少源图像或目标视频");
      return NextResponse.json(
        { error: "Source image and target video are required" },
        { status: 400 }
      );
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      console.error("❌ REPLICATE_API_TOKEN未配置");
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN is not configured" },
        { status: 500 }
      );
    }

    // 验证图像和视频格式
    console.log("🔍 验证上传文件格式...");
    if (!sourceImage.startsWith("data:image/")) {
      console.error("❌ 源图像格式无效");
      return NextResponse.json(
        { error: "Source image must be in data URL format (data:image/...)" },
        { status: 400 }
      );
    }
    
    // 视频格式验证
    if (!targetVideo.startsWith("data:")) {
      console.error("❌ 目标视频格式无效");
      return NextResponse.json(
        { error: "Target video must be in data URL format" },
        { status: 400 }
      );
    }

    // 上传图片和视频到存储桶
    console.log("📤 开始上传文件到存储桶...");
    const storage = newStorage();

    // 从 base64 数据中提取图片内容和类型
    console.log("🔄 处理源图像数据...");
    const sourceImageData = sourceImage.split(";base64,");
    const sourceImageMimeType = sourceImageData[0].replace("data:", "");
    const sourceImageBuffer = Buffer.from(sourceImageData[1], "base64");
    console.log(`📄 源图像MIME类型: ${sourceImageMimeType}`);

    console.log("🔄 处理目标视频数据...");
    const targetVideoData = targetVideo.split(";base64,");
    const targetVideoMimeType = targetVideoData[0].replace("data:", "");
    const targetVideoBuffer = Buffer.from(targetVideoData[1], "base64");
    console.log(`🎬 目标视频MIME类型: ${targetVideoMimeType}`);

    // 生成带扩展名的文件名
    const sourceExt = sourceImageMimeType === "image/jpeg" ? ".jpg" : ".png";
    const targetExt = targetVideoMimeType.includes("mp4") ? ".mp4" : 
                     (targetVideoMimeType.includes("mov") ? ".mov" : ".mp4");

    const sourceKey = `video-face-swap/source-${Date.now()}${sourceExt}`;
    const targetKey = `video-face-swap/target-${Date.now()}${targetExt}`;
    console.log(`🔑 源图像存储键: ${sourceKey}`);
    console.log(`🔑 目标视频存储键: ${targetKey}`);

    // 上传到存储桶
    console.log("📤 上传源图像...");
    const sourceUpload = await storage.uploadFile({
      body: sourceImageBuffer,
      key: sourceKey,
      contentType: sourceImageMimeType,
    });

    console.log("📤 上传目标视频...");
    const targetUpload = await storage.uploadFile({
      body: targetVideoBuffer,
      key: targetKey,
      contentType: targetVideoMimeType,
    });

    console.log("✅ 文件上传成功", {
      sourceUrl: sourceUpload.url,
      targetUrl: targetUpload.url,
    });

    console.log("🔑 初始化Replicate客户端...");
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // 使用存储桶 URL
    const timestamp = Date.now();
    const input = {
      swap_image: sourceUpload.url,
      target_video: targetUpload.url,
      face_restore: true,
      result_video_path: `result_${timestamp}.mp4`
    };

    console.log("⚙️ 准备输入参数", {
      swap_image: input.swap_image,
      target_video: input.target_video,
      face_restore: input.face_restore,
      result_video_path: input.result_video_path
    });

    console.log("🚀 发送请求到Replicate API...");

    try {
      const prediction = await replicate.predictions.create({
        version: "11b6bf0f4e14d808f655e87e5448233cceff10a45f659d71539cafb7163b2e84",
        input: input,
      });
      console.log("✅ 收到预测响应", prediction);

      // 扣除用户积分
      console.log(`💰 扣除用户积分: ${CreditsAmount.VideoSwapCost}...`);
      await decreaseCredits({
        user_uuid,
        trans_type: CreditsTransType.VideoSwap,
        credits: CreditsAmount.VideoSwapCost,
      });
      console.log(`💰 已扣除用户(${user_uuid})积分: ${CreditsAmount.VideoSwapCost}`);

      return NextResponse.json({
        success: true,
        message: "Video face swap processing started",
        prediction: {
          id: prediction.id,
          status: prediction.status,
        },
        creditsUsed: CreditsAmount.VideoSwapCost,
        creditsLeft: userCredits.left_credits - CreditsAmount.VideoSwapCost
      });
    } catch (error) {
      console.error("❌ 创建预测时出错:", error);
      return NextResponse.json(
        {
          error: "Failed to start video face swap process",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ 视频换脸API处理出错:", error);
    return NextResponse.json(
      {
        error: "Failed to process video face swap",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
