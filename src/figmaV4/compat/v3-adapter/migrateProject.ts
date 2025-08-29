/**
 * figmaV4/compat/v3-adapter/migrateProject.ts
 * Minimal stub to migrate v3 project to v4.
 */
import type { Project, CNode, CNodeId, StyleRule, StyleSheet } from '../../core/types';

export function migrateV3ToV4(v3: any): Project {
  // NOTE: stub — implement detailed mapping later.
  const nodes: Record<CNodeId, CNode> = {};
  const rootId: CNodeId = 'root';
  nodes[rootId] = { id: rootId, componentId: 'Box', props: {}, children: [] };
  const v4: Project = {
    id: 'migrated',
    name: v3?.name || 'Migrated',
    slug: 'migrated',
    meta: { version: 'v4', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    routing: { pages: [{ id:'page-home', name:'Home', path:'/', rootId }], fragments: [], entryPageId:'page-home' },
    nodes,
    stylesheets: [],
    tokens: [],
    themes: [],
    flows: {},
    data: {},
    assets: [],
    branches: [],
    snapshots: [],
    reviews: [],
  };
  // TODO: map v3 node.styles.element[viewport] → StyleRule per viewport
  return v4;
}
