/* SSOT: 모든 타입은 본 파일에서만 정의/수출합니다. (any 사용 최소화) */
/* =============================================================================
   1. Core Data Models
   프로젝트의 핵심 데이터(노드, 페이지, 스타일)를 정의합니다.
============================================================================= */
export type NodeId = string;
export type PageId = string;
export type CSSDict = Record<string, unknown>;

/** V3는 'base' | 'tablet' | 'mobile' 3-뷰포트로 운용합니다. */
export const VIEWPORTS = ['base', 'tablet', 'mobile']; // base -> desktop
export type Viewport = 'base' | 'tablet' | 'mobile';

/** 스타일 컨테이너 (필요 시 확장) */
export interface StyleBase {
    element?: Partial<Record<Viewport, CSSDict>>;
}

/** 에디터에서 다루는 노드(컴포넌트 인스턴스) */
export interface Node<
    P extends Record<string, unknown> = Record<string, unknown>,
    S extends StyleBase = StyleBase
> {
    id: NodeId;
    componentId: string;
    parentId?: NodeId;
    props: P;
    styles: S;
    children?: NodeId[];
    locked?: boolean;
    isVisible?: boolean;
}

/** 페이지 / 프래그먼트 */
export interface Page {
    id: string;
    name: string;
    description?: string;
    rootId: NodeId;
    slug?: string;
}

export interface Fragment {
    id: string;
    name: string;
    description?: string;
    rootId: NodeId;
    isPublic?: boolean; // ✨ [추가] 공개/비공개 여부 플래그
}

/** 외부/인라인 스타일시트(프로젝트 수준) */
export interface Stylesheet {
    id: string;
    name: string;
    source: 'url' | 'inline';
    url?: string;
    content?: string;
    enabled: boolean;
}

export interface Asset {
    id: string;
    name: string;
    url: string; // Data URL 또는 원격 URL
    type: 'image' | 'video' | 'font' | 'script';
}


export type ComponentSchemaOverrides = Record<
    string,
    Array<PropSchemaEntry<any, any>>
>;

/** 프로젝트 전체 스냅샷 */
export interface Project {
    pages: Page[];
    fragments: Fragment[];
    nodes: Record<NodeId, Node>;
    rootId: NodeId;
    assets?: Asset[];
    globalCss?: string;
    globalJs?: string;
    schemaOverrides?: ComponentSchemaOverrides;
    templates?: Record<string, TemplateDefinition>;
    inspectorFilters?: Record<string, InspectorFilter>;
    tagPolicies?: TagPolicyMap;
    stylesheets?: Stylesheet[];
    policies?: ProjectSettingsPoliciesOverride;
}

/* =============================================================================
   2. Policy Definitions (정책 시스템)
   Inspector, 런타임, Export의 동작을 제어하는 정책을 정의합니다.
============================================================================= */
/** Inspector의 서브그룹(= StyleGroup) 키 — UI에 보이는 그룹과 1:1 매칭 */
export type StyleGroupKey =
    | 'displayFlow'   // Display & Flow
    | 'position'      // Position
    | 'sizing'        // Sizing
    | 'spacing'       // Spacing
    | 'typography'    // Typography
    | 'border'        // Border
    | 'background'    // Background
    | 'effects'       // Effects
    | 'interactivity' // Interactivity
    | 'advanced';     // Advanced

export type StyleKey = string; // 정규화된 CSS 키(flat)
//export type TagName = 'div'|'span'|'img'|'button'|'a'|'p'|'h1'|'h2'|'h3'|'ul'|'li'; // 최소 셋
export type TagName = string;

/** 그룹/컨트롤 가시성 오버레이(Inspector에서 보이기/숨기기 제어) */
export type StylePolicy = Partial<Record<StyleGroupKey,
    {
        /** 그룹(섹션) 자체의 노출 여부 */
        visible?: boolean;
        /** 그룹 내 개별 컨트롤의 노출 여부 (flat style key 기준) */
        controls?: Record<StyleKey, { visible?: boolean }>;
    }
 >>;
