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
    Page,
    Fragment,
} from '../core/types';

// --- 초기 상태 정의 ---
const initialProject: Project = {
    pages: [{ id: 'page_home', name: 'Home', rootId: 'node_root_home', slug: '/' }],
    fragments: [],
    nodes: {
        node_root_home: {
            id: 'node_root_home', componentId: 'box', props: {},
            styles: { element: { base: { minHeight: '100%', width: '100%' } } },
            children: [], isVisible: true, locked: false,
        },
    },
    rootId: 'node_root_home',
};

const initialState: EditorState = {
    project: initialProject,
    ui: {
        selectedId: null, mode: 'Page', expertMode: false, overlays: [],
        canvas: { width: 1280, height: 800, activeViewport: 'base', zoom: 1, orientation: 'landscape' },
        panels: {
            left: { tab: 'Composer', widthPx: 320, splitPct: 60, explorerPreview: null },
            right: { widthPx: 420 },
            bottom: { heightPx: 240, isCollapsed: false, advanced: null },
        },
    },
    data: {},
    settings: {},
    flowEdges: {},
    history: {
        past: [],
        future: [],
    },
};

// --- 타입 정의 ---
type EditorActions = {
    update: (fn: (draft: EditorState) => void, recordHistory?: boolean) => void;
    select: (id: NodeId | null) => void;
    getParentOf: (id: NodeId) => NodeId | null;
    addByDef: (defId: string, parentId?: string) => NodeId;
    addByDefAt: (defId: string, parentId: string, index: number) => void;
    patchNode: (id: NodeId, patch: Partial<Node>) => void;
    updateNodeProps: (id: NodeId, props: Record<string, unknown>) => void;
    updateNodeStyles: (id: NodeId, styles: CSSDict, viewport: Viewport) => void;
    selectPage: (pageId: string) => void;
    addPage: (name?: string) => string;
    removePage: (pageId: string) => void;
    addFragment: (name?: string) => string;
    removeFragment: (fragmentId: string) => void;
    addFlowEdge: (edge: FlowEdge) => string;
    updateFlowEdge: (edgeId: string, patch: Partial<FlowEdge>) => void;
    removeFlowEdge: (edgeId: string) => void;
    setData: (path: string, value: unknown) => void;
    setSetting: (path: string, value: unknown) => void;
    openFragment: (fragmentId: string) => void;
    closeFragment: (fragmentId?: string) => void;
    hydrateDefaults: () => void;
    setActiveViewport: (viewport: Viewport) => void;
    moveNode: (nodeId: NodeId, newParentId: NodeId, newIndex: number) => void;
    removeNodeCascade: (nodeId: NodeId) => void;
    toggleNodeVisibility: (nodeId: NodeId) => void;
    toggleNodeLock: (nodeId: NodeId) => void;
    toggleBottomDock: () => void;
    setCanvasSize: (size: { width: number, height: number }) => void;
    setCanvasZoom: (zoom: number) => void;
    toggleCanvasOrientation: () => void;
    undo: () => void;
    redo: () => void;
};

export type EditorStoreState = EditorState & EditorActions;

// --- 유틸리티 함수 ---
let _seq = 0;
const genId = (prefix: string): string => `${prefix}_${Date.now().toString(36)}_${++_seq}`;
function buildNodeWithDefaults(defId: string, id: string): Node {
    const def = getDefinition(defId);
    const defProps = def?.defaults.props ?? {};
    const defStylesRaw = def?.defaults.styles?.element ?? {};
    return {
        id, componentId: defId, props: { ...defProps },
        styles: { element: { base: { ...(defStylesRaw.base ?? {}) } } },
        children: [], isVisible: true, locked: false,
    };
}
function findParentId(p: Project, childId: NodeId): NodeId | null {
    for (const nid in p.nodes) {
        if (p.nodes[nid]?.children?.includes(childId)) return nid;
    }
    return null;
}
function isContainerDef(defId: string): boolean {
    const def = getDefinition(defId);
    return def?.capabilities?.canHaveChildren === true || defId === 'box';
}
function chooseValidParentId(p: Project, desiredParent: NodeId | null | undefined, fallbackRoot: NodeId): NodeId {
    if (!desiredParent) return fallbackRoot;
    let currentId: NodeId = desiredParent;
    let guard = 0;
    while (guard++ < 100) {
        const node = p.nodes[currentId];
        if (!node) return fallbackRoot;
        if (isContainerDef(node.componentId)) return currentId;
        const parentId = findParentId(p, currentId);
        if (!parentId) return fallbackRoot;
        currentId = parentId;
    }
    return fallbackRoot;
}
function collectSubtreeIds(nodes: Record<NodeId, Node>, rootId: NodeId): Set<NodeId> {
    const ids = new Set<NodeId>();
    const queue: NodeId[] = [rootId];
    while(queue.length > 0){
        const id = queue.shift()!;
        if(ids.has(id)) continue;
        ids.add(id);
        const node = nodes[id];
        if(node?.children) queue.push(...node.children);
    }
    return ids;
}


