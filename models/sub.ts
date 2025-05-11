import { and, asc, desc, eq } from "drizzle-orm";

import { getDb } from "@/drizzle/db";
import { subscriptions } from "@/drizzle/sqlite/schema";

export async function insertSubscription(
  subscription: typeof subscriptions.$inferInsert
) {
  const db = await getDb();
  await db.insert(subscriptions).values(subscription);
}

export async function updateSubscription(
  sub_id: string,
  subscription: Partial<typeof subscriptions.$inferInsert>
) {
  const db = await getDb();
  await db
    .update(subscriptions)
    .set(subscription)
    .where(eq(subscriptions.sub_id, sub_id));
}
