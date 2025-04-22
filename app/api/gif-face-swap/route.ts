import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { newStorage } from "@/lib/storage";
import { auth } from "@/auth";

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
    
    const key = `gif-face-swap:${today}`;
    
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

export async function POST(req: NextRequest) {
  console.log("🔄 GIF face swap API request received");

  try {
    // 验证用户是否已登录
    const session = await auth();
    if (!session) {
      console.error("❌ Unauthorized access attempt");
      return NextResponse.json(
        { error: "Unauthorized. Please login to use this feature." },
        { status: 401 }
      );
    }

    const { sourceImage, targetGif } = await req.json();
    console.log("📥 Received images data", {
      sourceImageLength: sourceImage?.length || 0,
      targetGifLength: targetGif?.length || 0,
    });

    if (!sourceImage || !targetGif) {
      console.error("❌ Missing source image or target GIF");
      return NextResponse.json(
        { error: "Source image and target GIF are required" },
        { status: 400 }
      );
    }

    // 直接进行API调用记录
    try {
      await recordApiUsage();
    } catch (error) {
      // 记录错误但继续执行后续逻辑
      console.error("📊 记录API调用次数失败，但将继续执行:", error);
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      console.error("❌ REPLICATE_API_TOKEN not configured");
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN is not configured" },
        { status: 500 }
      );
    }

    // 验证图像和GIF格式
    if (!sourceImage.startsWith("data:image/")) {
      console.error("❌ Invalid source image format");
      return NextResponse.json(
        { error: "Source image must be in data URL format (data:image/...)" },
        { status: 400 }
      );
    }
    
    // GIF格式验证，确保是data:image/gif或支持的格式
    if (!targetGif.startsWith("data:")) {
      console.error("❌ Invalid target GIF format");
      return NextResponse.json(
        { error: "Target GIF must be in data URL format" },
        { status: 400 }
      );
    }

    // 上传图片和GIF到存储桶
    console.log("📤 Uploading files to storage bucket");
    const storage = newStorage();

    // 从 base64 数据中提取图片内容和类型
    const sourceImageData = sourceImage.split(";base64,");
    const sourceImageMimeType = sourceImageData[0].replace("data:", "");
    const sourceImageBuffer = Buffer.from(sourceImageData[1], "base64");

    const targetGifData = targetGif.split(";base64,");
    const targetGifMimeType = targetGifData[0].replace("data:", "");
    const targetGifBuffer = Buffer.from(targetGifData[1], "base64");

    // 生成带扩展名的文件名
    const sourceExt = sourceImageMimeType === "image/jpeg" ? ".jpg" : ".png";
    const targetExt = targetGifMimeType === "image/gif" ? ".gif" : 
                     (targetGifMimeType === "image/jpeg" ? ".jpg" : ".png");

    const sourceKey = `gif-face-swap/source-${Date.now()}${sourceExt}`;
    const targetKey = `gif-face-swap/target-${Date.now()}${targetExt}`;

    // 上传到存储桶
    const sourceUpload = await storage.uploadFile({
      body: sourceImageBuffer,
      key: sourceKey,
      contentType: sourceImageMimeType,
    });

    const targetUpload = await storage.uploadFile({
      body: targetGifBuffer,
      key: targetKey,
      contentType: targetGifMimeType,
    });

    console.log("✅ Files uploaded successfully", {
      sourceUrl: sourceUpload.url,
      targetUrl: targetUpload.url,
    });

    console.log("🔑 Initializing Replicate client");
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // 使用存储桶 URL
    const input = {
      source: sourceUpload.url,
      target: targetUpload.url,
    };

    console.log("⚙️ Prepared input parameters", {
      source: input.source,
      target: input.target,
    });

    console.log("🚀 Sending request to Replicate API");

    try {
      const prediction = await replicate.predictions.create({
        version: "974be35318aab27d78c8c935761e665620236d3b157a9b35385c7905c601d977",
        input: input,
      });
      console.log("✅ Received prediction response", prediction);

      return NextResponse.json({
        success: true,
        message: "GIF face swap processing started",
        prediction: {
          id: prediction.id,
          status: prediction.status,
        },
      });
    } catch (error) {
      console.error("❌ Error creating prediction:", error);
      return NextResponse.json(
        {
          error: "Failed to start GIF face swap process",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Error in GIF face swap API:", error);
    return NextResponse.json(
      {
        error: "Failed to process GIF face swap",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
