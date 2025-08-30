import { createStore, type StoreApi } from 'zustand/vanilla';
import { getDefinition } from '../core/registry';
import type {
    EditorState,
    Project,
    NodeId,
    Node,
    FlowEdge,
    CSSDict,
    Viewport,
    ViewportMode,
} from '../core/types';

/** =======================================================================
 *  초기 Project (샘플) - 실제로는 persistence 로딩으로 대체 가능
 *  ======================================================================= */
const initialProject: Project = {
    pages: [{ id: 'page_home', name: 'Home', rootId: 'node_root_home', slug: '/' }],
    fragments: [],
    nodes: {
        node_root_home: {
            id: 'node_root_home',
            componentId: 'box',
            props: {},
            styles: { element: { base: { minHeight: '100%', width: '100%' } } },
            children: [],
            locked: false,
            isVisible: true,
        },
    },
    rootId: 'node_root_home',
};

/** =======================================================================
 *  초기 EditorState
 *  ======================================================================= */
const initialState: EditorState = {
    project: initialProject,
    ui: {
        selectedId: null,
        mode: 'Page',
        expertMode: false,
        overlays: [],
        canvas: {
            width: 1280,
            height: 800,
            zoom: 1,
            orientation: 'landscape',
            activeViewport: 'base',
            baseViewport: 'base',
            vpMode: { base: 'Unified', tablet: 'Unified', mobile: 'Unified' },
        },
        panels: {
            left: { tab: 'Composer', widthPx: 320, splitPct: 60, explorerPreview: null },
            right: { widthPx: 420 },
            bottom: { heightPx: 240, isCollapsed: false, advanced: null },
        },
    },
    data: {},
    settings: {},
    flowEdges: {},
    history: { past: [], future: [] },
};

/** =======================================================================
 *  유틸
 *  ======================================================================= */
let _seq = 0;
const genId = (prefix: string): string =>
    `${prefix}_${Date.now().toString(36)}_${++_seq}`;

function buildNodeWithDefaults(defId: string, id: string): Node {
    const def = getDefinition(defId);
    const defProps = def?.defaults?.props ?? {};
    const defStyles = def?.defaults?.styles?.element?.base ?? {};
    return {
        id,
        componentId: defId,
        props: { ...defProps },
        styles: { element: { base: { ...defStyles } } },
        children: [],
        locked: false,
        isVisible: true,
    };
}

function collectSubtreeIds(nodes: Record<NodeId, Node>, rootId: NodeId): NodeId[] {
    const ids: NodeId[] = [];
    const queue: NodeId[] = [rootId];
    while (queue.length) {
        const id = queue.shift()!;
        ids.push(id);
        const n = nodes[id];
        if (n?.children) queue.push(...(n.children as NodeId[]));
    }
    return ids;
}

// 부모 찾기(빠름/간단): project.nodes를 순회해서 childId를 포함한 노드 검색
function findParentId(p: Project, childId: NodeId): NodeId | null {
    for (const nid of Object.keys(p.nodes)) {
        const n = p.nodes[nid]!;
        if (n.children && n.children.includes(childId)) return nid;
    }
    return null;
}

/** 해당 defId가 컨테이너인지 판정 (Box는 강제 컨테이너 허용) */
function isContainerDef(defId: string): boolean {
    const def = getDefinition(defId);
    return def?.capabilities?.canHaveChildren === true || defId === 'box';
}

/**
 * 현재 위치(desiredParent)에서 가장 가까운 "컨테이너(Box) 조상"을 선택.
 * - desiredParent가 비어있으면 root부터 시작
 * - 컨테이너를 못 찾으면 root 반환
 */
function chooseValidParentId(
    p: Project,
    desiredParent: NodeId | null | undefined,
    fallbackRoot: NodeId
): NodeId {
    let cur: NodeId =
        desiredParent && p.nodes[desiredParent] ? desiredParent : fallbackRoot;

    // cur가 컨테이너면 즉시 OK
    if (isContainerDef(p.nodes[cur]!.componentId)) return cur;

    // 위로 타고 올라가며 컨테이너를 찾는다
    let guard = 0;
    while (guard++ < 1024) {
        const parent = findParentId(p, cur);
        if (!parent) break;
        if (isContainerDef(p.nodes[parent]!.componentId)) return parent;
        cur = parent;
    }
    // 그래도 못 찾으면 root 보장
    return fallbackRoot;
}


/** =======================================================================
 *  Actions 타입
 *  ======================================================================= */
