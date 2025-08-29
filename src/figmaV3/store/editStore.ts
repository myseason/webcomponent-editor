import { createStore, type StoreApi, type StateCreator } from 'zustand/vanilla';
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
    TemplateDefinition
} from '../core/types';
import { filterStyleKeysByTag } from '../runtime/capabilities';

// --- 초기 상태 정의 ---
const initialProject: Project = {
    pages: [{ id: 'page_home', name: 'Home', rootId: 'node_root_home', slug: '/' }],
    fragments: [],
    nodes: {
        node_root_home: {
            id: 'node_root_home',
            componentId: 'box',
            props: {},
            styles: { element: { base: { minHeight: '400', width: '100%' } } },
            children: [],
            isVisible: true,
            locked: false,
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
            bottom: { heightPx: 240, right: 240, isCollapsed: false, advanced: null },
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
        id,
        componentId: defId,
        props: { ...defProps },
        styles: { element: { base: { ...(defStylesRaw.base ?? {}) } } },
        children: [],
        isVisible: true,
        locked: false,
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
    return fallbackRoot; // Fallback after too many iterations
}

export const editorStore: StoreApi<EditorStoreState> = createStore<EditorStoreState>((set, get) => {
    const update = (fn: (draft: EditorState) => void, recordHistory = false) => {
        const currentState = get();
        if (recordHistory) {
            const currentProject = currentState.project;
            set({
                history: {
                    past: [...currentState.history.past, JSON.parse(JSON.stringify(currentProject))],
                    future: [],
                }
            });
        }
        const draft = JSON.parse(JSON.stringify(currentState));
        fn(draft);
        set(draft);
    };

    const createUndoableAction = <T extends (...args: any[]) => any>(action: T): T => {
        return ((...args: Parameters<T>) => {
            update(() => {}, true); // Take snapshot before action
            return action(...args);
        }) as T;
    };

    const patchNode = createUndoableAction((id: NodeId, patch: Partial<Node>) => {
        update(s => { if (s.project.nodes[id]) Object.assign(s.project.nodes[id]!, patch); });
    });

    return {
        ...initialState,
        update,
        undo: () => {
            const { history } = get();
            if (history.past.length === 0) return;
            const previousProject = history.past[history.past.length - 1];
            set({
                project: previousProject,
                history: {
                    past: history.past.slice(0, -1),
                    future: [get().project, ...history.future],
                },
            });
        },
        redo: () => {
            const { history } = get();
            if (history.future.length === 0) return;
            const nextProject = history.future[0];
            set({
                project: nextProject,
                history: {
                    past: [...history.past, get().project],
                    future: history.future.slice(1),
                },
            });
        },
        // UI Actions
        select: (id) => update(s => { s.ui.selectedId = id; }),
        setActiveViewport: (viewport) => update(s => { s.ui.canvas.activeViewport = viewport; }),
        toggleBottomDock: () => update(s => { s.ui.panels.bottom.isCollapsed = !s.ui.panels.bottom.isCollapsed; }),
        setCanvasZoom: (zoom) => update(s => { s.ui.canvas.zoom = zoom; }),
        setCanvasSize: (size) => update(s => { Object.assign(s.ui.canvas, size); }),
        toggleCanvasOrientation: () => update(s => {
            const { width, height, orientation } = s.ui.canvas;
            s.ui.canvas.width = height;
            s.ui.canvas.height = width;
            s.ui.canvas.orientation = orientation === 'landscape' ? 'portrait' : 'landscape';
        }, true),
        // Data Actions
        patchNode,
        updateNodeProps: createUndoableAction((id, props) => update(s => { Object.assign(s.project.nodes[id]!.props, props); })),
        updateNodeStyles: createUndoableAction((id, styles, viewport) => update(s => {
            const node = s.project.nodes[id]!;
            if (!node.styles.element) node.styles.element = {};
            node.styles.element[viewport] = { ...(node.styles.element[viewport] ?? {}), ...styles };
        })),
        addByDef: createUndoableAction((defId, parentId) => {
            const newId = genId(defId);
            update(s => {
                const parentKey = chooseValidParentId(s.project, parentId ?? s.ui.selectedId, s.project.rootId);
                const parent = s.project.nodes[parentKey];
                if (parent) {
                    s.project.nodes[newId] = buildNodeWithDefaults(defId, newId);
                    parent.children = [...(parent.children ?? []), newId];
                    s.ui.selectedId = newId;
                }
            });
            return newId;
        }),
        addByDefAt: createUndoableAction((defId, parentId, index) => {
            const newId = genId(defId);
            update(s => {
                const parentKey = chooseValidParentId(s.project, parentId, s.project.rootId);
                const parent = s.project.nodes[parentKey];
                if (parent) {
                    s.project.nodes[newId] = buildNodeWithDefaults(defId, newId);
                    const children = [...(parent.children ?? [])];
                    children.splice(index, 0, newId);
                    parent.children = children;
                }
            });
        }),
        moveNode: createUndoableAction((nodeId, newParentId, newIndex) => {
            update(s => {
                const oldParentId = findParentId(s.project, nodeId);
                if (!oldParentId) return;
                const oldParent = s.project.nodes[oldParentId]!;
                oldParent.children = oldParent.children?.filter(id => id !== nodeId);
                const newParent = s.project.nodes[newParentId]!;
                newParent.children = newParent.children ?? [];
                newParent.children.splice(newIndex, 0, nodeId);
            });
        }),
        toggleNodeVisibility: createUndoableAction((nodeId) => patchNode(nodeId, { isVisible: !(get().project.nodes[nodeId]?.isVisible ?? true) })),
        toggleNodeLock: createUndoableAction((nodeId) => patchNode(nodeId, { locked: !get().project.nodes[nodeId]?.locked })),
        getParentOf: (id) => findParentId(get().project, id),
        selectPage: (pageId) => update(s => { s.project.rootId = s.project.pages.find(p=>p.id===pageId)!.rootId; }),
        addPage: createUndoableAction((name) => { const newId = genId('page'); update(s => {}); return newId; }),
        removePage: createUndoableAction((pageId) => {}),
        addFragment: createUndoableAction((name) => { const newId = genId('fragment'); return newId; }),
        removeFragment: createUndoableAction((fragmentId) => {}),
        addFlowEdge: createUndoableAction((edge) => { const newId = genId('flow'); return newId; }),
        updateFlowEdge: createUndoableAction((edgeId, patch) => {}),
        removeFlowEdge: createUndoableAction((edgeId) => {}),
        setData: createUndoableAction((path, value) => {}),
        setSetting: (path, value) => update(s => { s.settings[path] = value; }),
        openFragment: (fragmentId) => update(s => { s.ui.overlays.push(fragmentId); }),
        closeFragment: (fragmentId) => update(s => {}),
        hydrateDefaults: createUndoableAction(() => update(s => {
            Object.values(s.project.nodes).forEach((node: Node) => {
                const def = getDefinition(node.componentId);
                if (def) {
                    node.props = { ...def.defaults.props, ...node.props };
                    const baseStyles = def.defaults.styles?.element?.base ?? {};
                    if (node.styles.element) {
                        node.styles.element.base = { ...baseStyles, ...node.styles.element.base };
                    } else {
                        node.styles.element = { base: baseStyles };
                    }
                }
            });
        })),
    };
});