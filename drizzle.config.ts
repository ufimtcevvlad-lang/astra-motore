import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/app/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./data/shop.db",
  },
});
