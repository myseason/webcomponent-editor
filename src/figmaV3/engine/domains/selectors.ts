import { EditorCore } from '../EditorCore';
import type {
    EditorState,
    CSSDict,
    NodeId,
    Page,
    Fragment,
    BottomRightPanelKind,
    EditorUI,
    EditorMode, Project
} from '../../core/types';

// ======================================================
// 파생 셀렉터에서 재사용할 안전 보정 유틸
// ======================================================
type PanelsT = NonNullable<EditorUI['panels']>;
type BottomT  = NonNullable<PanelsT['bottom']>;
type AdvancedT = NonNullable<BottomT['advanced']>;

type BottomAdvanced = { open: boolean; kind: BottomRightPanelKind; widthPct: number };
type BottomDockState = { heightPx: number; isCollapsed: boolean; advanced: BottomAdvanced };
type BottomRightLayout = { rightOpen: boolean; rightPct: number; leftPct: number };

/* -------------------------------
 * 내부 정규화 유틸
 * ----------------------------- */
function normBottomDock(ui?: EditorUI): BottomDockState {
    // 가능한 한 "정확한 타입"으로 캐스팅 + Partial로 안전 접근
    const panels = (ui?.panels as PanelsT | undefined);
    const bottom = (panels?.bottom as BottomT | undefined);

    const pBottom: Partial<BottomT> | undefined = bottom as any;

    const heightPx =
        typeof pBottom?.heightPx === 'number' ? pBottom!.heightPx : 240;

    const isCollapsed = !!pBottom?.isCollapsed;

    const advRaw = (pBottom?.advanced as AdvancedT | undefined);
    const pAdv: Partial<AdvancedT> | undefined = advRaw as any;

    const advanced: BottomAdvanced = {
        open: !!pAdv?.open,
        kind: (pAdv?.kind ?? 'None') as BottomRightPanelKind,
        widthPct: typeof pAdv?.widthPct === 'number' ? pAdv.widthPct! : 36,
    };

    return { heightPx, isCollapsed, advanced };
}

function computeRightLayout(ui?: EditorUI): BottomRightLayout {
    const st = normBottomDock(ui);
    // 클램프는 여기서만: UI 정책 변경도 한 곳에서 조정 가능
    const rp = Math.max(0, Math.min(100, st.advanced.widthPct));
    const rightOpen = !!st.advanced.open && st.advanced.kind === 'SchemaEditor';
    return { rightOpen, rightPct: rp, leftPct: Math.max(0, 100 - rp) };
}

function findCurrentRootIdByMode(ui?: EditorUI, project?: Project): NodeId | null {
    const mode: EditorMode = (ui?.mode ?? 'Page') as EditorMode;

    if (mode === 'Component') {
        const fragId =
            // v1.4에서 사용하는 편집 프래그먼트 id 우선순위
            (ui as any)?.editingFragmentId ??
            ui?.panels?.left?.lastActiveFragmentId ??
            null;

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

/**
 * selectorsDomain — 순수 Reader
 * - 상태 변경 없음 (writer 비움)
 * - 기존 패턴 유지
 */
export function selectorsDomain() {
    // --- Pure Selector Functions (파일 내부 전용) ---
    const selectOutline = (state: EditorState) => {
        const nodes = state.project.nodes ?? {};
        return Object.values(nodes).map(n => ({
            id: n.id,
            name: (n.props as any)?.__name ?? n.componentId ?? n.id,
        }));
    };

    const selectEffectiveDecl = (state: EditorState, nodeId: string): CSSDict | null => {
        const node = state.project.nodes[nodeId];
        if (!node) return null;

        const el = node.styles?.element ?? {};
        const baseVp = state.ui.canvas.baseViewport;
        const activeVp = state.ui.canvas.activeViewport;
        const mode = state.ui.canvas.vpMode[activeVp];

        const baseDecl = (el as any)[baseVp] ?? {};
        if (mode === 'Independent' && activeVp !== baseVp) {
            const overrideDecl = (el as any)[activeVp] ?? {};
            return { ...baseDecl, ...overrideDecl };
        }
        return { ...baseDecl };
    };

    // 추가: 부모 찾기
    const selectParentId = (state: EditorState, targetId: NodeId): NodeId | null => {
        const nodes = state.project.nodes;
        for (const id in nodes) {
            const n = nodes[id]!;
            if (n.children?.includes(targetId)) return n.id;
        }
        return null;
    };

    // 추가: 서브트리 수집
    const selectSubtreeIds = (state: EditorState, rootId: NodeId): NodeId[] => {
        const nodes = state.project.nodes;
        const acc: NodeId[] = [];
        (function dfs(id: NodeId) {
            if (!nodes[id]) return;
            acc.push(id);
            for (const cid of nodes[id]!.children ?? []) dfs(cid);
        })(rootId);
        return acc;
    };

    // 추가: 현재 편집 프래그먼트
    const selectEditingFragment = (state: EditorState): Fragment | undefined => {
        const fid = state.ui.editingFragmentId;
        return fid ? state.project.fragments.find(f => f.id === fid) : undefined;
    };

    // --- Reader API ---
    const R = {
        /** Layers 패널용 노드 개요 */
        getOutline() {
            return selectOutline(EditorCore.getState());
        },
        /** Inspector용 최종 스타일 */
        getEffectiveDecl(nodeId: string) {
            return selectEffectiveDecl(EditorCore.getState(), nodeId);
        },
        /** 부모 찾기 */
        getParentId(nodeId: NodeId) {
            return selectParentId(EditorCore.getState(), nodeId);
        },
        /** 서브트리 수집 */
        getSubtreeIds(rootId: NodeId) {
            return selectSubtreeIds(EditorCore.getState(), rootId);
        },
        /** 현재 편집 중 프래그먼트 */
        getEditingFragment() {
            return selectEditingFragment(EditorCore.getState());
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
    };

    // selectors 도메인은 상태를 변경하지 않으므로 writer는 비어있습니다.
    const W = {};

    return { reader: R, writer: W } as const;
}