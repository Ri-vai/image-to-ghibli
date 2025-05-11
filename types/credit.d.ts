import { credits } from "@/drizzle/sqlite/schema";

export type Credit = typeof credits.$inferInsert;
