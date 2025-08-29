/**
 * figmaV4/runtime/persistence.ts
 * Load/save for v4 JSON
 */
import type { Project } from '../core/types';
import { nowISO, createEmptyProject } from '../core/schema';

export function loadProject(json: any): Project {
  if (!json || json.meta?.version !== 'v4') {
    const p = createEmptyProject();
    return p;
  }
  return json as Project;
}

export function saveProject(project: Project): Project {
  return { ...project, meta: { ...project.meta, updatedAt: nowISO() } };
}
