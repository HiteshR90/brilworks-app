import { describe, expect, it } from "vitest";
import { getHealth, readDeployInfo } from "./health";

const fixedNow = () => new Date("2026-05-02T09:00:00.000Z");

describe("readDeployInfo", () => {
  it("returns nulls when no GitHub env is present", () => {
    expect(readDeployInfo({}, fixedNow)).toEqual({
      commitSha: null,
      commitShaShort: null,
      runId: null,
      ref: null,
      builtAt: "2026-05-02T09:00:00.000Z",
    });
  });

  it("surfaces commit SHA, run id, and ref from GitHub Actions env", () => {
    expect(
      readDeployInfo(
        {
          GITHUB_SHA: "deadbeefcafebabe1234567890abcdef12345678",
          GITHUB_RUN_ID: "12345678",
          GITHUB_REF_NAME: "main",
        },
        fixedNow,
      ),
    ).toEqual({
      commitSha: "deadbeefcafebabe1234567890abcdef12345678",
      commitShaShort: "deadbee",
      runId: "12345678",
      ref: "main",
      builtAt: "2026-05-02T09:00:00.000Z",
    });
  });
});

describe("getHealth", () => {
  it("returns ok=true with deploy metadata", () => {
    const result = getHealth({ GITHUB_SHA: "abc1234567" }, fixedNow);
    expect(result.ok).toBe(true);
    expect(result.deploy.commitShaShort).toBe("abc1234");
    expect(result.deploy.builtAt).toBe("2026-05-02T09:00:00.000Z");
  });
});
