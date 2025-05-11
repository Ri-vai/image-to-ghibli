import { orders } from "@/drizzle/sqlite/schema";

export type Order = typeof orders.$inferInsert;
