/* SSOT: 모든 타입은 본 파일에서만 정의/수출합니다. (any 사용 금지) */
export type NodeId = string;

export type CSSDict = Record<string, unknown>;
export interface StyleBase {
  element?: CSSDict;
}

/** 컴포넌트 정의(렌더러는 UI 레이어에서 결합) */
export type PropSchemaEntry<P extends Record<string, unknown> = Record<string, unknown>> =
    | {
    key: keyof P & string;
    type: 'text';
    label?: string;
    placeholder?: string;
    default?: unknown;
    when?: Record<string, unknown>;   // 기존: 단순 동등 비교
    whenExpr?: string;                // 신설: 안전 표현식 (data/node/project 사용)
}
    | {
    key: keyof P & string;
    type: 'select';
    label?: string;
    options: { label: string; value: unknown }[];
    default?: unknown;
    when?: Record<string, unknown>;
    whenExpr?: string;
};

// ──────────────────────────────────────────────────────────────────────────────
// 컴포넌트 스키마 오버라이드 (프로젝트 단위)
// ──────────────────────────────────────────────────────────────────────────────
export type ComponentSchemaOverrides = Record<string, PropSchemaEntry[]>;

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
/** Project에 스키마 오버라이드 보관(선언만 추가) */
declare module './types' {} // (모듈 경로 보정 필요 시 제거)

export interface Project {
  pages: Page[];
  fragments: Fragment[];
  nodes: Record<NodeId, Node>;
  rootId: NodeId; // 현재 표시 중인 페이지 root
  /** 컴포넌트 정의(propsSchema) 오버라이드 — key: defId */
  schemaOverrides?: ComponentSchemaOverrides;
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

// ──────────────────────────────────────────────────────────────────────────────
// Props 가시성(Visibility) 오버라이드 메타 (노드별)
// ──────────────────────────────────────────────────────────────────────────────

/** 특정 프로퍼티를 노드 인스턴스 단위로 표시/비표시 제어하기 위한 오버라이드 */
export interface PropVisibilityOverride {
    /** 안전 표현식 whenExpr (data/node/project 컨텍스트에서 평가) */
    whenExpr?: string;
}

/**
 * 컴포넌트 인스턴스의 props에 선택적으로 포함되는 메타 컨테이너.
 * - key: prop key
 * - value: PropVisibilityOverride
 *
 * 저장 위치(권장): node.props.__propVisibility
 */
export type PropVisibilityMap = Record<string, PropVisibilityOverride>;

/** props에 메타가 포함된 경우를 위한 유틸 타입(접근 시 캐스트에 사용) */
export type NodePropsWithMeta = Record<string, unknown> & {
    __propVisibility?: PropVisibilityMap;
};

// ──────────────────────────────────────────────────────────────────────────────
// DnD(드래그 앤 드롭) 사전 타입 — 구현은 추후
// ──────────────────────────────────────────────────────────────────────────────
export type DndDragType = 'palette-component' | 'canvas-node' | 'layers-node';
export type DropPosition = 'inside' | 'before' | 'after';

export interface DndDragPayloadPalette {
    kind: 'palette-component';
    defId: string;
}

export interface DndDragPayloadNode {
    kind: 'canvas-node' | 'layers-node';
    nodeId: NodeId;
}

export type DndDragPayload = DndDragPayloadPalette | DndDragPayloadNode;

export interface DndDropTarget {
    nodeId: NodeId;
    position: DropPosition;
}

export interface DndApi {
    /** 드래그 시작(전역 1개만 활성) */
    beginDrag(payload: DndDragPayload): void;
    /** 현재 호버 대상 업데이트 */
    hover(target: DndDropTarget | null): void;
    /** 드래그 종료(드롭 or 취소). 내부에서 addByDef/addByDefAt 등 호출 예정 */
    endDrag(): void;
}