/** 전역 태그 정책 */
export type TagPolicy = {
    /** 전체 허용 태그 + 기본 태그 */
    allowedTags: TagName[];
    defaultTag: TagName;

    /** 태그별 허용 서브그룹(Inspector 그룹) */
    allowedSectionsByTag: Record<TagName, StyleGroupKey[]>;

    /** 태그별 허용/금지 스타일 키 (deny 우선) */
    styleAllowByTag?: Partial<Record<TagName, StyleKey[]>>;
    styleDenyByTag?: Partial<Record<TagName, StyleKey[]>>;

    /** 속성/이벤트 화이트리스트 (선택) */
    attrsByTag?: Partial<Record<TagName, string[]>>;
    eventsByTag?: Partial<Record<TagName, string[]>>;

    /** 컨테이너 태그 (이 프로젝트는 div로 고정) */
    containerTag: 'div';
};

/** 전역 스타일 정책 (검증/메타/프리셋 연결) */
export type GlobalStylePolicy = {
    /** 글로벌 허용/금지 (deny 우선) */
    allow?: StyleKey[];
    deny?: StyleKey[];

    /** 태그별 허용/금지 */
    byTag?: { [tag in TagName]?: { allow?: StyleKey[]; deny?: StyleKey[] } };

    /** 스타일 키 메타 (타입/단위/토큰/프리셋/클램프 등) */
    meta?: Record<StyleKey, {
        type: 'length'|'number'|'enum'|'color'|'string'|'ratio';
        enum?: string[];
        min?: number; max?: number; step?: number;
        unit?: Array<'px'|'%'|'em'|'rem'|'vh'|'vw'>;
        tokens?: string[];   // 디자인 토큰 키
        preset?: string[];   // 프리셋 이름(그림자/필터 등)
    }>;
};

/** 컴포넌트별 정책 (컴포넌트 개발자가 Inspector 노출 범위를 제한) */
export type ComponentPolicy = {
    version: '1.1';
    component: string;   // 컴포넌트 정의 ID
    tag: TagName;        // 기본 태그
    inspector?: StylePolicy;                 // 그룹/컨트롤 가시성
    defaults?: Record<string, any>;          // 기본 값 (선택)
    runtime?: Record<string, any>;           // 런타임 파라미터 (선택)
    savePolicy?: Record<string, any>;        // 영속화용 추가 메타 (선택)
};

/** NodeLike — 런타임 판단에 필요한 최소 필드 */
export type NodeLike = {
    id: string;
    componentId?: string;
    props?: Record<string, any>;
    styles?: Record<string, any>;
};

/** Project/UI 최소 스텁 — runtime(capabilities)에서 사용 */
export type ProjectLike = {
    nodes?: Record<string, NodeLike>;
    policies?: {
        components?: Record<string, ComponentPolicy>;
        tag?: TagPolicy;
        style?: GlobalStylePolicy;
    };
};

export type UIStateLike = {
    /** 'page' | 'component' */
    mode: EditorMode;
    /** 페이지 모드에서 '고급'인지 여부 (고급이면 ComponentPolicy 무시) */
    expertMode?: boolean;
    /** 현재 선택된 노드 ID(선택) */
    selectedId?: string | null;
};

export interface EffectivePolicies {
    tag: Record<string, TagPolicy>;
    style: StylePolicy;
    components?: Record<string, ComponentPolicy>;
}

export interface ProjectSettingsPoliciesOverride {
    tag?: Partial<EffectivePolicies['tag']>;
    style?: Partial<StylePolicy>;
    components?: Partial<EffectivePolicies['components']>;
}


/* =============================================================================
   3. Component & Template Definitions
   컴포넌트의 기본 구조와 정책, 템플릿을 정의합니다.
============================================================================= */

export type CommonMeta = {
    __name?: string;
    __slotId?: string;
    __tag?: string;
    __tagAttrs?: Record<string, unknown>;
};

export type PropSchemaEntry<
    P extends Record<string, unknown> = Record<string, unknown>,
    K extends keyof P & string = keyof P & string
