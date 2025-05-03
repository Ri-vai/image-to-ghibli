"use client";

import { useEffect } from "react";
import { useCredits } from "@/lib/credits-context";

export default function AdScript() {
  const { credits, loading } = useCredits();

  useEffect(() => {
    // 等待积分加载完成
    if (loading) return;

    // 如果用户有积分，不加载广告脚本
    const hasCredits = credits && credits.left_credits > 0;
    if (hasCredits) return;

    // 用户没有积分，动态加载广告脚本
    const script = document.createElement("script");
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2968253568243697";
    script.async = true;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);

    return () => {
      // 清理函数，移除脚本
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [credits, loading]);

  return null;
} 