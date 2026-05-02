import { afterEach, describe, expect, it, vi } from "vitest";
import { __resetSentryInitForTests, initSentry, readSentryConfig } from "./sentry";

afterEach(() => {
  __resetSentryInitForTests();
});

describe("readSentryConfig", () => {
  it("returns null when DSN is missing", () => {
    expect(readSentryConfig({})).toBeNull();
  });

  it("returns null when DSN is empty string", () => {
    expect(readSentryConfig({ NEXT_PUBLIC_SENTRY_DSN: "" })).toBeNull();
  });

  it("defaults environment to 'staging' when NEXT_PUBLIC_SENTRY_ENV is unset", () => {
    const cfg = readSentryConfig({ NEXT_PUBLIC_SENTRY_DSN: "https://x@o.ingest/1" });
    expect(cfg?.environment).toBe("staging");
  });

  it("uses NEXT_PUBLIC_SENTRY_ENV when set", () => {
    const cfg = readSentryConfig({
      NEXT_PUBLIC_SENTRY_DSN: "https://x@o.ingest/1",
      NEXT_PUBLIC_SENTRY_ENV: "production",
    });
    expect(cfg?.environment).toBe("production");
  });

  it("surfaces NEXT_PUBLIC_GIT_SHA as release", () => {
    const cfg = readSentryConfig({
      NEXT_PUBLIC_SENTRY_DSN: "https://x@o.ingest/1",
      NEXT_PUBLIC_GIT_SHA: "deadbeef",
    });
    expect(cfg?.release).toBe("deadbeef");
  });

  it("leaves release undefined when SHA is empty", () => {
    const cfg = readSentryConfig({
      NEXT_PUBLIC_SENTRY_DSN: "https://x@o.ingest/1",
      NEXT_PUBLIC_GIT_SHA: "",
    });
    expect(cfg?.release).toBeUndefined();
  });

  it("pins tracesSampleRate to 0 (errors-only, no perf overhead)", () => {
    const cfg = readSentryConfig({ NEXT_PUBLIC_SENTRY_DSN: "https://x@o.ingest/1" });
    expect(cfg?.tracesSampleRate).toBe(0);
  });
});

describe("initSentry", () => {
  it("returns 'no-dsn' and skips init when DSN is missing", () => {
    const init = vi.fn();
    expect(initSentry({}, init)).toBe("no-dsn");
    expect(init).not.toHaveBeenCalled();
  });

  it("calls init with the resolved config when DSN is present", () => {
    const init = vi.fn();
    const outcome = initSentry(
      {
        NEXT_PUBLIC_SENTRY_DSN: "https://x@o.ingest/1",
        NEXT_PUBLIC_SENTRY_ENV: "staging",
        NEXT_PUBLIC_GIT_SHA: "abc1234",
      },
      init,
    );
    expect(outcome).toBe("initialized");
    expect(init).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledWith({
      dsn: "https://x@o.ingest/1",
      environment: "staging",
      release: "abc1234",
      tracesSampleRate: 0,
    });
  });

  it("is idempotent — second call short-circuits with 'already-initialized'", () => {
    const init = vi.fn();
    const env = { NEXT_PUBLIC_SENTRY_DSN: "https://x@o.ingest/1" };
    expect(initSentry(env, init)).toBe("initialized");
    expect(initSentry(env, init)).toBe("already-initialized");
    expect(init).toHaveBeenCalledTimes(1);
  });
});
