import type { Config } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;

const config: Config = {
  schema: "./lib/db/schema",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl ?? "postgres://placeholder/placeholder",
  },
  strict: true,
  verbose: true,
};

export default config;
