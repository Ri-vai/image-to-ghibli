import { subscriptions } from "@/drizzle/sqlite/schema";

export type Subscription = typeof subscriptions.$inferInsert;
