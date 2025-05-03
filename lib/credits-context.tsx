"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserCredits } from "@/types/user";

interface CreditsContextType {
  credits: UserCredits | null;
  loading: boolean;
  error: string | null;
  refreshCredits: () => Promise<void>;
}

const CreditsContext = createContext<CreditsContextType | undefined>(undefined);

export function CreditsProvider({ children }: { children: ReactNode }) {
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCredits = async () => {
    try {
      setLoading(true);
      // 先检查用户是否登录
      const authCheckResponse = await fetch('/api/auth/check');
      const authData = await authCheckResponse.json();
      
      // 如果用户未登录，直接设置积分为0
      if (!authData.authenticated) {
        setCredits({ left_credits: 0 });
        setLoading(false);
        return;
      }
      
      // 用户已登录，获取积分
      const response = await fetch('/api/user/credits');
      if (response.ok) {
        const data = await response.json();
        setCredits(data.credits || { left_credits: 0 });
      } else {
        setCredits({ left_credits: 0 });
      }
      setError(null);
    } catch (err) {
      console.error("获取积分失败:", err);
      setError("获取积分失败");
      setCredits({ left_credits: 0 });
    } finally {
      setLoading(false);
    }
  };

  // 初始加载积分
  useEffect(() => {
    fetchCredits();
  }, []);

  // 提供刷新积分的方法
  const refreshCredits = async () => {
    await fetchCredits();
  };

  return (
    <CreditsContext.Provider value={{ credits, loading, error, refreshCredits }}>
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  const context = useContext(CreditsContext);
  if (context === undefined) {
    throw new Error("useCredits必须在CreditsProvider内部使用");
  }
  return context;
} 