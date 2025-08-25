/* SSOT: 모든 타입은 본 파일에서만 정의/수출합니다. (any 사용 금지) */
export type NodeId = string;

export type CSSDict = Record<string, unknown>;
export interface StyleBase {
  element?: CSSDict;
}

export interface Node<P extends Record<string, unknown> = Record<string, unknown>, S extends StyleBase = StyleBase> {
  id: NodeId;
  componentId: string;
  props: P;
  styles: S;
  children?: NodeId[];
  locked?: boolean;
}

export interface Page {
  id: string;
  name: string;
  rootId: NodeId;
  slug?: string;
}

export interface Fragment {
  id: string;
  name: string;
  rootId: NodeId;
}

export interface Project {
  pages: Page[];
  fragments: Fragment[];
  nodes: Record<NodeId, Node>;
  rootId: NodeId; // 현재 표시 중인 페이지 root
}

export interface EditorUI {
    selectedId: NodeId | null;
    canvasWidth: number;
    overlays: string[];          // 열린 fragmentId 스택 (상단이 top-most)
}

export interface BindingScope {
  data: Record<string, unknown>;
  node: Node | null;
  project: Project | null;
}

export type SupportedEvent = 'onClick' | 'onChange' | 'onSubmit' | 'onLoad';

export type ActionStep =
  | { kind: 'Alert'; message: string }
  | { kind: 'SetData'; path: string; value: unknown }
  | { kind: 'SetProps'; nodeId: NodeId; patch: Record<string, unknown> }
  | { kind: 'Http'; method: 'GET' | 'POST'; url: string; body?: unknown; headers?: Record<string, string> }
  | { kind: 'Emit'; topic: string; payload?: unknown }
  | { kind: 'Navigate'; toPageId: string }
  | { kind: 'OpenFragment'; fragmentId: string }
  | { kind: 'CloseFragment'; fragmentId?: string };

export interface ActionSpec {
  steps: ActionStep[];
}

export interface FlowEdge {
  id?: string;
  from: { nodeId: NodeId; event: SupportedEvent };
  when?: { expr: string };
  to:
    | { kind: 'Navigate'; toPageId: string }
    | { kind: 'OpenFragment'; fragmentId: string }
    | { kind: 'CloseFragment'; fragmentId?: string };
}

export interface EditorState {
  project: Project;
  ui: EditorUI;
  data: Record<string, unknown>;
  settings: Record<string, unknown>;
  flowEdges: Record<string, FlowEdge>;
}

/** 컴포넌트 정의(렌더러는 UI 레이어에서 결합) */
export type PropSchemaEntry<P extends Record<string, unknown>> =
  | { key: keyof P & string; type: 'text'; label?: string; placeholder?: string; default?: unknown; when?: Record<string, unknown> }
  | { key: keyof P & string; type: 'select'; label?: string; options: { label: string; value: unknown }[]; default?: unknown; when?: Record<string, unknown> };

export interface ComponentDefinition<
  P extends Record<string, unknown> = Record<string, unknown>,
  S extends StyleBase = StyleBase
> {
  id: string;
  title: string;
  defaults: { props: Partial<P>; styles: Partial<S> };
  propsSchema?: Array<PropSchemaEntry<P>>;
  // Render는 UI 레이어에서 결합합니다. (React 의존 방지)
}