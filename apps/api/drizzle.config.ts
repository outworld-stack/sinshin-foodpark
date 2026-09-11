import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema",
  out: "./drizzle",
  // Inside the container: postgres host. Outside (host tools): localhost.
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgres://sinshin:sinshin_local@localhost:5432/sinshin",
  },
  verbose: true,
  strict: true,
});