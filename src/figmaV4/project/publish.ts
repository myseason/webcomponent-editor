/**
 * figmaV4/project/publish.ts
 * Build/deploy orchestrator stubs.
 */

export type PublishResult = { ok: boolean; artifactPath?: string; log?: string[] };

export async function buildStatic(): Promise<PublishResult> {
  // TODO: implement codegen + bundling
  return { ok: true, artifactPath: 'dist/static', log: ['Static build stub executed.'] };
}
