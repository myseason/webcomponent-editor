/**
 * figmaV4/core/schema.ts
 * zod-like minimal runtime validation (placeholder) + default builders.
 * Replace with zod if available in your stack.
 */

export const nowISO = () => new Date().toISOString();

import type { Project, CNode, CNodeId, Page } from './types';

export function createEmptyProject(): Project {
  const rootId: CNodeId = 'root';
  const root: CNode = {
    id: rootId,
    componentId: 'Box',
    props: {},
    children: [],
  };
  const page: Page = { id: 'page-home', name: 'Home', path: '/', rootId };

  return {
    id: 'proj-1',
    name: 'Untitled',
    slug: 'untitled',
    meta: { version: 'v4', createdAt: nowISO(), updatedAt: nowISO() },
    routing: { pages: [page], fragments: [], entryPageId: page.id },
    nodes: { [rootId]: root },
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
}
