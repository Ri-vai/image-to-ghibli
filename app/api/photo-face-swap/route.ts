import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { newStorage } from "@/lib/storage";
import { auth } from "@/auth";
import { CreditsAmount, CreditsTransType, decreaseCredits, getUserCredits } from "@/services/credit";
import { getFirstPaidOrderByUserUuid } from "@/models/order";

// 记录API调用到Cloudflare KV
async function recordApiUsage() {
  try {
    // 获取北京时间的日期字符串（YYYY-MM-DD格式）
    const today = (() => {
      const date = new Date();
      // 调整为北京时间 (UTC+8)
      const beijingDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
      return beijingDate.toISOString().split('T')[0]; // 格式：YYYY-MM-DD
    })();
    
    const key = `photo-face-swap:${today}`;
    
    // Cloudflare KV API的账户信息
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const namespaceId = process.env.CLOUDFLARE_KV_NAMESPACE_ID;
    const apiKey = process.env.CLOUDFLARE_API_KEY;
    
    if (!accountId || !namespaceId || !apiKey) {
      console.warn("⚠️ Cloudflare KV配置缺失，跳过统计");
      return;
    }
    
    // 1. 先获取当前值
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
    }
    
    // 2. 更新值
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
    console.error("记录API使用量时出错:", error);
    // 不影响主流程，只记录错误
  }
}

async function verifyTurnstileToken(token: string) {
  // 如果是开发环境，直接返回成功
  if (process.env.NODE_ENV === "development") {
    console.log("🔄 开发环境中跳过Turnstile验证");
    return true;
  }

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secret: process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY,
        response: token,
      }),
    }
  );

  const data = await response.json();
  return data.success;
}

export async function POST(req: NextRequest) {
  console.log("🔄 Face swap API request received");

  try {
    const { sourceImage, targetImage, turnstileToken } = await req.json();
    console.log("📥 Received images data", {
      sourceImageLength: sourceImage?.length || 0,
      targetImageLength: targetImage?.length || 0,
    });

    if (!sourceImage || !targetImage) {
      console.error("❌ Missing source or target image");
      return NextResponse.json(
        { error: "Source and target images are required" },
        { status: 400 }
      );
    }

    if (!turnstileToken) {
      console.error("❌ Missing Turnstile token");
      return NextResponse.json(
        { error: "Turnstile verification is required" },
        { status: 400 }
      );
    }

    // Verify Turnstile token
    const isValid = await verifyTurnstileToken(turnstileToken);
    if (!isValid) {
      console.error("❌ Invalid Turnstile token");
      return NextResponse.json(
        { error: "Invalid Turnstile verification" },
        { status: 400 }
      );
    }

    // 验证用户身份，检查是否需要水印
    const session = await auth();
    let needsWatermark = true; // 默认需要水印
    let userUuid = null;
    
    if (session && session.user && session.user.uuid) {
      userUuid = session.user.uuid;
      console.log("🔍 检查用户订阅状态:", userUuid);
      
      // 检查用户是否有付费订阅
      const paidOrder = await getFirstPaidOrderByUserUuid(userUuid);
      console.log("🚀 ~ 用户订单:", paidOrder);
      
      if (paidOrder) {
        // 用户有订阅，检查积分是否足够
        const userCredits = await getUserCredits(userUuid);
        console.log("🚀 ~ 用户积分:", userCredits);
        
        if (userCredits.left_credits >= CreditsAmount.PhotoFaceSwapCost) {
          // 用户有足够积分，无需水印
          needsWatermark = false;
          console.log("✅ 用户有订阅且积分充足，将生成无水印图片");
        } else {
          console.log("⚠️ 用户有订阅但积分不足，将添加水印");
        }
      } else {
        console.log("⚠️ 用户无订阅，将添加水印");
      }
    } else {
      console.log("⚠️ 未登录用户，将添加水印");
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      console.error("❌ REPLICATE_API_TOKEN not configured");
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN is not configured" },
        { status: 500 }
      );
    }

    // 验证图像格式
    if (
      !sourceImage.startsWith("data:image/") ||
      !targetImage.startsWith("data:image/")
    ) {
      console.error("❌ Invalid image format");
      return NextResponse.json(
        { error: "Images must be in data URL format (data:image/...)" },
        { status: 400 }
      );
    }

    // 在验证成功后记录API调用
    try {
      await recordApiUsage();
    } catch (error) {
      // 记录错误但继续执行后续逻辑
      console.error("📊 记录API调用次数失败，但将继续执行:", error);
    }

    // 上传图片到存储桶
    console.log("📤 Uploading images to storage bucket");
    const storage = newStorage();

    // 从 base64 数据中提取图片内容和类型
    const sourceImageData = sourceImage.split(";base64,");
    const sourceImageMimeType = sourceImageData[0].replace("data:", "");
    const sourceImageBuffer = Buffer.from(sourceImageData[1], "base64");

    const targetImageData = targetImage.split(";base64,");
    const targetImageMimeType = targetImageData[0].replace("data:", "");
    const targetImageBuffer = Buffer.from(targetImageData[1], "base64");

    // 生成带扩展名的文件名
    const sourceExt = sourceImageMimeType === "image/jpeg" ? ".jpg" : ".png";
    const targetExt = targetImageMimeType === "image/jpeg" ? ".jpg" : ".png";

    const sourceKey = `face-swap/source-${Date.now()}${sourceExt}`;
    const targetKey = `face-swap/target-${Date.now()}${targetExt}`;

    // 上传到存储桶
    const sourceUpload = await storage.uploadFile({
      body: sourceImageBuffer,
      key: sourceKey,
      contentType: sourceImageMimeType,
    });

    const targetUpload = await storage.uploadFile({
      body: targetImageBuffer,
      key: targetKey,
      contentType: targetImageMimeType,
    });

    console.log("✅ Images uploaded successfully", {
      sourceUrl: sourceUpload.url,
      targetUrl: targetUpload.url,
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
      target_image: input.target_image,
    });

    console.log("🚀 Sending request to Replicate API");

    try {
      const prediction = await replicate.predictions.create({
        version:
          "d5900f9ebed33e7ae08a07f17e0d98b4ebc68ab9528a70462afc3899cfe23bab",
        input: input,
      });
      console.log("✅ Received prediction response", prediction);

      // 如果用户有订阅且不需要水印，扣除积分
      if (!needsWatermark && userUuid) {
        try {
          await decreaseCredits({
            user_uuid: userUuid,
            trans_type: CreditsTransType.PhotoFaceSwap,
            credits: CreditsAmount.PhotoFaceSwapCost,
          });
          console.log(`💰 已扣除用户(${userUuid})积分: ${CreditsAmount.PhotoFaceSwapCost}`);
        } catch (error) {
          console.error("❌ 扣除积分失败:", error);
          // 失败不影响主流程，继续返回结果
        }
      }

      return NextResponse.json({
        success: true,
        message: "Face swap processing started",
        prediction: {
          id: prediction.id,
          status: prediction.status,
          needsWatermark: needsWatermark,
        },
      });
    } catch (error) {
      console.error("❌ Error creating prediction:", error);
      return NextResponse.json(
        {
          error: "Failed to start face swap process",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Error in face swap API:", error);
    return NextResponse.json(
      {
        error: "Failed to process face swap",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
