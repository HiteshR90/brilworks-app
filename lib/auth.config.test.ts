import { describe, expect, it } from "vitest";
import { authConfig } from "./auth.config";
import type { Session } from "next-auth";
import type { NextRequest } from "next/server";

interface AuthorizedArgs {
  auth: Session | null;
  request: NextRequest;
}

function buildRequest(pathname: string): NextRequest {
  return {
    nextUrl: new URL(`https://example.test${pathname}`),
  } as unknown as NextRequest;
}

function buildSession(email = "user@example.test"): Session {
  return {
    user: { name: null, email, image: null },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  } as Session;
}

describe("authConfig.authorized", () => {
  const authorized = authConfig.callbacks!.authorized!;

  it("allows non-protected routes for anonymous visitors", () => {
    const result = authorized({
      auth: null,
      request: buildRequest("/"),
    } as AuthorizedArgs);
    expect(result).toBe(true);
  });

  it("allows /hello for signed-in users", () => {
    const result = authorized({
      auth: buildSession(),
      request: buildRequest("/hello"),
    } as AuthorizedArgs);
    expect(result).toBe(true);
  });

  it("redirects anonymous /hello visits to /signin with a callbackUrl", () => {
    const result = authorized({
      auth: null,
      request: buildRequest("/hello/foo"),
    } as AuthorizedArgs);

    expect(result).toBeInstanceOf(Response);
    const response = result as Response;
    expect(response.status).toBe(302);
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("/signin");
    expect(location).toContain("callbackUrl=%2Fhello%2Ffoo");
  });
});
