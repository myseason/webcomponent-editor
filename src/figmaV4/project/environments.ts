/**
 * figmaV4/project/environments.ts
 * Helpers for environment management.
 */
import type { EnvironmentConfig } from '../core/types';

/** Only expose PUBLIC_ prefixed variables to client */
export function publicVars(env: EnvironmentConfig | undefined): Record<string,string> {
  const out: Record<string,string> = {};
  if (!env) return out;
  for (const k in env.variables) {
    if (k.startsWith('PUBLIC_')) out[k] = env.variables[k];
  }
  return out;
}
