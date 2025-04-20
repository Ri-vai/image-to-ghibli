import { NextResponse } from "next/server";
import { getUserUuid } from "@/services/user";
import { getUserCredits } from "@/services/credit";

export async function GET() {
  try {
    // 获取当前用户UUID
    const userUuid = await getUserUuid();
    
    if (!userUuid) {
      return NextResponse.json(
        { error: "未登录用户" },
        { status: 401 }
      );
    }
    
    // 从数据库获取用户积分
    const credits = await getUserCredits(userUuid);
    
    return NextResponse.json({ 
      success: true,
      credits 
    });
  } catch (error) {
    console.error("获取用户积分失败:", error);
    return NextResponse.json(
      { error: "获取积分信息失败" },
      { status: 500 }
    );
  }
} 