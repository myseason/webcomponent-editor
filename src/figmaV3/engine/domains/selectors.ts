import { EditorCore } from '../EditorCore';
import {
    type EditorState,
    type CSSDict,
    type NodeId,
    type Fragment,
    type BottomRightPanelKind,
    type EditorUI,
    type EditorMode,
    type Project,
    type InspectorFilter,
    type Node,
} from '../../core/types';
import { getDefinition } from '../../core/registry';
import { GLOBAL_TAG_POLICIES } from '../../policy/globalTagPolicy';

/* ======================================================
 * 안전 보정 타입
 * ====================================================== */
type PanelsT = NonNullable<EditorUI['panels']>;
type BottomT = NonNullable<PanelsT['bottom']>;
type AdvancedT = NonNullable<NonNullable<BottomT['advanced']>>;

type BottomAdvanced = { open: boolean; kind: BottomRightPanelKind; widthPct: number };
type BottomDockState = { heightPx: number; isCollapsed: boolean; advanced: BottomAdvanced };
type BottomRightLayout = { rightOpen: boolean; rightPct: number; leftPct: number };

/* -------------------------------
 * 내부 정규화 유틸 (BottomDock)
 * ----------------------------- */
function normBottomDock(ui?: EditorUI): BottomDockState {
    const panels = ui?.panels as PanelsT | undefined;
    const bottom = panels?.bottom as BottomT | undefined;

    const heightPx = typeof bottom?.heightPx === 'number' ? bottom!.heightPx : 240;
    const isCollapsed = !!bottom?.isCollapsed;

    const advRaw = bottom?.advanced ?? null;
    const open = !!advRaw?.open;
    const kind = (advRaw?.kind ?? 'None') as BottomRightPanelKind;
    const widthPct = typeof advRaw?.widthPct === 'number' ? advRaw!.widthPct : 36;

    return { heightPx, isCollapsed, advanced: { open, kind, widthPct } };
}

function computeRightLayout(ui?: EditorUI): BottomRightLayout {
    const st = normBottomDock(ui);
    const rp = Math.max(0, Math.min(100, st.advanced.widthPct));
    const rightOpen = !!st.advanced.open && st.advanced.kind === 'SchemaEditor';
    return { rightOpen, rightPct: rp, leftPct: Math.max(0, 100 - rp) };
}

function findCurrentRootIdByMode(ui?: EditorUI, project?: Project): NodeId | null {
    const mode: EditorMode = (ui?.mode ?? 'Page') as EditorMode;

    if (mode === 'Component') {
        const fragId = ui?.editingFragmentId ?? ui?.panels?.left?.lastActiveFragmentId ?? null;
        if (fragId && project?.fragments?.length) {
            const f = project.fragments.find((x) => x.id === fragId) ?? project.fragments[0];
            return f?.rootId ?? null;
        }
        return null;
    }

    // Page 모드
    const pageId = ui?.panels?.left?.lastActivePageId ?? null;
    if (project?.pages?.length) {
        const p = (pageId ? project.pages.find((x) => x.id === pageId) : null) ?? project.pages[0];
        return p?.rootId ?? null;
    }
    return null;
}

/* ======================================================
 * Tag 계산 유틸 (Node → HTML Tag)
 *  - Node에는 tag 필드 없음
 *  - 우선순위: node.props.__tag → def.capabilities.defaultTag → 'div'
 * ====================================================== */
function getNodeTag(state: EditorState, node: Node<any, any> | undefined): string {
    if (!node) return 'div';
    const tagOverride = (node.props as any)?.__tag as string | undefined;
    if (tagOverride) return tagOverride;

    const def = getDefinition(node.componentId);
    const defTag = def?.capabilities?.defaultTag;
    return defTag ?? 'div';
}

/* ======================================================
 * TagPolicy 허용 스타일 키 계산
 *  - GLOBAL_TAG_POLICIES[tag].styles.allow/deny, groups를 활용
 *  - allow에 '*'가 있으면 groups의 모든 키 합집합 사용(deny로 제거)
 * ====================================================== */
function computeTagAllowedStyleKeys(tag: string): Set<string> {
    const tp = (GLOBAL_TAG_POLICIES as any)[tag] as
        | {
        styles?: {
            allow?: string[];
            deny?: string[];
            groups?: Record<string, string[]>;
        };
        attributes?: { allow?: string[]; deny?: string[] };
    }
        | undefined;

    if (!tp?.styles) return new Set<string>();

    const allow = new Set<string>(tp.styles.allow ?? []);
    const deny = new Set<string>(tp.styles.deny ?? []);
    const groups = tp.styles.groups ?? {};

    // allow='*' 처리 → 그룹에 정의된 모든 키를 풀셋으로 사용
    if (allow.has('*')) {
        allow.clear();
        for (const arr of Object.values(groups)) {
            for (const k of arr) allow.add(k);
        }
    }

    // deny 제거
    for (const d of deny) allow.delete(d);

    return allow;
}

/* ======================================================
 * InspectorFilter 기반 제한 적용
 *  - project.inspectorFilters[defId]?.styles/props allow/deny
 *  - 존재할 때만 교차/제외 적용
 * ====================================================== */
