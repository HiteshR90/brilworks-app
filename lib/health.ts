export interface DeployInfo {
  commitSha: string | null;
  commitShaShort: string | null;
  runId: string | null;
  ref: string | null;
  builtAt: string;
}

export interface HealthStatus {
  ok: true;
  deploy: DeployInfo;
}

type EnvSource = Readonly<Record<string, string | undefined>>;

export function readDeployInfo(
  env: EnvSource = process.env,
  now: () => Date = () => new Date(),
): DeployInfo {
  const sha = env.GITHUB_SHA ?? null;
  return {
    commitSha: sha,
    commitShaShort: sha ? sha.slice(0, 7) : null,
    runId: env.GITHUB_RUN_ID ?? null,
    ref: env.GITHUB_REF_NAME ?? null,
    builtAt: now().toISOString(),
  };
}

export function getHealth(
  env: EnvSource = process.env,
  now: () => Date = () => new Date(),
): HealthStatus {
  return { ok: true, deploy: readDeployInfo(env, now) };
}
