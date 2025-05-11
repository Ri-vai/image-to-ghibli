import { posts } from "@/drizzle/sqlite/schema";

export type Post = typeof posts.$inferInsert;
