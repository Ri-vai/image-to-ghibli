import { apikeys } from "@/drizzle/sqlite/schema";

export type Apikey = typeof apikeys.$inferInsert;
