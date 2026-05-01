import { describe, expect, it } from "vitest";
import { getHealth, readDeployInfo } from "./health";

describe("readDeployInfo", () => {
  it("returns nulls and env=unknown when no Vercel env is present", () => {
    expect(readDeployInfo({})).toEqual({
      commitSha: null,
      commitShaShort: null,
      deploymentId: null,
      region: null,
      env: "unknown",
    });
  });

  it("surfaces the short commit SHA, region, and env from Vercel-injected vars", () => {
    expect(
      readDeployInfo({
        VERCEL_GIT_COMMIT_SHA: "deadbeefcafebabe1234567890abcdef12345678",
        VERCEL_DEPLOYMENT_ID: "dpl_abc123",
        VERCEL_REGION: "iad1",
        VERCEL_ENV: "production",
      }),
    ).toEqual({
      commitSha: "deadbeefcafebabe1234567890abcdef12345678",
      commitShaShort: "deadbee",
      deploymentId: "dpl_abc123",
      region: "iad1",
      env: "production",
    });
  });

  it("normalises unexpected env values to 'unknown'", () => {
    expect(readDeployInfo({ VERCEL_ENV: "staging" }).env).toBe("unknown");
  });
});

describe("getHealth", () => {
  it("returns ok=true with deploy metadata", () => {
    const result = getHealth({ VERCEL_GIT_COMMIT_SHA: "abc1234567" });
    expect(result.ok).toBe(true);
    expect(result.deploy.commitShaShort).toBe("abc1234");
  });
});
