import { createStore, type StoreApi } from 'zustand/vanilla';
import { getDefinition } from '../core/registry';
import type {
    EditorState,
    Project,
    NodeId,
    Node,
    FlowEdge,
    CSSDict,
    StyleBase,
    Viewport,
    EditorUI,
} from '../core/types';
import { filterStyleKeysByTag } from '../runtime/capabilities';

const initialProject: Project = {
    pages: [{ id: 'page_home', name: 'Home', rootId: 'node_root_home', slug: '/' }],
    fragments: [],
    nodes: {
        node_root_home: {
            id: 'node_root_home',
            componentId: 'box',
            props: {},
            styles: { element: { base: { minHeight: '100vh' } } },
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
        // Global
        selectedId: null,
        mode: 'Page',
        expertMode: false,
        overlays: [],
        // Canvas
        canvas: {
            width: 1280,
            activeViewport: 'base',
        },
        // Panels
        panels: {
            left: {
                tab: 'Composer',
                widthPx: 320,
                splitPct: 60,
                explorerPreview: null,
            },
            right: {
                widthPx: 420,
            },
            bottom: {
                heightPx: 240,
                right: 240,
                advanced: null,
                isCollapsed: false,
            },
        },
    },
    data: {},
    settings: {},
    flowEdges: {},
};

type EditorActions = {
    update: (fn: (draft: EditorState) => void) => void;
    select: (id: NodeId | null) => void;
    getParentOf: (id: NodeId) => NodeId | null;
    addByDef: (defId: string, parentId?: string) => NodeId;
    addByDefAt: (defId: string, parentId: string, index: number) => NodeId;
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
    toggleBottomDock: () => void; // ✅ [추가] 새로운 액션 타입

};

export type EditorStoreState = EditorState & EditorActions;

let _seq = 0;
const genId = (prefix: string): string => `${prefix}_${Date.now().toString(36)}_${++_seq}`;

function buildNodeWithDefaults(defId: string, id: string): Node {
    const def = getDefinition(defId);
    const defProps = (def?.defaults?.props ?? {}) as Record<string, unknown>;
    const defStylesRaw = (def?.defaults?.styles?.element ?? {}) as Partial<Record<Viewport, CSSDict>>;

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
    let curId: NodeId = desiredParent && p.nodes[desiredParent] ? desiredParent : fallbackRoot;
    let current = p.nodes[curId];
    if (!current) return fallbackRoot;

    if (isContainerDef(current.componentId)) return curId;

    let guard = 0;
    while (guard++ < 1024) {
        const parentId = findParentId(p, curId);
        if (!parentId) break;
        const parent = p.nodes[parentId];
        if (parent && isContainerDef(parent.componentId)) return parentId;
        curId = parentId;
    }
    return isContainerDef(p.nodes[curId]!.componentId) ? curId : fallbackRoot;
}

export const editorStore: StoreApi<EditorStoreState> = createStore(
    (set, get) => {
        const update: EditorActions['update'] = (fn) => {
            const cur = get();
            // Use a safe deep copy for state manipulation to avoid mutation issues.
            const draft: EditorState = JSON.parse(JSON.stringify(cur));
            fn(draft);
            set(draft);
        };

        const select: EditorActions['select'] = (id) => update(s => { s.ui.selectedId = id; });

        const getParentOf: EditorActions['getParentOf'] = (id) => findParentId(get().project, id);

        const addByDef: EditorActions['addByDef'] = (defId, parentId) => {
            const newId = genId(`node_${defId}`);
            update(s => {
                const desired = parentId ?? s.ui.selectedId ?? s.project.rootId;
                const parentKey = chooseValidParentId(s.project, desired, s.project.rootId);
                const parent = s.project.nodes[parentKey];
                if(parent) {
                    const newNode = buildNodeWithDefaults(defId, newId);
                    s.project.nodes[newId] = newNode;
                    parent.children = [...(parent.children ?? []), newId];
                    s.ui.selectedId = newId;
                }
            });
            return newId;
        };

        const addByDefAt: EditorActions['addByDefAt'] = (defId, parentId, index) => {
            const newId = genId(`node_${defId}`);
            update(s => {
                const parentKey = chooseValidParentId(s.project, parentId, s.project.rootId);
                const parent = s.project.nodes[parentKey];
                if(parent) {
                    const newNode = buildNodeWithDefaults(defId, newId);
                    s.project.nodes[newId] = newNode;
                    const children = [...(parent.children ?? [])];
                    children.splice(index, 0, newId);
                    parent.children = children;
                    s.ui.selectedId = newId;
                }
            });
            return newId;
        };

        const patchNode: EditorActions['patchNode'] = (id, patch) => update(s => {
            if (s.project.nodes[id]) {
                Object.assign(s.project.nodes[id]!, patch);
            }
        });

        const updateNodeProps: EditorActions['updateNodeProps'] = (id, props) => update(s => {
            const node = s.project.nodes[id];
            if (node) {
                node.props = { ...node.props, ...props };
            }
        });

        const updateNodeStyles: EditorActions['updateNodeStyles'] = (id, styles, viewport) => update(s => {
            const node = s.project.nodes[id];
            if (!node) return;

            const tag = (node.props as any).__tag ?? 'div';
            const allowed = filterStyleKeysByTag(tag, Object.keys(styles), s.project.tagPolicies);
            const picked = Object.fromEntries(Object.entries(styles).filter(([k]) => allowed.includes(k)));

            if (!node.styles.element) node.styles.element = {};
            node.styles.element[viewport] = { ...(node.styles.element[viewport] ?? {}), ...picked };
        });

        const selectPage: EditorActions['selectPage'] = (pageId) => update(s => {
            const page = s.project.pages.find(p => p.id === pageId);
            if (page) s.project.rootId = page.rootId;
        });

        const addPage: EditorActions['addPage'] = (name) => {
            const pageId = genId('page');
            const rootId = genId('node_root');
            update((s) => {
                const rootNode = buildNodeWithDefaults('box', rootId);
                s.project.nodes[rootId] = rootNode;
                s.project.pages.push({ id: pageId, name: name ?? `Page ${s.project.pages.length + 1}`, rootId, slug: `/${name?.toLowerCase().replace(/\s+/g, '-') ?? `page-${s.project.pages.length + 1}`}` });
            });
            return pageId;
        };

        const removePage: EditorActions['removePage'] = (pageId) => update(s => {
            if (s.project.pages.length <= 1) return;
            s.project.pages = s.project.pages.filter(p => p.id !== pageId);
        });

        const addFragment: EditorActions['addFragment'] = (name) => {
            const fragId = genId('fragment');
            const rootId = genId('frag_root');
            update((s) => {
                const rootNode = buildNodeWithDefaults('box', rootId);
                s.project.nodes[rootId] = rootNode;
                s.project.fragments.push({ id: fragId, name: name ?? `Fragment ${s.project.fragments.length + 1}`, rootId });
            });
            return fragId;
        };

        const removeFragment: EditorActions['removeFragment'] = (fragmentId) => update(s => {
            s.project.fragments = s.project.fragments.filter(f => f.id !== fragmentId);
        });

        const addFlowEdge: EditorActions['addFlowEdge'] = (edge) => {
            const id = genId('flow');
            update(s => { s.flowEdges[id] = { ...edge, id }; });
            return id;
        };

        const updateFlowEdge: EditorActions['updateFlowEdge'] = (edgeId, patch) => update(s => {
            if (s.flowEdges[edgeId]) {
                Object.assign(s.flowEdges[edgeId]!, patch);
            }
        });

        const removeFlowEdge: EditorActions['removeFlowEdge'] = (edgeId) => update(s => {
            delete s.flowEdges[edgeId];
        });

        const setData: EditorActions['setData'] = (path, value) => update(s => { s.data[path] = value; });

        const setSetting: EditorActions['setSetting'] = (path, value) => update(s => { s.settings[path] = value; });

        const openFragment: EditorActions['openFragment'] = (fragmentId) => update(s => { s.ui.overlays.push(fragmentId); });

        const closeFragment: EditorActions['closeFragment'] = (fragmentId) => update(s => {
            if (fragmentId) {
                s.ui.overlays = s.ui.overlays.filter(id => id !== fragmentId);
            } else {
                s.ui.overlays.pop();
            }
        });

        const hydrateDefaults: EditorActions['hydrateDefaults'] = () => update(s => {
            Object.values(s.project.nodes).forEach(node => {
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
        });

        const setActiveViewport: EditorActions['setActiveViewport'] = (viewport) => update(s => { s.ui.canvas.activeViewport = viewport; });

        const moveNode: EditorActions['moveNode'] = (nodeId, newParentId, newIndex) => update(s => {
            const oldParentId = findParentId(s.project, nodeId);
            if (!oldParentId) return;

            const oldParent = s.project.nodes[oldParentId]!;
            oldParent.children = (oldParent.children ?? []).filter(id => id !== nodeId);

            const newParent = s.project.nodes[newParentId]!;
            const newChildren = [...(newParent.children ?? [])];
            newChildren.splice(newIndex, 0, nodeId);
            newParent.children = newChildren;
        });

        const toggleNodeVisibility: EditorActions['toggleNodeVisibility'] = (nodeId) => patchNode(nodeId, { isVisible: !(get().project.nodes[nodeId]?.isVisible ?? true) });

        const toggleNodeLock: EditorActions['toggleNodeLock'] = (nodeId) => patchNode(nodeId, { locked: !get().project.nodes[nodeId]?.locked });

        // ✅ [추가] 하단 패널 접힘 상태를 토글하는 액션 구현
        const toggleBottomDock: EditorActions['toggleBottomDock'] = () => {
            update(s => {
                s.ui.panels.bottom.isCollapsed = !s.ui.panels.bottom.isCollapsed;
            });
        };


        return {
            ...initialState,
            update, select, getParentOf, addByDef, addByDefAt, patchNode,
            updateNodeProps, updateNodeStyles, selectPage, addPage, removePage,
            addFragment, removeFragment, addFlowEdge, updateFlowEdge, removeFlowEdge,
            setData, setSetting, openFragment, closeFragment, hydrateDefaults,
            setActiveViewport, moveNode, toggleNodeVisibility, toggleNodeLock,toggleBottomDock,
        };
    }
);