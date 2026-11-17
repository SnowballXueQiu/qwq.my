import { defineConfig } from "drizzle-kit";

// pnpm drizzle-kit generate --name <change>: writes the SQL migration for a schema edit
// into drizzle/. The site applies pending migrations itself when it first opens the database.
export default defineConfig({
  dialect: "sqlite",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_PATH ?? "data/qwq.db" },
});
