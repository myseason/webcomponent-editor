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
    TemplateDefinition
} from '../core/types';
import { filterStyleKeysByTag } from '../runtime/capabilities';

const initialProject: Project = {
    pages: [{ id: 'page_home', name: 'Home', rootId: 'node_root_home', slug: '/' }],
    fragments: [],
    nodes: {
        node_root_home: {
            id: 'node_root_home', componentId: 'box', props: {},
            styles: { element: { base: { minHeight: '100%' } } },
            children: [], isVisible: true, locked: false,
        },
    },
    rootId: 'node_root_home',
};

const initialState: EditorState = {
    project: initialProject,
    ui: {
        selectedId: null, mode: 'Page', expertMode: false, overlays: [],
        canvas: { width: 1280, activeViewport: 'base', zoom: 1, height: 800, orientation: 'landscape' },
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

function findParentId(p: Project, childId: NodeId): NodeId | null {
    for (const nid in p.nodes) {
        if (p.nodes[nid]?.children?.includes(childId)) return nid;
    }
    return null;
}
function buildNodeWithDefaults(defId: string, id: string): Node { return {} as Node; }


export const editorStore: StoreApi<EditorStoreState> = createStore<EditorStoreState>((set, get) => ({
    ...initialState,
    update: (fn: (draft: EditorState) => void, recordHistory = false) => {
        const { project, history } = get();
        if (recordHistory) {
            const newPast = [...history.past, JSON.parse(JSON.stringify(project))];
            set({ history: { past: newPast, future: [] } });
        }
        set((state: EditorState) => {
            const draft = JSON.parse(JSON.stringify(state));
            fn(draft);
            return draft;
        });
    },
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
    patchNode: (id, patch) => get().update(s => { Object.assign(s.project.nodes[id]!, patch); }, true),
    updateNodeProps: (id, props) => get().update(s => { Object.assign(s.project.nodes[id]!.props, props); }, true),
    updateNodeStyles: (id, styles, viewport) => get().update(s => {
        const node = s.project.nodes[id]!;
        if (!node.styles.element) node.styles.element = {};
        node.styles.element[viewport] = { ...(node.styles.element[viewport] ?? {}), ...styles };
    }, true),
    addByDef: (defId, parentId) => {
        const newId = genId(defId);
        get().update(s => { /* implementation */ }, true);
        return newId;
    },
    select: (id) => get().update(s => { s.ui.selectedId = id; }),
    setActiveViewport: (viewport) => get().update(s => { s.ui.canvas.activeViewport = viewport; }),
    toggleBottomDock: () => get().update(s => { s.ui.panels.bottom.isCollapsed = !s.ui.panels.bottom.isCollapsed; }),
    setCanvasZoom: (zoom) => get().update(s => { s.ui.canvas.zoom = zoom; }),
    setCanvasSize: (size) => get().update(s => { Object.assign(s.ui.canvas, size); }),
    toggleCanvasOrientation: () => get().update(s => {
        const { width, height, orientation } = s.ui.canvas;
        s.ui.canvas.width = height;
        s.ui.canvas.height = width;
        s.ui.canvas.orientation = orientation === 'landscape' ? 'portrait' : 'landscape';
    }, true),
    getParentOf: (id) => findParentId(get().project, id),
    addByDefAt: (defId, parentId, index) => get().update(s => {}, true),
    selectPage: (pageId) => get().update(s => {}),
    addPage: (name) => { return genId('page'); },
    removePage: (pageId) => get().update(s => {}, true),
    addFragment: (name) => { return genId('fragment'); },
    removeFragment: (fragmentId) => get().update(s => {}, true),
    addFlowEdge: (edge) => { return genId('flow'); },
    updateFlowEdge: (edgeId, patch) => get().update(s => {}, true),
    removeFlowEdge: (edgeId) => get().update(s => {}, true),
    setData: (path, value) => get().update(s => {}, true),
    setSetting: (path, value) => get().update(s => {}),
    openFragment: (fragmentId) => get().update(s => {}),
    closeFragment: (fragmentId) => get().update(s => {}),
    moveNode: (nodeId, newParentId, newIndex) => get().update(s => {}, true),
    toggleNodeVisibility: (nodeId) => get().update(s => {}, true),
    toggleNodeLock: (nodeId) => get().update(s => {}, true),
    hydrateDefaults: () => get().update(s => {
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
    }, true),
}));