import { NextRequest, NextResponse } from "next/server";
import { addDelayForRussianIP } from "@/lib/geo-delay";

export async function GET(req: NextRequest) {
  try {
    // 获取用户IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('x-real-ip') || 
               '127.0.0.1';
    
    // 为俄罗斯IP添加隐藏延迟
    await addDelayForRussianIP(ip);
    
    // 返回成功响应，不包含任何敏感信息
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("IP检查出错:", error);
    // 即使出错也返回成功，不影响用户体验
    return NextResponse.json({ success: true });
  }
} 