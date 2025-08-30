import { createStore, type StoreApi } from 'zustand/vanilla';
import { getDefinition } from '../core/registry';
import type {
    EditorState, Project, NodeId, Node, FlowEdge, CSSDict, Viewport, ViewportMode,
} from '../core/types';

// --------------------------- 초기 상태 ---------------------------
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
            activeViewport: 'base',       // 초기 표시
            baseViewport: 'base',         // ★ Base 포인터(초기 desktop)
            vpMode: {                        // ★ 뷰포트별 모드(초기 모두 Unified)
                base: 'Unified',
                tablet: 'Unified',
                mobile: 'Unified',
            },
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

// --------------------------- 유틸 ---------------------------
let _seq = 0;
const genId = (prefix: string): string =>
    `${prefix}_${Date.now().toString(36)}_${++_seq}`;

function buildNodeWithDefaults(defId: string, id: string): Node {
    const def = getDefinition(defId);
    const defProps = def?.defaults.props ?? {};
    const defStyles = def?.defaults.styles?.element?.base ?? {};
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

function findParentId(p: Project, childId: NodeId): NodeId | null {
    for (const nid in p.nodes) {
        if (p.nodes[nid]?.children?.includes(childId)) return nid as NodeId;
    }
    return null;
}

function chooseValidParentId(
    p: Project,
    desiredParent: NodeId | null | undefined,
    fallbackRoot: NodeId
): NodeId {
    if (!desiredParent) return fallbackRoot;
    let currentId: NodeId = desiredParent;
    let guard = 0;
    while (guard++ < 100) {
        const node = p.nodes[currentId];
        if (!node) return fallbackRoot;
        const def = getDefinition(node.componentId);
        const canHaveChildren = def?.capabilities?.canHaveChildren === true || node.componentId === 'box';
        if (canHaveChildren) return currentId;
        const parentId = findParentId(p, currentId);
        if (!parentId) return fallbackRoot;
        currentId = parentId;
    }
    return fallbackRoot;
}

function collectSubtreeIds(nodes: Record<string, Node>, rootId: NodeId): Set<NodeId> {
    const ids = new Set<NodeId>();
    const queue: NodeId[] = [rootId];
    while (queue.length) {
        const id = queue.shift()!;
        if (ids.has(id)) continue;
        ids.add(id);
        const n = nodes[id];
        if (n?.children) queue.push(...(n.children as NodeId[]));
    }
    return ids;
}

// --------------------------- 액션 타입 ---------------------------
type EditorActions = {
    update: (fn: (draft: EditorState) => void, recordHistory?: boolean) => void;
    undo: () => void;
    redo: () => void;

    select: (id: NodeId | null) => void;

    addByDef: (defId: string, parentId?: NodeId) => NodeId;
    addByDefAt: (defId: string, parentId: NodeId, index: number) => void;
    patchNode: (id: NodeId, patch: Partial<Node>) => void;
    updateNodeProps: (id: NodeId, props: Record<string, unknown>) => void;

    // ★ 핵심: 스타일 라우팅 (viewport가 생략되면 activeViewport 기반)
    updateNodeStyles: (id: NodeId, styles: CSSDict | any, viewport?: Viewport) => void;

    moveNode: (nodeId: NodeId, newParentId: NodeId, newIndex: number) => void;
    removeNodeCascade: (nodeId: NodeId) => void;
    toggleNodeVisibility: (nodeId: NodeId) => void;
    toggleNodeLock: (nodeId: NodeId) => void;

    // 페이지/프래그먼트
    selectPage: (pageId: string) => void;
    addPage: (name?: string) => string;
    removePage: (pageId: string) => void;

    addFragment: (name?: string) => string;
    removeFragment: (fragmentId: string) => void;

    // 플로우
    addFlowEdge: (edge: FlowEdge) => string;
    updateFlowEdge: (edgeId: string, patch: Partial<FlowEdge>) => void;
    removeFlowEdge: (edgeId: string) => void;

    // 데이터/설정
    setData: (path: string, value: unknown) => void;
    setSetting: (path: string, value: unknown) => void;

    // 오버레이(Fragment)
    openFragment: (fragmentId: string) => void;
    closeFragment: (fragmentId?: string) => void;

    // 캔버스/뷰포트
    setActiveViewport: (viewport: Viewport) => void;

    // ★ 새로 추가되는 제어
    setBaseViewport: (viewport: Viewport) => void;
    setViewportMode: (viewport: Viewport, mode: ViewportMode) => void;

    toggleBottomDock: () => void;
    setCanvasSize: (size: { width: number; height: number }) => void;
    setCanvasZoom: (zoom: number) => void;
    toggleCanvasOrientation: () => void;

    // StylesSection용
    getEffectiveDecl: (nodeId: NodeId) => CSSDict | null;

    // bootstrap.ts용
    hydrateDefaults: () => void;
};

export type EditorStoreState = EditorState & EditorActions;

// --------------------------- 스토어 ---------------------------
export const editorStore: StoreApi<EditorStoreState> =
    createStore<EditorStoreState>((set, get) => ({
        ...initialState,

        update: (fn, recordHistory = false) => {
            const current = get();
            const nextHistory = recordHistory
                ? { past: [...current.history.past, current.project], future: [] as Project[] }
                : current.history;

            const draft: EditorState = {
                ...current,
                history: nextHistory,
                project: { ...current.project },
                ui: { ...current.ui },
                data: { ...current.data },
                settings: { ...current.settings },
                flowEdges: { ...current.flowEdges },
            };

            fn(draft);
            set(draft as EditorStoreState);
        },

        undo: () => {
            const { history } = get();
            if (!history.past.length) return;
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
            if (!history.future.length) return;
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

        select: (id) => get().update(s => {
            s.ui = { ...s.ui, selectedId: id };
        }),

        patchNode: (id, patch) => get().update(s => {
            s.project.nodes = { ...s.project.nodes, [id]: { ...s.project.nodes[id]!, ...patch } };
        }, true),

        updateNodeProps: (id, props) => get().update(s => {
            const node = s.project.nodes[id]!;
            s.project.nodes = {
                ...s.project.nodes,
                [id]: { ...node, props: { ...node.props, ...props } },
            };
        }, true),

        /**
         * ★ 스타일 라우팅 규칙
         * - 템플릿처럼 element dict 전체가 들어오면 각 뷰포트 키(base/tablet/mobile)별로 분배 병합
         * - 그 외 일반 CSSDict:
         *   - 대상 뷰포트 vp = 매개변수 viewport ?? activeViewport
         *   - 만약 vpMode[vp] === 'Independent' → element[vp]에 병합
         *   - 아니면(Base 모드) → element.base에 병합 (어느 뷰포트에서 편집하든 공통에 기록)
         */
        updateNodeStyles: (id, styles, viewport) => get().update(s => {
            const node = s.project.nodes[id]!;
            const element = node.styles?.element ?? {};

            // 1) 묶음 분배
            const maybeElement = styles as any;
            const hasVpKeys =
                typeof maybeElement === 'object' &&
                (maybeElement.base || maybeElement.tablet || maybeElement.mobile);
            if (hasVpKeys) {
                const nextEl = { ...element };
                (['base', 'tablet', 'mobile'] as Viewport[]).forEach((vp) => {
                    if (maybeElement[vp]) {
                        const prev = (nextEl as any)[vp] ?? {};
                        (nextEl as any)[vp] = { ...prev, ...(maybeElement[vp] as CSSDict) };
                    }
                });
                s.project.nodes = {
                    ...s.project.nodes,
                    [id]: { ...node, styles: { ...node.styles, element: nextEl } },
                };
                return;
            }

            // 2) 일반 CSSDict 라우팅
            const vp: Viewport = (viewport ?? s.ui.canvas.activeViewport) as Viewport;
            const mode = s.ui.canvas.vpMode[vp];           // 'Unified' | 'Independent'
            const targetKey: 'base' | Viewport = mode === 'Independent' ? vp : 'base';

            const prev = (element as any)[targetKey] ?? {};
            const next = { ...prev, ...(styles as CSSDict) };
            const newElement = { ...element, [targetKey]: next };

            s.project.nodes = {
                ...s.project.nodes,
                [id]: { ...node, styles: { ...node.styles, element: newElement } },
            };
        }, true),

        addByDef: (defId, parentId) => {
            const newId = genId(defId);
            get().update(s => {
                const parentKey = chooseValidParentId(
                    s.project,
                    parentId ?? s.ui.selectedId,
                    s.project.rootId,
                );
                const parent = s.project.nodes[parentKey]!;
                const newNode = buildNodeWithDefaults(defId, newId);

                const newNodes = { ...s.project.nodes, [newId]: newNode };
                newNodes[parentKey] = {
                    ...parent,
                    children: [...(parent.children ?? []), newId],
                };

                s.project.nodes = newNodes;
                s.ui.selectedId = newId;
            }, true);
            return newId;
        },

        addByDefAt: (defId, parentId, index) => get().update(s => {
            const newId = genId(defId);
            const parentKey = chooseValidParentId(s.project, parentId, s.project.rootId);
            const parent = s.project.nodes[parentKey]!;
            const newNode = buildNodeWithDefaults(defId, newId);

            const newChildren = [...(parent.children ?? [])];
            newChildren.splice(index, 0, newId);

            s.project.nodes = {
                ...s.project.nodes,
                [newId]: newNode,
                [parentKey]: { ...parent, children: newChildren },
            };
            s.ui.selectedId = newId;
        }, true),

        moveNode: (nodeId, newParentId, newIndex) => get().update(s => {
            const nodes = { ...s.project.nodes };
            const oldParentId = findParentId(s.project, nodeId);

            if (oldParentId) {
                const oldP = { ...nodes[oldParentId]! };
                oldP.children = (oldP.children ?? []).filter((c) => c !== nodeId);
                nodes[oldParentId] = oldP;
            }

            const newP = { ...nodes[newParentId]! };
            const arr = [...(newP.children ?? [])];
            arr.splice(newIndex, 0, nodeId);
            newP.children = arr;
            nodes[newParentId] = newP;

            s.project.nodes = nodes;
        }, true),

        removeNodeCascade: (nodeId) => get().update(s => {
            const toDel = collectSubtreeIds(s.project.nodes, nodeId);

            // 부모에서 끊기
            const parentId = findParentId(s.project, nodeId);
            if (parentId) {
                const p = s.project.nodes[parentId]!;
                s.project.nodes[parentId] = {
                    ...p,
                    children: (p.children ?? []).filter(id => id !== nodeId),
                };
            }

            // 삭제 반영
            const next = { ...s.project.nodes };
            toDel.forEach((id) => delete next[id]);
            s.project.nodes = next;

            // 선택 보정
            if (s.ui.selectedId && toDel.has(s.ui.selectedId)) {
                s.ui.selectedId = parentId ?? s.project.rootId;
            }
        }, true),

        toggleNodeVisibility: (nodeId) => get().update(s => {
            const n = s.project.nodes[nodeId];
            if (!n) return;
            s.project.nodes[nodeId] = { ...n, isVisible: !n.isVisible };
        }, true),

        toggleNodeLock: (nodeId) => get().update(s => {
            const n = s.project.nodes[nodeId];
            if (!n) return;
            s.project.nodes[nodeId] = { ...n, locked: !n.locked };
        }, true),

        // 페이지
        selectPage: (pageId) => get().update(s => {
            const page = s.project.pages.find(p => p.id === pageId);
            if (!page) return;
            s.project.rootId = page.rootId;
            s.ui.selectedId = page.rootId;
        }),

        addPage: (name?: string) => {
            const newId = genId('page');
            const rootId = genId('node_root');
            get().update(s => {
                s.project.nodes = {
                    ...s.project.nodes,
                    [rootId]: buildNodeWithDefaults('box', rootId),
                };
                s.project.pages = [
                    ...s.project.pages,
                    {
                        id: newId,
                        name: name ?? `Page ${s.project.pages.length + 1}`,
                        rootId,
                        slug: `/page-${s.project.pages.length + 1}`,
                    },
                ];
            }, true);
            return newId;
        },

        removePage: (pageId) => get().update(s => {
            if (s.project.pages.length <= 1) return;
            const page = s.project.pages.find(p => p.id === pageId);
            if (!page) return;

            const toDel = collectSubtreeIds(s.project.nodes, page.rootId);
            const nextNodes = { ...s.project.nodes };
            toDel.forEach(id => delete nextNodes[id]);

            s.project.nodes = nextNodes;
            s.project.pages = s.project.pages.filter(p => p.id !== pageId);

            if (s.project.rootId === page.rootId) {
                s.project.rootId = s.project.pages[0]?.rootId ?? s.project.rootId;
                s.ui.selectedId = s.project.rootId;
            }
        }, true),

        // 프래그먼트
        addFragment: (name?: string) => {
            const newId = genId('fragment');
            const rootId = genId('frag_root');
            get().update(s => {
                s.project.nodes = {
                    ...s.project.nodes,
                    [rootId]: buildNodeWithDefaults('box', rootId),
                };
                s.project.fragments = [
                    ...s.project.fragments,
                    { id: newId, name: name ?? `Fragment ${s.project.fragments.length + 1}`, rootId },
                ];
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

        // 플로우
        addFlowEdge: (edge: FlowEdge) => {
            const newId = genId('flow');
            get().update(s => {
                s.flowEdges = { ...s.flowEdges, [newId]: { ...edge, id: newId } };
            }, true);
            return newId;
        },

        updateFlowEdge: (edgeId: string, patch: Partial<FlowEdge>) => get().update(s => {
            if (!s.flowEdges[edgeId]) return;
            s.flowEdges = { ...s.flowEdges, [edgeId]: { ...s.flowEdges[edgeId]!, ...patch } };
        }, true),

        removeFlowEdge: (edgeId: string) => get().update(s => {
            const next = { ...s.flowEdges };
            delete next[edgeId];
            s.flowEdges = next;
        }, true),

        // 데이터/설정
        setData: (path, value) => get().update(s => {
            s.data = { ...s.data, [path]: value };
        }, true),

        setSetting: (path, value) => get().update(s => {
            s.settings = { ...s.settings, [path]: value };
        }),

        // 오버레이(Fragment)
        openFragment: (fragmentId) => get().update(s => {
            s.ui.overlays = [...s.ui.overlays, fragmentId];
        }),

        closeFragment: (fragmentId?) => get().update(s => {
            s.ui.overlays = fragmentId
                ? s.ui.overlays.filter(id => id !== fragmentId)
                : s.ui.overlays.slice(0, -1);
        }),

        // 캔버스/뷰포트
        setActiveViewport: (viewport) => get().update(s => {
            s.ui.canvas = { ...s.ui.canvas, activeViewport: viewport };
        }),

        // ★ Base 선택
        setBaseViewport: (viewport) => get().update(s => {
            s.ui.canvas = { ...s.ui.canvas, baseViewport: viewport };
        }),

        // ★ 모드 토글
        setViewportMode: (viewport, mode) => get().update(s => {
            s.ui.canvas = {
                ...s.ui.canvas,
                vpMode: { ...s.ui.canvas.vpMode, [viewport]: mode },
            };
        }),

        toggleBottomDock: () => get().update(s => {
            s.ui.panels.bottom = {
                ...s.ui.panels.bottom,
                isCollapsed: !s.ui.panels.bottom.isCollapsed,
            };
        }),

        setCanvasZoom: (zoom) => get().update(s => {
            s.ui.canvas = { ...s.ui.canvas, zoom };
        }),

        setCanvasSize: (size) => get().update(s => {
            s.ui.canvas = { ...s.ui.canvas, ...size };
        }),

        toggleCanvasOrientation: () => get().update(s => {
            const { width, height, orientation } = s.ui.canvas;
            s.ui.canvas = {
                ...s.ui.canvas,
                width: height,
                height: width,
                orientation: orientation === 'landscape' ? 'portrait' : 'landscape',
            };
        }),

        // StylesSection: element.base + (Independent라면 element[vp]) 병합 결과
        getEffectiveDecl: (nodeId) => {
            const s = get();
            const node = s.project.nodes[nodeId];
            if (!node) return null;
            const element = node.styles?.element ?? {};
            const base = (element as any).base ?? {};
            const vp = s.ui.canvas.activeViewport;
            const isIndep = s.ui.canvas.vpMode[vp] === 'Independent';
            const ov = isIndep ? ((element as any)[vp] ?? {}) : {};
            return { ...base, ...ov };
        },

        // bootstrap 기본값 주입
        hydrateDefaults: () => get().update(s => {
            const nodes = { ...s.project.nodes };
            for (const id in nodes) {
                const node = nodes[id];
                if (!node) continue;
                const def = getDefinition(node.componentId);
                if (!def) continue;

                const defProps = def.defaults?.props ?? {};
                const nextProps = { ...defProps, ...(node.props ?? {}) };

                const element = node.styles?.element ?? {};
                const defBase = def.defaults?.styles?.element?.base ?? {};
                const curBase = (element as any).base ?? {};
                const nextElement = { ...element, base: { ...defBase, ...curBase } };

                nodes[id] = {
                    ...node,
                    props: nextProps,
                    styles: { ...node.styles, element: nextElement },
                };
            }
            s.project.nodes = nodes;
        }, true),
    }));