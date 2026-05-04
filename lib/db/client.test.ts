import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { __resetDbForTests, getDb, isPlaceholderDb } from "./client";

const ORIGINAL_URL = process.env.DATABASE_URL;

describe("getDb", () => {
  beforeEach(() => {
    __resetDbForTests();
  });

  afterEach(() => {
    if (ORIGINAL_URL === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = ORIGINAL_URL;
    }
  });

  it("returns the same instance on repeat calls (singleton)", () => {
    process.env.DATABASE_URL = "postgresql://u:p@host/db";
    const a = getDb();
    const b = getDb();
    expect(a).toBe(b);
  });

  it("does not throw when DATABASE_URL is missing (build-safe placeholder)", () => {
    delete process.env.DATABASE_URL;
    expect(() => getDb()).not.toThrow();
    expect(isPlaceholderDb()).toBe(true);
  });

  it("isPlaceholderDb is false when DATABASE_URL is set", () => {
    process.env.DATABASE_URL = "postgresql://u:p@host/db";
    expect(isPlaceholderDb()).toBe(false);
  });
});
