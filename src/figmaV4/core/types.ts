/**
 * figmaV4/core/types.ts
 * Core public types for v4 editor - CNode + StyleGraph + Project + UI
 */

export type CNodeId = string;
export type ComponentId = string;

export type CNode = {
  id: CNodeId;
  componentId: ComponentId;
  props: Record<string, unknown>;
  classList?: string[];
  styleRefs?: string[];
  children: CNodeId[];
  locked?: boolean;
  visible?: boolean;
};

export type VariantDimId = 'screen' | 'theme' | 'state' | string;
export type VariantValue = string;
export type VariantMap = Partial<Record<VariantDimId, VariantValue>>;

/** StyleGraph types */
export type Selector =
  | { by: 'node';      ref: CNodeId }
  | { by: 'class';     ref: string }
  | { by: 'component'; ref: ComponentId };

export type TokenRef = { token: string };
export type DeclarationValue = string | number | TokenRef;
export type Declaration = Record<string, DeclarationValue>;

export type StyleRule = {
  id: string;
  selector: Selector;
  conditions: VariantMap;      // e.g., { screen:'mobile', theme:'dark' }
  declarations: Declaration;
  specificity?: number;
};

export type StyleSheet = {
  id: string;
  name: string;
  rules: StyleRule[];
};

export type Token = {
  id: string;
  type: 'color' | 'space' | 'font' | 'radius' | 'shadow' | 'z' | 'size' | string;
  value: any;
};

export type Page = { id: string; name: string; path: string; rootId: CNodeId; layout?: string };
export type Fragment = { id: string; name: string; rootId: CNodeId };

export type Project = {
  id: string;
  name: string;
  slug: string;
  meta: { version: 'v4'; createdAt: string; updatedAt: string };

  routing: {
    pages: Page[];
    fragments: Fragment[];
    entryPageId: string;
  };

  nodes: Record<CNodeId, CNode>;
  stylesheets: StyleSheet[];
  tokens?: Token[];
  themes?: { id: string; name: string; tokensOverride?: Record<string, any> }[];

  flows?: Record<string, unknown>;
  data?: Record<string, unknown>;
  assets?: { id: string; kind: 'image'|'font'|'icon'; url: string; meta?: any }[];

  branches?: { id: string; name: string; base?: string }[];
  snapshots?: { id: string; title?: string; at: string; note?: string }[];
  reviews?: { id: string; url: string; branchId: string; expiresAt?: string }[];
};

export type EditorUI = {
  canvas: { width: number; height: number; zoom: number; orientation: 'portrait'|'landscape' };
  variants: VariantMap;   // { screen:'base', theme:'light', state?:'hover' ... }
  selection: CNodeId | null;
};

export type EditorState = {
  project: Project;
  ui: EditorUI;
};
