import * as Sentry from "@sentry/react";

export interface SentryConfig {
  dsn: string;
  environment: string;
  release: string | undefined;
  tracesSampleRate: number;
}

type EnvSource = Readonly<Record<string, string | undefined>>;

export function readSentryConfig(env: EnvSource): SentryConfig | null {
  const dsn = env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return null;
  const sha = env.NEXT_PUBLIC_GIT_SHA;
  return {
    dsn,
    environment: env.NEXT_PUBLIC_SENTRY_ENV ?? "staging",
    release: sha && sha.length > 0 ? sha : undefined,
    tracesSampleRate: 0,
  };
}

export type InitOutcome = "initialized" | "no-dsn" | "already-initialized";

let initialized = false;

export function initSentry(
  env: EnvSource,
  init: (cfg: SentryConfig) => void = (cfg) => {
    Sentry.init({
      dsn: cfg.dsn,
      environment: cfg.environment,
      release: cfg.release,
      tracesSampleRate: cfg.tracesSampleRate,
    });
  },
): InitOutcome {
  if (initialized) return "already-initialized";
  const cfg = readSentryConfig(env);
  if (!cfg) return "no-dsn";
  init(cfg);
  initialized = true;
  return "initialized";
}

export function __resetSentryInitForTests(): void {
  initialized = false;
}
