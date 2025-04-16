import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // 获取查询参数，默认查最近7天
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "7", 10);
    
    // Cloudflare KV API的账户信息
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const namespaceId = process.env.CLOUDFLARE_KV_NAMESPACE_ID;
    const apiKey = process.env.CLOUDFLARE_API_KEY;
    
    if (!accountId || !namespaceId || !apiKey) {
      return NextResponse.json(
        { error: "Cloudflare KV配置缺失" },
        { status: 500 }
      );
    }
    
    // 计算要查询的日期
    const stats: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const key = `photo-face-swap:${dateStr}`;
      
      // 从KV获取数据
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${key}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200) {
        const value = await response.text();
        stats[dateStr] = parseInt(value, 10);
      } else {
        stats[dateStr] = 0; // 没有数据就是0次调用
      }
    }
    
    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    return NextResponse.json(
      { error: "获取使用统计失败", details: error.message },
      { status: 500 }
    );
  }
} 