> =
    | {
    key: K;
    type: 'text';
    label?: string;
    placeholder?: string;
    default?: unknown;
    when?: Record<string, unknown>;
    whenExpr?: string;
}
    | {
    key: K;
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
    defaults: {
        props: Partial<P>;
        styles: Partial<S>;
    };
    propsSchema?: Array<PropSchemaEntry<P, any>>;
    capabilities?: ComponentCapabilities;
}

export type TemplateId = string;

export interface InspectorFilter {
    props?: { allow?: string[]; deny?: string[] };
    styles?: { allow?: string[]; deny?: string[] };
    actions?: { allowEvents?: SupportedEvent[] };
    flows?: { allowKinds?: Array<'Navigate' | 'OpenFragment' | 'CloseFragment'> };
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
        tagPolicyDelta?: {
            [tag: string]: {
                dropAttributes?: string[];
                dropStyleAllows?: string[];
                addStyleDenies?: string[];
            };
        };
    };
}

export type TagPolicyMap = Record<string, {
    allowedAttributes: string[];
    styles?: { allow?: string[]; deny?: string[] };
    isVoid?: boolean;
}>;
export type BaseDefTagWhitelist = Record<string, string[]>;

/* =============================================================================
   4. Actions & Flows
   사용자 상호작용과 동적 로직을 정의합니다.
============================================================================= */

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

/* =============================================================================
   5. Editor State & UI Models
   에디터의 상태와 UI 관련 구조를 정의합니다.
============================================================================= */
// 개발 모드
export type EditorMode = 'Page' | 'Component';

export type LeftTabKind = 'Explorer' | 'Composer';
export type ExplorerPreviewSel =
    | { kind: 'page' | 'component'; id: string }
    | null;

export type BottomRightPanelKind = 'SchemaEditor' | 'PropVisibility' | 'Logs' | 'None';

export type ViewportMode = 'Unified' | 'Independent';

export type ProjectHubTab = 'Pages' | 'Assets' | 'Components' | 'Layers' | 'Settings';
export interface EditorUI {
    // --- Global ---
    selectedId: NodeId | null;
    mode: EditorMode;
    expertMode: boolean;
    overlays: string[];
    editingFragmentId: string | null;
    notification: { message: string; timestamp: number } | null;
    // --- Inspector (옵션) ---
    // Page 모드에서 "TagPolicy 전부 허용 보기" 같은 임시 토글 저장용
    inspector?: {
        /** Page 모드에서 TagPolicy가 허용하는 모든 스타일/속성 노출 */
        forceTagPolicy?: boolean;
    };
    // --- Center Panel (Canvas) ---
    canvas: {
        width: number;
        height: number;
        zoom: number;
        orientation: 'portrait' | 'landscape';
        activeViewport: Viewport;
        baseViewport: Viewport;
        viewportMode: Record<Viewport, ViewportMode>;
    };

    // --- Side Panels ---
    panels: {
        left: {
            activeHubTab: ProjectHubTab;
            widthPx: number;
            lastActivePageId: string | null;
            lastActiveFragmentId: string | null;
            isSplit: boolean;
            splitPercentage: number;
        };
        right: { widthPx: number };
        bottom: {
            heightPx: number;
            right?: number;
            isCollapsed?: boolean;
            advanced: { open: boolean; kind: BottomRightPanelKind; widthPct: number } | null;
        };
    };
}


export interface EditorState {
    project: Project;
    ui: EditorUI;
    data: Record<string, unknown>;
    settings: Record<string, unknown>;
    flowEdges: Record<string, FlowEdge>;
    history: { past: Project[]; future: Project[] };
}

/* =============================================================================
   6. Utility & Meta Types
============================================================================= */
export interface PropVisibilityOverride {
    whenExpr?: string;
}
export type PropVisibilityMap = Record<string, PropVisibilityOverride>;

export type NodePropsWithMeta = Record<string, unknown> &
    { __propVisibility?: PropVisibilityMap } &
    CommonMeta;

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

export type CSSDecl = Record<string, unknown>;

export const VOID_TAGS: ReadonlySet<string> = new Set([
    'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'
]);