type EditorActions = {
    update: (fn: (draft: EditorState) => void, recordHistory?: boolean) => void;
    undo: () => void;
    redo: () => void;

    select: (id: NodeId | null) => void;

    addByDef: (defId: string, parentId?: NodeId) => NodeId;
    addByDefAt: (defId: string, parentId: NodeId, index: number) => void;
    patchNode: (id: NodeId, patch: Partial<Node>) => void;

    updateNodeProps: (id: NodeId, props: Record<string, unknown>) => void;
    updateNodeStyles: (id: NodeId, styles: CSSDict, viewport?: Viewport) => void;

    moveNode: (nodeId: NodeId, newParentId: NodeId, newIndex: number) => void;
    removeNodeCascade: (nodeId: NodeId) => void;
    toggleNodeVisibility: (nodeId: NodeId) => void;
    toggleNodeLock: (nodeId: NodeId) => void;

    // 페이지
    selectPage: (pageId: string) => void;
    addPage: (name?: string) => string;
    removePage: (pageId: string) => void;

    // 프래그먼트
    addFragment: (name?: string) => string;
    removeFragment: (fragmentId: string) => void;

    // 플로우
    addFlowEdge: (edge: FlowEdge) => void;
    updateFlowEdge: (edgeId: string, patch: Partial<FlowEdge>) => void;
    removeFlowEdge: (edgeId: string) => void;

    // 캔버스/뷰포트
    setCanvasSize: (size: { width: number; height: number }) => void;
    setCanvasZoom: (zoom: number) => void;
    toggleCanvasOrientation: () => void;
    setActiveViewport: (viewport: Viewport) => void;
    setBaseViewport: (viewport: Viewport) => void;
    setViewportMode: (viewport: Viewport, mode: ViewportMode) => void;

    // 스타일 읽기
    getEffectiveDecl: (nodeId: NodeId) => CSSDict | null;

    // 초기화
    hydrateDefaults: () => void;
};

export type EditorStoreState = EditorState & EditorActions;

/** =======================================================================
 *  Store
 *  ======================================================================= */
