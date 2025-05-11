import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

export async function getDb() {
  if (!process.env.SQLITE_URL) {
    throw new Error("SQLITE_URL is not set");
  }

  const client = createClient({
    url: process.env.SQLITE_URL,
    authToken: process.env.SQLITE_AUTH_TOKEN,
  });
  const db = drizzle(client);

  return db;
}
