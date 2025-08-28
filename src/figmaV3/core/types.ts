/* SSOT: 모든 타입은 본 파일에서만 정의/수출합니다. (any 사용 금지) */

// =======================================================================
// │                                                                     │
// │   1. Core Data Models                                               │
// │   프로젝트의 핵심 데이터(노드, 페이지, 스타일)를 정의합니다.          │
// │                                                                     │
// =======================================================================

export type NodeId = string;

export type CSSDict = Record<string, string | number | undefined>;

export type Viewport = 'base' | 'tablet' | 'mobile';

export interface StyleBase {
    element?: Partial<Record<Viewport, CSSDict>>;
}

export interface Node<
    P extends Record<string, unknown> = Record<string, unknown>,
    S extends StyleBase = StyleBase
> {
    id: NodeId;
    componentId: string;
    props: P;
    styles: S;
    children?: NodeId[];
    locked?: boolean;
    isVisible?: boolean;
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

export interface Stylesheet {
    id: string;
    name: string;
    source: 'url' | 'inline';
    url?: string;
    content?: string;
    enabled: boolean;
}

export type ComponentSchemaOverrides = Record<string, PropSchemaEntry[]>;

export interface Project {
    pages: Page[];
    fragments: Fragment[];
    nodes: Record<NodeId, Node>;
    rootId: NodeId;
    schemaOverrides?: ComponentSchemaOverrides;
    templates?: Record<TemplateId, TemplateDefinition>;
    inspectorFilters?: Record<string, InspectorFilter>;
    tagPolicies?: TagPolicyMap;
    stylesheets?: Stylesheet[];
}

// =======================================================================
// │                                                                     │
// │   2. Component & Template Definitions                               │
// │   컴포넌트의 기본 구조와 정책, 템플릿을 정의합니다.                 │
// │                                                                     │
// =======================================================================

export type CommonMeta = {
    __name?: string;
    __slotId?: string;
    __tag?: string;
    __tagAttrs?: Record<string, string>;
};

export type PropSchemaEntry<P extends Record<string, unknown> = Record<string, unknown>> =
    | {
    key: keyof P & string;
    type: 'text';
    label?: string;
    placeholder?: string;
    default?: unknown;
    when?: Record<string, unknown>;
    whenExpr?: string;
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

export interface ComponentCapabilities {
    allowedTags: string[];
    defaultTag: string;
    baseTagPolicy?: Record<string, TagPolicy>;
    canHaveChildren?: boolean;
}

export interface ComponentDefinition<
    P extends Record<string, unknown> = Record<string, unknown>,
    S extends StyleBase = StyleBase
> {
    id: string;
    title: string;
    defaults: { props: Partial<P>; styles: Partial<S> };
    propsSchema?: Array<PropSchemaEntry<P>>;
    capabilities?: ComponentCapabilities;
}

export type TemplateId = string;

export interface InspectorFilter {
    props?:  { allow?: string[]; deny?: string[] };
    styles?: { allow?: string[]; deny?: string[] };
    actions?: { allowEvents?: SupportedEvent[] };
    flows?:   { allowKinds?: Array<'Navigate'|'OpenFragment'|'CloseFragment'> };
    bindings?: { allow?: string[] };
}

export interface TemplateDefinition {
    id: TemplateId;
    baseDefId: string;
    title: string;
    defaults?: { props?: Record<string, unknown>; styles?: CSSDict };
    schemaOverride?: PropSchemaEntry[];
    inspectorFilter?: InspectorFilter;
    actionPresets?: Partial<Record<SupportedEvent, ActionSpec>>;
    flowPresets?: FlowEdge[];
    capabilityDelta?: {
        allowedTagsRestrict?: string[];
        tagPolicyDelta?: { [tag: string]: {
                dropAttributes?: string[];
                dropStyleAllows?: string[];
                addStyleDenies?: string[];
            }};
    };
}

export interface TagPolicy {
    allowedAttributes: string[];
    styles?: { allow?: string[]; deny?: string[] };
    isVoid?: boolean;
}

export type TagPolicyMap = Record<string, TagPolicy>;

export type BaseDefTagWhitelist = Record<string, string[]>;

// =======================================================================
// │                                                                     │
// │   3. Actions & Flows                                                │
// │   사용자 상호작용과 동적 로직을 정의합니다.                         │
// │                                                                     │
// =======================================================================

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

export interface BindingScope {
    data: Record<string, unknown>;
    node: Node | null;
    project: Project | null;
}

// =======================================================================
// │                                                                     │
// │   4. Editor State & UI Models                                       │
// │   에디터의 상태와 UI 관련 구조를 정의합니다.                        │
// │                                                                     │
// =======================================================================

export type EditorMode = 'Page' | 'Component';
export type LeftTabKind = 'Explorer' | 'Composer';
export type ExplorerPreviewSel = { kind: 'page' | 'component'; id: string } | null;
export type BottomRightPanelKind = 'SchemaEditor' | 'PropVisibility' | 'Logs' | 'None';

export interface EditorUI {
    // --- Global State ---
    selectedId: NodeId | null;
    mode: EditorMode;
    expertMode: boolean;
    overlays: string[];

    // --- Center Panel (Canvas) ---
    canvas: {
        width: number;
        height: number; // ✅ [추가] 캔버스 세로 높이
        zoom: number;
        orientation: 'portrait' | 'landscape'; // ✅ [추가] 가로/세로 모드
        activeViewport: Viewport;
    };

    // --- Side Panels ---
    panels: {
        left: {
            tab: LeftTabKind;
            widthPx: number;
            splitPct: number;
            explorerPreview: ExplorerPreviewSel | null;
        };
        right: {
            widthPx: number;
        };
        bottom: {
            heightPx: number;
            right: number,
            isCollapsed?: boolean; // ✅ [추가] 하단 패널 접힘 상태
            advanced: {
                open: boolean;
                kind: BottomRightPanelKind;
                widthPct: number;
            } | null;
        };
    };
}

export interface EditorState {
    project: Project;
    ui: EditorUI;
    data: Record<string, unknown>;
    settings: Record<string, unknown>;
    flowEdges: Record<string, FlowEdge>;
    history: {
        past: Project[];
        future: Project[];
    };
}

// =======================================================================
// │                                                                     │
// │   5. Utility & Meta Types                                           │
// │   보조적인 유틸리티 및 메타데이터 타입을 정의합니다.                 │
// │                                                                     │
// =======================================================================
// ... (이하 동일)
export interface PropVisibilityOverride {
    whenExpr?: string;
}
export type PropVisibilityMap = Record<string, PropVisibilityOverride>;
export type NodePropsWithMeta = Record<string, unknown> & { __propVisibility?: PropVisibilityMap; } & CommonMeta;
export type DndDragType = 'palette-component' | 'canvas-node' | 'layers-node';
export type DropPosition = 'inside' | 'before' | 'after';
export interface DndDragPayloadPalette { kind: 'palette-component'; defId: string; }
export interface DndDragPayloadNode { kind: 'canvas-node' | 'layers-node'; nodeId: NodeId; }
export type DndDragPayload = DndDragPayloadPalette | DndDragPayloadNode;
export interface DndDropTarget { nodeId: NodeId; position: DropPosition; }