function applyInspectorFilter(
    keys: Set<string>,
    filter: InspectorFilter | undefined,
    kind: 'styles' | 'props'
): { visible: string[] } {
    if (!filter) return { visible: [...keys] };

    const allowList = filter[kind]?.allow ?? undefined;
    const denyList = filter[kind]?.deny ?? undefined;

    let vis = new Set<string>(keys);

    if (Array.isArray(allowList) && allowList.length > 0) {
        vis = new Set<string>([...vis].filter((k) => allowList.includes(k)));
    }
    if (Array.isArray(denyList) && denyList.length > 0) {
        for (const d of denyList) vis.delete(d);
    }
    return { visible: [...vis] };
}

/* ======================================================
 * selectorsDomain — 순수 Reader
 *  - 상태 변경 없음 (writer 비움)
 *  - 기존 v1.4 파일에 있던 Reader 유지 + Inspector 가시성 계산 추가
 * ====================================================== */
export function selectorsDomain() {
    /* ---------- 기존 v1.4 Reader 예시 (필요 시 유지/보강) ---------- */

    const selectEffectiveDecl = (state: EditorState, nodeId: string): CSSDict | null => {
        const node = state.project.nodes[nodeId];
        if (!node) return null;

        const el = node.styles?.element ?? {};
        const baseVp = state.ui.canvas.baseViewport;
        const activeVp = state.ui.canvas.activeViewport;
        const mode = state.ui.canvas.viewportMode?.[activeVp] ?? state.ui.canvas.vpMode?.[activeVp];

        const baseDecl = (el as any)[baseVp] ?? {};
        if (mode === 'Independent' && activeVp !== baseVp) {
            const overrideDecl = (el as any)[activeVp] ?? {};
            return { ...baseDecl, ...overrideDecl };
        }
        return { ...baseDecl };
    };

    /* ---------- Inspector 가시성 계산 (추가) ---------- */

    /** 스타일 키: TagPolicy → (옵션) project.inspectorFilters 교차 적용
     *  + Page 모드에서 ui.inspector.forceTagPolicy === true면 TagPolicy 허용 전부 노출
     */
    const selectInspectorStyleKeys = (state: EditorState, nodeId: NodeId): { visible: string[] } => {
        const node = state.project.nodes?.[nodeId];
        const tag = getNodeTag(state, node);
        const tagAllowed = computeTagAllowedStyleKeys(tag);

        // Page 모드 + 강제 표시는 TagPolicy 허용 전부
        const mode = (state.ui?.mode ?? 'Page') as EditorMode;
        const forceAll = !!state.ui?.inspector?.forceTagPolicy;
        if (mode === 'Page' && forceAll) {
            return { visible: [...tagAllowed] };
        }

        // 프로젝트 단위 InspectorFilter(컴포넌트별)
        const defId = node?.componentId ?? '';
        const filter = (state.project.inspectorFilters?.[defId] as InspectorFilter | undefined);

        return applyInspectorFilter(tagAllowed, filter, 'styles');
    };

    /** 속성 키: TagPolicy(attributes.allow/deny) → (옵션) project.inspectorFilters 교차 적용
     *  + Page 모드 + forceTagPolicy === true면 TagPolicy 허용 전부
     */
    const selectInspectorPropKeys = (state: EditorState, nodeId: NodeId): { visible: string[] } => {
        const node = state.project.nodes?.[nodeId];
        const tag = getNodeTag(state, node);

        const tp = (GLOBAL_TAG_POLICIES as any)[tag] as
            | { attributes?: { allow?: string[]; deny?: string[] } }
            | undefined;

        const allow = new Set<string>(tp?.attributes?.allow ?? []);
        const deny = new Set<string>(tp?.attributes?.deny ?? []);
        for (const d of deny) allow.delete(d);

        const mode = (state.ui?.mode ?? 'Page') as EditorMode;
        const forceAll = !!state.ui?.inspector?.forceTagPolicy;
        if (mode === 'Page' && forceAll) {
            return { visible: [...allow] };
        }

        const defId = node?.componentId ?? '';
        const filter = (state.project.inspectorFilters?.[defId] as InspectorFilter | undefined);

        return applyInspectorFilter(allow, filter, 'props');
    };

    /* ---------- BottomDock/레이아웃 파생 ---------- */

    const R = {
        /** Inspector용 최종 스타일 선언 */
        getEffectiveDecl(nodeId: string) {
            return selectEffectiveDecl(EditorCore.getState(), nodeId);
        },

        /** BottomDock 표준 읽기 상태(초깃값 포함) */
        selectBottomDockState(): BottomDockState {
            const s = EditorCore.store.getState() as EditorState;
            return normBottomDock(s.ui);
        },

        /** 우측 고급 패널 레이아웃 파생값 */
        selectBottomRightLayout(): BottomRightLayout {
            const s = EditorCore.store.getState() as EditorState;
            return computeRightLayout(s.ui);
        },

        /** 현재 모드(Page/Component)에 따른 현재 루트 NodeId */
        selectCurrentRootId(): NodeId | null {
            const s = EditorCore.store.getState() as EditorState;
            return findCurrentRootIdByMode(s.ui, s.project);
        },

        /** ✅ Inspector 표시 키 계산(스타일) */
        selectInspectorStyleKeys(nodeId: NodeId): { visible: string[] } {
            return selectInspectorStyleKeys(EditorCore.getState(), nodeId);
        },

        /** ✅ Inspector 표시 키 계산(속성/Props) */
        selectInspectorPropKeys(nodeId: NodeId): { visible: string[] } {
            return selectInspectorPropKeys(EditorCore.getState(), nodeId);
        },
    };

    // selectors 도메인은 상태를 변경하지 않으므로 writer는 비어있습니다.
    const W = {};

    return { reader: R, writer: W } as const;
}