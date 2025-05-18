import { desc, eq } from "drizzle-orm";
import { getDb } from "@/drizzle/db";
import { subscriptions } from "@/drizzle/sqlite/schema";

/**
 * 获取用户最后一条订阅记录
 * @param userUuid 用户UUID
 * @returns 用户最后一条订阅记录
 */
export async function getLastSubscriptionByUserUuid(userUuid: string) {
  const db = await getDb();
  const results = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.user_uuid, userUuid))
    .orderBy(desc(subscriptions.updated_at))
    .limit(1);
  
  return results.length > 0 ? results[0] : null;
}

/**
 * 检查用户是否有有效的pro订阅
 * @param userUuid 用户UUID
 * @returns 是否有有效的pro订阅
 */
export async function hasValidProSubscription(userUuid: string): Promise<boolean> {
  const subscription = await getLastSubscriptionByUserUuid(userUuid);
  
  if (!subscription) {
    return false;
  }
  
  // 检查是否是pro订阅且状态为活跃
  const isPro = subscription.plan_type === 'pro';
  const isActive = subscription.sub_status === 'active';
  
  // 检查是否未过期
  let isNotExpired = true;
  if (subscription.sub_expires_at) {
    const expiresAt = new Date(subscription.sub_expires_at);
    isNotExpired = expiresAt > new Date();
  }
  
  return isPro && isActive && isNotExpired;
}
