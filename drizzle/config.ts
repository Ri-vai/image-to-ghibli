import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env" });
config({ path: ".env.development" });
config({ path: ".env.local" });

export default defineConfig({
  out: "./drizzle/sqlite/migration",
  schema: "./drizzle/sqlite/schema.ts",
  dialect: "turso",
  dbCredentials: {
    url: process.env.SQLITE_URL!,
    authToken: process.env.SQLITE_AUTH_TOKEN!,
  },
});