export const editorStore: StoreApi<EditorStoreState> = createStore<EditorStoreState>((set, get) => ({
    ...initialState,
    // ✅ editStore.ts - update만 이대로 바꿔 주세요.
    update: (fn, recordHistory = false) => {
        const current = get();

        // 1) push할 history를 먼저 계산
        const nextHistory = recordHistory
            ? { past: [...current.history.past, current.project], future: [] as Project[] }
            : current.history;

        // 2) draft는 얕은 복제 + history는 위에서 계산한 값으로 직접 주입
        const draft: EditorState = {
            ...current,
            history: nextHistory,                // ← 핵심
            project: { ...current.project },
            ui: { ...current.ui },
            data: { ...current.data },
            settings: { ...current.settings },
            flowEdges: { ...current.flowEdges },
        };

        fn(draft);
        set(draft);                            // ← set은 한 번만
    },
    undo: () => {
        const { history } = get();
        if (history.past.length === 0) return;
        const previousProject = history.past[history.past.length - 1];
        set(state => ({
            ...state,
            project: previousProject,
            history: {
                past: state.history.past.slice(0, -1),
                future: [state.project, ...state.history.future],
            },
        }));
    },
    redo: () => {
        const { history } = get();
        if (history.future.length === 0) return;
        const nextProject = history.future[0];
        set(state => ({
            ...state,
            project: nextProject,
            history: {
                past: [...state.history.past, state.project],
                future: state.history.future.slice(1),
            },
        }));
    },
    select: (id) => get().update(s => { s.ui = { ...s.ui, selectedId: id }; }),
    patchNode: (id, patch) => get().update(s => {
        s.project.nodes = { ...s.project.nodes, [id]: { ...s.project.nodes[id]!, ...patch } };
    }, true),
    updateNodeProps: (id, props) => get().update(s => {
        const node = s.project.nodes[id]!;
        s.project.nodes = { ...s.project.nodes, [id]: { ...node, props: { ...node.props, ...props } } };
    }, true),
    updateNodeStyles: (id, styles, viewport) => get().update(s => {
        // 1) 빈 패치면 무시
        if (!styles || (typeof styles === 'object' && Object.keys(styles).length === 0)) return;

        // 2) flat CSSDict만 허용 (element/base/tablet/mobile 키가 들어오면 무시)
        const isFlat =
            typeof styles === 'object' &&
            !('element' in (styles as any)) &&
            !('base' in (styles as any)) &&
            !('tablet' in (styles as any)) &&
            !('mobile' in (styles as any));
        if (!isFlat) return;

        const node = s.project.nodes[id]!;
        const element = node.styles.element ?? {};
        const prevVp = (element[viewport] ?? {}) as CSSDict;

        const nextVp = { ...prevVp, ...styles };     // 얕은 병합
        const newElement = { ...element, [viewport]: nextVp };

        s.project.nodes = {
            ...s.project.nodes,
            [id]: { ...node, styles: { ...node.styles, element: newElement } }
        };
    }, true),
    addByDef: (defId, parentId) => {
        const newId = genId(defId);
        get().update(s => {
            const parentKey = chooseValidParentId(s.project, parentId ?? s.ui.selectedId, s.project.rootId);
            const parent = s.project.nodes[parentKey]!;
            s.project.nodes = { ...s.project.nodes, [newId]: buildNodeWithDefaults(defId, newId) };
            s.project.nodes[parentKey] = { ...parent, children: [...(parent.children ?? []), newId] };
            s.ui.selectedId = newId;
        }, true);
        return newId;
    },
    moveNode: (nodeId, newParentId, newIndex) => {
        get().update(s => {
            const oldParentId = findParentId(s.project, nodeId);
            if (!oldParentId) return;

            const nodes = { ...s.project.nodes };

            const oldParent = { ...nodes[oldParentId]! };
            oldParent.children = (oldParent.children ?? []).filter(id => id !== nodeId);
            nodes[oldParentId] = oldParent;

            const newParent = { ...nodes[newParentId]! };
            const newChildren = [...(newParent.children ?? [])];
            newChildren.splice(newIndex, 0, nodeId);
            newParent.children = newChildren;
            nodes[newParentId] = newParent;

            s.project.nodes = nodes;
        }, true);
    },
    // ✅ subtree 삭제 + 선택 보정 + 이력 기록 포함
    removeNodeCascade: (nodeId: NodeId) => get().update((s) => {
        // 부모 찾기
        let parentId: NodeId | null = null;
        for (const nid in s.project.nodes) {
            if (s.project.nodes[nid]?.children?.includes(nodeId)) { parentId = nid as NodeId; break; }
        }
        // 서브트리 수집
        const collect = (id: NodeId, acc: Set<NodeId>) => {
            if (acc.has(id)) return;
            acc.add(id);
            const n = s.project.nodes[id];
            (n?.children ?? []).forEach((cid) => collect(cid as NodeId, acc));
        };
        const toDelete = new Set<NodeId>(); collect(nodeId, toDelete);

        // 부모에서 분리
        if (parentId) {
            const p = s.project.nodes[parentId]!;
            s.project.nodes[parentId] = { ...p, children: (p.children ?? []).filter((cid) => cid !== nodeId) };
        }

        // 실제 삭제
        const newNodes = { ...s.project.nodes };
        toDelete.forEach((id) => delete newNodes[id]);
        s.project.nodes = newNodes;

        // 선택 보정
        if (s.ui.selectedId && toDelete.has(s.ui.selectedId)) {
            s.ui.selectedId = parentId ?? s.project.rootId;
        }
    }, true),
    removePage: (pageId) => {
        get().update(s => {
            if (s.project.pages.length <= 1) return;
            const pageToRemove = s.project.pages.find(p => p.id === pageId)!;
            const nodesToDelete = collectSubtreeIds(s.project.nodes, pageToRemove.rootId);
            const newNodes = { ...s.project.nodes };
            nodesToDelete.forEach(id => delete newNodes[id]);
            s.project.pages = s.project.pages.filter(p => p.id !== pageId);
            if (s.project.rootId === pageToRemove.rootId) {
                s.project.rootId = s.project.pages[0]?.rootId ?? '';
            }
            s.project.nodes = newNodes;
        }, true);
    },
    getParentOf: (id) => findParentId(get().project, id),
    addByDefAt: (defId, parentId, index) => get().update(s => {
        const newId = genId(defId);
        const parentKey = chooseValidParentId(s.project, parentId, s.project.rootId);
        const parent = s.project.nodes[parentKey]!;
        const newNodes = { ...s.project.nodes, [newId]: buildNodeWithDefaults(defId, newId) };
        const newChildren = [...(parent.children ?? [])];
        newChildren.splice(index, 0, newId);
        newNodes[parentKey] = { ...parent, children: newChildren };
        s.project.nodes = newNodes;
    }, true),
    selectPage: (pageId) => get().update(s => { s.project.rootId = s.project.pages.find(p => p.id === pageId)!.rootId; }),
    addPage: (name) => {
        const newId = genId('page');
        const rootId = genId('node_root');
        get().update(s => {
            s.project.nodes = { ...s.project.nodes, [rootId]: buildNodeWithDefaults('box', rootId) };
            s.project.pages = [...s.project.pages, { id: newId, name: name ?? `Page ${s.project.pages.length + 1}`, rootId, slug: `/page-${s.project.pages.length + 1}` }];
            s.ui.panels.left.explorerPreview = { kind: 'page', id: newId };
        }, true);
        return newId;
    },
    addFragment: (name) => {
        const newId = genId('fragment');
        const rootId = genId('frag_root');
        get().update(s => {
            s.project.nodes = { ...s.project.nodes, [rootId]: buildNodeWithDefaults('box', rootId) };
            s.project.fragments = [...s.project.fragments, { id: newId, name: name ?? `Fragment ${s.project.fragments.length + 1}`, rootId }];
        }, true);
        return newId;
    },
    removeFragment: (fragmentId) => get().update(s => {
        const fragToRemove = s.project.fragments.find(f => f.id === fragmentId);
        if (!fragToRemove) return;
        const nodesToDelete = collectSubtreeIds(s.project.nodes, fragToRemove.rootId);
        const newNodes = { ...s.project.nodes };
        nodesToDelete.forEach(id => delete newNodes[id]);
        s.project.fragments = s.project.fragments.filter(f => f.id !== fragmentId);
        s.project.nodes = newNodes;
    }, true),
    addFlowEdge: (edge) => {
        const newId = genId('flow');
        get().update(s => { s.flowEdges = { ...s.flowEdges, [newId]: { ...edge, id: newId } }; }, true);
        return newId;
    },
    updateFlowEdge: (edgeId, patch) => get().update(s => { s.flowEdges = { ...s.flowEdges, [edgeId]: { ...s.flowEdges[edgeId]!, ...patch } }; }, true),
    removeFlowEdge: (edgeId) => get().update(s => { const newFlows = { ...s.flowEdges }; delete newFlows[edgeId]; s.flowEdges = newFlows; }, true),
    setData: (path, value) => get().update(s => { s.data = { ...s.data, [path]: value }; }, true),
    setSetting: (path, value) => get().update(s => { s.settings = { ...s.settings, [path]: value }; }),
    openFragment: (fragmentId) => get().update(s => { s.ui.overlays = [...s.ui.overlays, fragmentId]; }),
    closeFragment: (fragmentId) => get().update(s => { s.ui.overlays = fragmentId ? s.ui.overlays.filter(id => id !== fragmentId) : s.ui.overlays.slice(0, -1); }),
    toggleNodeVisibility: (nodeId) => get().patchNode(nodeId, { isVisible: !(get().project.nodes[nodeId]?.isVisible ?? true) }),
    toggleNodeLock: (nodeId) => get().patchNode(nodeId, { locked: !get().project.nodes[nodeId]?.locked }),
    setActiveViewport: (viewport) => get().update(s => { s.ui.canvas = { ...s.ui.canvas, activeViewport: viewport }; }),
    toggleBottomDock: () => get().update(s => { s.ui.panels.bottom = { ...s.ui.panels.bottom, isCollapsed: !s.ui.panels.bottom.isCollapsed }; }),
    setCanvasZoom: (zoom) => get().update(s => { s.ui.canvas = { ...s.ui.canvas, zoom }; }),
    setCanvasSize: (size) => get().update(s => { s.ui.canvas = { ...s.ui.canvas, ...size }; }),
    toggleCanvasOrientation: () => get().update(s => {
        const { width, height, orientation } = s.ui.canvas;
        s.ui.canvas = { ...s.ui.canvas, width: height, height: width, orientation: orientation === 'landscape' ? 'portrait' : 'landscape' };
    }),
    hydrateDefaults: () => get().update(s => {
        const newNodes = { ...s.project.nodes };
        Object.values(newNodes).forEach((node: Node) => {
            const def = getDefinition(node.componentId);
            if (def) {
                const baseStyles = def.defaults.styles?.element?.base ?? {};
                const currentBase = node.styles.element?.base ?? {};
                node.props = { ...def.defaults.props, ...node.props };
                node.styles.element = { ...node.styles.element, base: { ...baseStyles, ...currentBase } };
            }
        });
        s.project.nodes = newNodes;
    }, true),
}));