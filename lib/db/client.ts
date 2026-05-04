import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as authSchema from "./schema/auth";

const schema = { ...authSchema };

export type Db = ReturnType<typeof drizzle<typeof schema>>;

const BUILD_PLACEHOLDER_URL = "postgresql://placeholder:placeholder@localhost:5432/placeholder";

let cached: Db | null = null;

export function getDb(): Db {
  if (cached) return cached;
  const url = process.env.DATABASE_URL ?? BUILD_PLACEHOLDER_URL;
  const sql = neon(url);
  cached = drizzle(sql, { schema });
  return cached;
}

export function isPlaceholderDb(): boolean {
  return !process.env.DATABASE_URL;
}

export function __resetDbForTests(): void {
  cached = null;
}
