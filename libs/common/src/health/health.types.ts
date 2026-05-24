/**
 * Per-service readiness probe. Each service can supply zero or more probes
 * (e.g. notify probes the iam gRPC client). A probe returns the dependency
 * name plus its status; the controller aggregates them.
 */
export interface ReadinessProbe {
  name: string;
  check(): Promise<{ ok: boolean; detail?: string }>;
}

export const READINESS_PROBES = 'READINESS_PROBES';
