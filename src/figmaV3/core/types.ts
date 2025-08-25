/* SSOT: 모든 타입은 본 파일에서만 정의/수출합니다. (any 사용 금지) */

export type NodeId = string;

/** 간단한 인라인 CSS 딕셔너리 */
export type CSSDict = Record<string, string | number | undefined>;

export interface StyleBase {
    element?: CSSDict;
}


/**
 * 공통 메타(인스턴스 공통 속성)
 * - __name: 에디터 표시명
 * - __slotId: 부모 슬롯 식별자
 * - __tag: 출력 시 사용할 태그명(허용 태그 내에서만 선택 가능)
 * - __tagAttrs: 태그 속성 key/value (TagPolicy.allowedAttributes 내에서만)
 */
export type CommonMeta = {
    __name?: string;
    __slotId?: string;
    __tag?: string;
    __tagAttrs?: Record<string, string>;
};


/**
 * 스키마 항목(PropsAutoSection 자동 생성 기준)
 * - when: 단순 동등비교 기반 표시 조건
 * - whenExpr: 안전 표현식(브라우저 내 파서로 평가; data/node/project 접근 허용)
 */
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

/** 컴포넌트 정의(렌더러는 UI 레이어에서 결합: React 의존 방지) */
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
    propsSchema?: Array<PropSchemaEntry<P>>;
    /** ✅ 컴포넌트 레벨 capability(권장) */
    capabilities?: ComponentCapabilities;
}

/** 노드(페이지 트리의 원자 요소) */
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
}

/** 페이지/프래그먼트/프로젝트 */
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

/** 프로젝트 단위 스키마 오버라이드: defId -> rows */
export type ComponentSchemaOverrides = Record<string, PropSchemaEntry[]>;

/** BottomDock의 우측 고급 패널 종류 */
export type BottomRightPanelKind = 'SchemaEditor' | 'PropVisibility' | 'Logs' | 'None';

// 페이지 편집 / 컴포넌트(템플릿) 설계 모드
export type EditorMode = 'Page' | 'Component';

// EditorUI 위쪽에 배치 추천
export type LeftTabKind = 'Explorer' | 'Composer';

// Explorer 하단 정보 패널에 표시할 선택 미리보기
export type ExplorerPreviewSel = { kind: 'page' | 'component'; id: string } | null;

/** 편집기 UI 상태 */
export interface EditorUI {
    selectedId: NodeId | null;
    canvasWidth: number;

    /** 열린 fragmentId 스택(상단이 top-most) */
    overlays: string[];

    /** 하단 우측 고급 패널 상태 */
    bottomRight?: {
        open: boolean;
        kind: BottomRightPanelKind;
        /** 전체 너비 대비 우측 패널 비율(%) */
        widthPct: number; // 20 ~ 60 권장
    };
    mode?: EditorMode;        // 페이지/컴포넌트 모드
    expertMode?: boolean;     // 전문가 모드(템플릿 필터 무시) — 단, 태그 정책은 항상 적용
    bottomHeightPx?: number;
    rightWidthPx?: number;   // 우측 패널 사용자 리사이즈 폭, 기본 420, min 320 ~ max 720
    leftTab?: LeftTabKind;   // 'Explorer' | 'Insert' (기본 Explorer)
    leftSplitPct?: number;   // 좌측 탭의 상/하 분할 비율(%) - 기본 60
    explorerPreview?: ExplorerPreviewSel; // Explorer 트리에서 선택한 항목의 요약 표시용
}

// 컴포넌트가 갖는 "기본 능력치"
export interface ComponentCapabilities {
    /** 이 컴포넌트가 가질 수 있는 태그(렌더 래퍼/대체 tag), 예: button → ['button','a','div'] */
    allowedTags: string[];
    /** 기본 tag (허용 목록 중 하나) */
    defaultTag: string;
    /**
     * 태그별 정책(속성 허용/스타일 제한 등). 전역 TagPolicyMap 위에 "기본 덮어쓰기(=스타트값)" 역할.
     * 주의: 템플릿/프로젝트에서는 "추가 허용" 금지, "추가 제한"만 가능.
     */
    baseTagPolicy?: Record<string /*tag*/, TagPolicy>;
}


// ── 템플릿/정책
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
    baseDefId: string;  // registry 컴포넌트 id
    title: string;
    defaults?: { props?: Record<string, unknown>; styles?: CSSDict };
    schemaOverride?: PropSchemaEntry[];   // 템플릿 로컬 스키마
    inspectorFilter?: InspectorFilter;    // 템플릿 노출 정책
    actionPresets?: Partial<Record<SupportedEvent, ActionSpec>>;
    flowPresets?: FlowEdge[];
    capabilityDelta?: {
        allowedTagsRestrict?: string[];        // 교집합으로 줄이기
        tagPolicyDelta?: {
            // tag별로 허용 속성/스타일을 더 "빼기"만 가능
            [tag: string]: {
                dropAttributes?: string[];
                dropStyleAllows?: string[];        // allow에서 제거
                addStyleDenies?: string[];         // deny에 추가
            };
        };
    };
}

export interface TagPolicy {
    allowedAttributes: string[];  // HTML content attributes
    styles?: { allow?: string[]; deny?: string[] }; // CSS 키
    isVoid?: boolean;             // 자식 불가(img/input 등)
}

export type TagPolicyMap = Record<string, TagPolicy>;

// BaseDef → 허용 태그(예: button 컴포넌트는 ['button','a','div']만)
export type BaseDefTagWhitelist = Record<string /*defId*/, string[]>;

export interface Project {
    pages: Page[];
    fragments: Fragment[];
    /** 모든 노드: id -> Node */
    nodes: Record<NodeId, Node>;
    /** 현재 표시 중인 페이지의 루트 노드 id */
    rootId: NodeId;

    /** 컴포넌트 정의(propsSchema) 오버라이드 — key: defId */
    schemaOverrides?: ComponentSchemaOverrides;
    templates?: Record<TemplateId, TemplateDefinition>; // 프로젝트 템플릿
    inspectorFilters?: Record<string /*defId or templateId*/, InspectorFilter>;
    tagPolicies?: TagPolicyMap;                          // 프로젝트 단위 태그 정책 커스터마이즈
}

/** whenExpr 평가 컨텍스트 */
export interface BindingScope {
    data: Record<string, unknown>;
    node: Node | null;
    project: Project | null;
}

/** 지원 이벤트 */
export type SupportedEvent = 'onClick' | 'onChange' | 'onSubmit' | 'onLoad';

/** 액션 스텝 */
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

/** 플로우 엣지(from 이벤트 → to 동작, 선택적 when) */
export interface FlowEdge {
    id?: string;
    from: { nodeId: NodeId; event: SupportedEvent };
    when?: { expr: string };
    to:
        | { kind: 'Navigate'; toPageId: string }
        | { kind: 'OpenFragment'; fragmentId: string }
        | { kind: 'CloseFragment'; fragmentId?: string };
}

/** 전역 상태 */
export interface EditorState {
    project: Project;
    ui: EditorUI;
    data: Record<string, unknown>;
    settings: Record<string, unknown>;
    /** flowEdges: id -> FlowEdge */
    flowEdges: Record<string, FlowEdge>;
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
} & CommonMeta;

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