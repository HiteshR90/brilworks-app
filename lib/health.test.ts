import { describe, expect, it } from "vitest";
import { getHealth } from "./health";

describe("getHealth", () => {
  it("returns ok=true", () => {
    expect(getHealth()).toEqual({ ok: true });
  });
});
