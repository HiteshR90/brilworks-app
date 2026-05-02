"use client";

import { useEffect } from "react";
import { initSentry } from "@/lib/sentry";

export function SentryInit() {
  useEffect(() => {
    initSentry({
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
      NEXT_PUBLIC_SENTRY_ENV: process.env.NEXT_PUBLIC_SENTRY_ENV,
      NEXT_PUBLIC_GIT_SHA: process.env.NEXT_PUBLIC_GIT_SHA,
    });
  }, []);

  return null;
}
