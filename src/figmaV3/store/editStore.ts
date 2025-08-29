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
            bottom: { heightPx: 240, right: 160, isCollapsed: false, advanced: null },
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


export const editorStore: StoreApi<EditorStoreState> = createStore<EditorStoreState>((set, get) => {

    const update = (fn: (draft: EditorState) => void, recordHistory = false) => {
        if (recordHistory) {
            const currentProject = get().project;
            set(state => ({
                history: {
                    past: [...state.history.past, JSON.parse(JSON.stringify(currentProject))],
                    future: [],
                }
            }));
        }
        set(state => Object.assign({}, state, fn(state)));
    };

    const createUndoableAction = <T extends (...args: any[]) => any>(action: T): T => {
        return ((...args: Parameters<T>) => {
            update(() => {}, true);
            return action(...args);
        }) as T;
    };

    const patchNode = createUndoableAction((id: NodeId, patch: Partial<Node>) => {
        set(state => ({
            project: { ...state.project, nodes: { ...state.project.nodes, [id]: { ...state.project.nodes[id]!, ...patch } } }
        }));
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
        select: (id) => set(state => ({ ui: { ...state.ui, selectedId: id } })),
        setActiveViewport: (viewport) => set(state => ({ ui: { ...state.ui, canvas: { ...state.ui.canvas, activeViewport: viewport } } })),
        toggleBottomDock: () => set(state => ({ ui: { ...state.ui, panels: { ...state.ui.panels, bottom: { ...state.ui.panels.bottom, isCollapsed: !state.ui.panels.bottom.isCollapsed }}}})),
        setCanvasZoom: (zoom) => set(state => ({ ui: { ...state.ui, canvas: { ...state.ui.canvas, zoom } } })),
        setCanvasSize: (size) => set(state => ({ ui: { ...state.ui, canvas: { ...state.ui.canvas, ...size } } })),
        toggleCanvasOrientation: () => set(state => {
            const { width, height, orientation } = state.ui.canvas;
            return { ui: { ...state.ui, canvas: { ...state.ui.canvas, width: height, height: width, orientation: orientation === 'landscape' ? 'portrait' : 'landscape' }}};
        }),
        patchNode,
        updateNodeProps: createUndoableAction((id, props) => {
            set(state => ({
                project: { ...state.project, nodes: { ...state.project.nodes, [id]: { ...state.project.nodes[id]!, props: { ...state.project.nodes[id]!.props, ...props } } } }
            }));
        }),
        updateNodeStyles: createUndoableAction((id, styles, viewport) => {
            set(state => {
                const node = state.project.nodes[id]!;
                const element = node.styles.element ?? {};
                const newStyles = { ...element, [viewport]: { ...(element[viewport] ?? {}), ...styles } };
                return { project: { ...state.project, nodes: { ...state.project.nodes, [id]: { ...node, styles: { ...node.styles, element: newStyles } } } } };
            });
        }),
        addByDef: createUndoableAction((defId, parentId) => {
            const newId = genId(defId);
            set(state => {
                const parentKey = chooseValidParentId(state.project, parentId ?? state.ui.selectedId, state.project.rootId);
                const parent = state.project.nodes[parentKey]!;
                const newNode = buildNodeWithDefaults(defId, newId);
                return {
                    project: { ...state.project, nodes: { ...state.project.nodes, [newId]: newNode, [parentKey]: { ...parent, children: [...(parent.children ?? []), newId] } } },
                    ui: { ...state.ui, selectedId: newId }
                };
            });
            return newId;
        }),
        addByDefAt: createUndoableAction((defId, parentId, index) => {
            const newId = genId(defId);
            set(state => {
                const parentKey = chooseValidParentId(state.project, parentId, state.project.rootId);
                const parent = state.project.nodes[parentKey]!;
                const newNode = buildNodeWithDefaults(defId, newId);
                const newChildren = [...(parent.children ?? [])];
                newChildren.splice(index, 0, newId);
                return { project: { ...state.project, nodes: { ...state.project.nodes, [newId]: newNode, [parentKey]: { ...parent, children: newChildren } } } };
            });
        }),
        moveNode: createUndoableAction((nodeId, newParentId, newIndex) => {
            set(state => {
                const oldParentId = findParentId(state.project, nodeId);
                if (!oldParentId) return state;

                const nodes = { ...state.project.nodes };
                const oldParent = { ...nodes[oldParentId]! };
                oldParent.children = (oldParent.children ?? []).filter(id => id !== nodeId);
                nodes[oldParentId] = oldParent;

                const newParent = { ...nodes[newParentId]! };
                const newChildren = [...(newParent.children ?? [])];
                newChildren.splice(newIndex, 0, nodeId);
                newParent.children = newChildren;
                nodes[newParentId] = newParent;

                return { project: { ...state.project, nodes } };
            });
        }),
        getParentOf: (id) => findParentId(get().project, id),
        selectPage: (pageId) => set(state => ({ project: { ...state.project, rootId: state.project.pages.find(p => p.id === pageId)!.rootId } })),
        addPage: createUndoableAction((name) => {
            const newId = genId('page');
            const rootId = genId('node_root');
            set(state => {
                const rootNode = buildNodeWithDefaults('box', rootId);
                const newPage: Page = { id: newId, name: name ?? `Page ${state.project.pages.length + 1}`, rootId, slug: `/page-${state.project.pages.length + 1}` };
                return {
                    project: { ...state.project, pages: [...state.project.pages, newPage], nodes: { ...state.project.nodes, [rootId]: rootNode } },
                    ui: { ...state.ui, panels: { ...state.ui.panels, left: { ...state.ui.panels.left, explorerPreview: { kind: 'page', id: newId }}}}
                };
            });
            return newId;
        }),
        removePage: createUndoableAction((pageId) => {
            set(state => {
                if (state.project.pages.length <= 1) return state;
                const pageToRemove = state.project.pages.find(p => p.id === pageId)!;
                const nodesToRemove = collectSubtreeIds(state.project.nodes, pageToRemove.rootId);
                const newNodes = { ...state.project.nodes };
                nodesToRemove.forEach(id => delete newNodes[id]);
                return {
                    project: { ...state.project, pages: state.project.pages.filter(p => p.id !== pageId), nodes: newNodes },
                    ui: { ...state.ui, selectedId: state.ui.selectedId === pageToRemove.rootId ? null : state.ui.selectedId }
                };
            });
        }),
        addFragment: createUndoableAction((name) => {
            const newId = genId('fragment');
            const rootId = genId('frag_root');
            set(state => {
                const rootNode = buildNodeWithDefaults('box', rootId);
                const newFragment: Fragment = { id: newId, name: name ?? `Fragment ${state.project.fragments.length + 1}`, rootId };
                return { project: { ...state.project, fragments: [...state.project.fragments, newFragment], nodes: { ...state.project.nodes, [rootId]: rootNode } } };
            });
            return newId;
        }),
        removeFragment: createUndoableAction((fragmentId) => set(state => ({ project: { ...state.project, fragments: state.project.fragments.filter(f => f.id !== fragmentId) } }))),
        addFlowEdge: createUndoableAction((edge) => { const newId = genId('flow'); set(state => ({ flowEdges: { ...state.flowEdges, [newId]: { ...edge, id: newId } } })); return newId; }),
        updateFlowEdge: createUndoableAction((edgeId, patch) => set(state => ({ flowEdges: { ...state.flowEdges, [edgeId]: { ...state.flowEdges[edgeId]!, ...patch } } }))),
        removeFlowEdge: createUndoableAction((edgeId) => set(state => { const newFlows = { ...state.flowEdges }; delete newFlows[edgeId]; return { flowEdges: newFlows }; })),
        setData: createUndoableAction((path, value) => set(state => ({ data: { ...state.data, [path]: value } }))),
        setSetting: (path, value) => set(state => ({ settings: { ...state.settings, [path]: value } })),
        openFragment: (fragmentId) => set(state => ({ ui: { ...state.ui, overlays: [...state.ui.overlays, fragmentId] } })),
        closeFragment: (fragmentId) => set(state => ({ ui: { ...state.ui, overlays: fragmentId ? state.ui.overlays.filter(id => id !== fragmentId) : state.ui.overlays.slice(0, -1) } })),
        toggleNodeVisibility: (nodeId) => patchNode(nodeId, { isVisible: !(get().project.nodes[nodeId]?.isVisible ?? true) }),
        toggleNodeLock: (nodeId) => patchNode(nodeId, { locked: !get().project.nodes[nodeId]?.locked }),
        hydrateDefaults: createUndoableAction(() => { /* ... */ }),
    };
});