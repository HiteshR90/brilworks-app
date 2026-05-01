export type DeployEnv = "production" | "preview" | "development" | "unknown";

export interface DeployInfo {
  commitSha: string | null;
  commitShaShort: string | null;
  deploymentId: string | null;
  region: string | null;
  env: DeployEnv;
}

export interface HealthStatus {
  ok: true;
  deploy: DeployInfo;
}

type DeploySource = Readonly<Record<string, string | undefined>>;

function normaliseEnv(value: string | undefined): DeployEnv {
  if (value === "production" || value === "preview" || value === "development") {
    return value;
  }
  return "unknown";
}

export function readDeployInfo(source: DeploySource = process.env): DeployInfo {
  const sha = source.VERCEL_GIT_COMMIT_SHA ?? null;
  return {
    commitSha: sha,
    commitShaShort: sha ? sha.slice(0, 7) : null,
    deploymentId: source.VERCEL_DEPLOYMENT_ID ?? null,
    region: source.VERCEL_REGION ?? null,
    env: normaliseEnv(source.VERCEL_ENV),
  };
}

export function getHealth(source: DeploySource = process.env): HealthStatus {
  return {
    ok: true,
    deploy: readDeployInfo(source),
  };
}