export const editorStore: StoreApi<EditorStoreState> = createStore<EditorStoreState>((set, get) => ({
    ...initialState,

    update: (fn, recordHistory = false) => {
        const current = get();
        const prevProject = current.project;
        const draft: EditorState = JSON.parse(JSON.stringify(current)) as EditorState;

        fn(draft);

        const nextHistory = recordHistory
            ? { past: [...current.history.past, prevProject], future: [] }
            : current.history;

        set({ ...(draft as any), history: nextHistory } as EditorStoreState);
    },

    undo: () => {
        const current = get();
        if (current.history.past.length === 0) return;
        const prev = current.history.past[current.history.past.length - 1];
        const future = [current.project, ...current.history.future];
        const past = current.history.past.slice(0, -1);

        set({ ...current, project: prev, history: { past, future } });
    },

    redo: () => {
        const current = get();
        if (current.history.future.length === 0) return;
        const next = current.history.future[0];
        const future = current.history.future.slice(1);
        const past = [...current.history.past, current.project];

        set({ ...current, project: next, history: { past, future } });
    },

    select: (id) => get().update(s => { s.ui.selectedId = id; }),

    patchNode: (id, patch) =>
        get().update(s => {
            s.project.nodes[id] = { ...s.project.nodes[id]!, ...patch };
        }, true),

    updateNodeProps: (id, props) =>
        get().update(s => {
            const node = s.project.nodes[id]!;
            s.project.nodes[id] = { ...node, props: { ...node.props, ...props } };
        }, true),

    /** 스타일 라우팅:
     * - viewport 인자가 주어지면 해당 뷰포트에 병합
     * - 없으면, activeViewport의 모드로 판단:
     *   - Unified → baseViewport에 기록
     *   - Independent → activeViewport에 기록
     */
    updateNodeStyles: (id, styles, viewport) =>
        get().update(s => {
            const node = s.project.nodes[id];
            if (!node) return;
            if (!node.styles) (node as any).styles = { element: { base: {} } };
            if (!node.styles.element) (node.styles as any).element = { base: {} };

            const base = s.ui.canvas.baseViewport;
            const vp = viewport ?? (s.ui.canvas.vpMode[s.ui.canvas.activeViewport] === 'Independent'
                ? s.ui.canvas.activeViewport
                : base);

            const prev = (node.styles.element as any)[vp] ?? {};
            (node.styles.element as any)[vp] = { ...prev, ...styles };
        }, true),

    addByDef : (defId, parentId) => {
        const newId = genId(`node_${defId}`);
        get().update((s: EditorState) => {
            const p = s.project;

            // 노드 맵 얕은 복사 + 새 노드 생성
            const nodes = { ...p.nodes };
            nodes[newId] = buildNodeWithDefaults(defId, newId);

            // ✅ parent 선택 로직: 지정 → 선택된 노드 → root
            const desired = parentId ?? s.ui.selectedId ?? p.rootId;
            // ✅ 컨테이너 보정(가장 가까운 Box 조상)
            const parentKey = chooseValidParentId(p, desired, p.rootId);
            const parent = nodes[parentKey]!;

            // ✅ 부모 노드 객체 자체를 교체(참조 변경 보장)
            const nextChildren = [...(parent.children ?? []), newId];
            nodes[parentKey] = { ...parent, children: nextChildren };

            s.project = { ...p, nodes };
            // UX: 방금 추가한 노드 선택
            s.ui = { ...s.ui, selectedId: newId };
        });
        return newId;
    },

    addByDefAt: (defId, parentId, index) => {
        const newId = genId(`node_${defId}`);
        get().update((s: EditorState) => {
            const p = s.project;

            const nodes = { ...p.nodes };
            nodes[newId] = buildNodeWithDefaults(defId, newId);

            // ✅ 인자로 온 parentId가 컨테이너가 아닐 수 있으므로 보정
            const desired = parentId ?? s.ui.selectedId ?? p.rootId;
            const parentKey = chooseValidParentId(p, desired, p.rootId);
            const parent = nodes[parentKey]!;

            const children = [...(parent.children ?? [])];
            const clamped = Math.max(0, Math.min(index, children.length));
            children.splice(clamped, 0, newId);

            nodes[parentKey] = { ...parent, children };
            s.project = { ...p, nodes };
            s.ui = { ...s.ui, selectedId: newId };
        });
        return newId;
    },

    moveNode: (nodeId, desiredParentId, newIndex) => get().update(s => {
        // ✅ 루트 이동 금지
        if (nodeId === s.project.rootId) return;

        const nodes = { ...s.project.nodes };

        // 기존 부모에서 제거
        const oldParentId = findParentId(s.project, nodeId);
        if (oldParentId) {
            const oldP = { ...nodes[oldParentId]! };
            oldP.children = (oldP.children ?? []).filter(c => c !== nodeId);
            nodes[oldParentId] = oldP;
        }

        // 새 부모는 selection/desired에서 가장 가까운 컨테이너
        const desired = desiredParentId ?? s.ui.selectedId ?? s.project.rootId;
        const newParentId = chooseValidParentId(s.project, desired, s.project.rootId);

        const np = { ...nodes[newParentId]! };
        const arr = [...(np.children ?? [])];
        const idx = Math.max(0, Math.min(newIndex ?? arr.length, arr.length));
        arr.splice(idx, 0, nodeId);
        np.children = arr;

        nodes[newParentId] = np;
        s.project.nodes = nodes;
    }, true),

    // 삭제: 루트는 삭제 금지. 선택 포커스 보정.
    removeNodeCascade: (nodeId) => get().update(s => {
        if (nodeId === s.project.rootId) return; // 루트 삭제 금지

        // 하위 전체 수집
        const collect = (id: NodeId, acc: NodeId[]) => {
            acc.push(id);
            const n = s.project.nodes[id];
            (n?.children ?? []).forEach(cid => collect(cid, acc));
        };
        const toDel: NodeId[] = [];
        collect(nodeId, toDel);

        const parentId = findParentId(s.project, nodeId);
        const next = { ...s.project.nodes };
        toDel.forEach(id => delete next[id]);

        if (parentId) {
            const p = s.project.nodes[parentId];
            if (p) next[parentId] = { ...p, children: (p.children ?? []).filter(c => c !== nodeId) };
        }
        s.project.nodes = next;

        // 선택 보정
        const sel = s.ui.selectedId;
        if (sel && toDel.includes(sel)) s.ui.selectedId = parentId ?? s.project.rootId;
    }, true),

    toggleNodeVisibility: (nodeId) =>
        get().update(s => {
            const n = s.project.nodes[nodeId];
            if (!n) return;
            s.project.nodes[nodeId] = { ...n, isVisible: !n.isVisible };
        }, true),

    toggleNodeLock: (nodeId) =>
        get().update(s => {
            const n = s.project.nodes[nodeId];
            if (!n) return;
            s.project.nodes[nodeId] = { ...n, locked: !n.locked };
        }, true),

    selectPage: (pageId) =>
        get().update(s => {
            const page = s.project.pages.find(p => p.id === pageId);
            if (!page) return;
            s.project.rootId = page.rootId;
            s.ui.selectedId = page.rootId;
        }),

    addPage: (name) => {
        const pageId = genId('page');
        const rootId = genId('node_root');
        get().update(s => {
            s.project.nodes[rootId] = buildNodeWithDefaults('box', rootId);
            s.project.pages = [...s.project.pages, { id: pageId, name: name ?? `Page ${s.project.pages.length + 1}`, rootId }];
        }, true);
        return pageId;
    },

    removePage: (pageId) => get().update(s => {
        const page = s.project.pages.find(p => p.id === pageId);
        if (!page) return;
        const toDel = collectSubtreeIds(s.project.nodes, page.rootId);
        const next = { ...s.project.nodes };
        toDel.forEach(id => delete next[id]);
        s.project.nodes = next;
        s.project.pages = s.project.pages.filter(p => p.id !== pageId);
        if (s.project.rootId === page.rootId && s.project.pages[0]) {
            s.project.rootId = s.project.pages[0].rootId;
            s.ui.selectedId = s.project.rootId;
        }
    }, true),

    addFragment: (name) => {
        const newId = genId('fragment');
        const rootId = genId('frag_root');
        get().update(s => {
            s.project.nodes[rootId] = buildNodeWithDefaults('box', rootId);
            s.project.fragments = [...s.project.fragments, { id: newId, name: name ?? `Fragment ${s.project.fragments.length + 1}`, rootId }];
        }, true);
        return newId;
    },

    removeFragment: (fragmentId) => get().update(s => {
        const frag = s.project.fragments.find(f => f.id === fragmentId);
        if (!frag) return;
        const toDel = collectSubtreeIds(s.project.nodes, frag.rootId);
        const next = { ...s.project.nodes };
        toDel.forEach(id => delete next[id]);
        s.project.nodes = next;
        s.project.fragments = s.project.fragments.filter(f => f.id !== fragmentId);
    }, true),

    addFlowEdge: (edge) => get().update(s => {
        const id = genId('edge');
        s.flowEdges[id] = { ...edge, id };
    }, true),

    updateFlowEdge: (edgeId, patch) => get().update(s => {
        if (!s.flowEdges[edgeId]) return;
        s.flowEdges[edgeId] = { ...s.flowEdges[edgeId]!, ...patch };
    }, true),

    removeFlowEdge: (edgeId) => get().update(s => {
        const next = { ...s.flowEdges };
        delete next[edgeId];
        s.flowEdges = next;
    }, true),

    setCanvasSize: (size) => get().update(s => {
        s.ui.canvas.width = size.width;
        s.ui.canvas.height = size.height;
    }),

    setCanvasZoom: (z) => get().update(s => {
        s.ui.canvas.zoom = z;
    }),

    toggleCanvasOrientation: () => get().update(s => {
        const { width, height } = s.ui.canvas;
        s.ui.canvas.width = height;
        s.ui.canvas.height = width;
    }),

    setActiveViewport: (viewport) => get().update(s => {
        s.ui.canvas.activeViewport = viewport;
    }),

    setBaseViewport: (viewport) => get().update(s => {
        s.ui.canvas.baseViewport = viewport;
    }, true),

    setViewportMode: (viewport, mode) => get().update(s => {
        s.ui.canvas.vpMode = { ...s.ui.canvas.vpMode, [viewport]: mode };
    }, true),

    /** Base + (Independent일 때만 Active) 병합 */
    getEffectiveDecl: (nodeId) => {
        const s = get();
        const node = s.project.nodes[nodeId];
        if (!node) return null;

        const vp = s.ui.canvas.activeViewport;
        const base = s.ui.canvas.baseViewport;
        const mode = s.ui.canvas.vpMode?.[vp] ?? 'Unified';

        const el = (node.styles?.element ?? {}) as Record<string, CSSDict | undefined>;
        const baseDecl = (el[base] ?? el.base ?? {}) as CSSDict;
        if (mode === 'Unified') return baseDecl;

        const vpDecl = (el[vp] ?? {}) as CSSDict;
        return { ...baseDecl, ...vpDecl };
    },

    /** 정의 기본값 + 현재 노드 기본값 보정 */
    hydrateDefaults: () => get().update(s => {
        const nodes = s.project.nodes;
        for (const id in nodes) {
            const node = nodes[id]!;
            const def = getDefinition(node.componentId);
            if (!def) continue;

            const defProps = def.defaults?.props ?? {};
            const nextProps = { ...defProps, ...(node.props ?? {}) };

            const element = node.styles?.element ?? {};
            const defBase = def.defaults?.styles?.element?.base ?? {};
            const curBase = (element as any).base ?? {};
            const nextElement = { ...element, base: { ...defBase, ...curBase } };

            s.project.nodes[id] = { ...node, props: nextProps, styles: { ...node.styles, element: nextElement } };
        }
    }, true),
}));

//export type { StoreApi } from 'zustand/vanilla';