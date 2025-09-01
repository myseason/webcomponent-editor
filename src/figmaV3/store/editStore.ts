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
    EditorMode,
    ProjectHubTab,
    Asset,
    Page,
    Fragment,
    ComponentPolicy,
    ComponentDefinition,
} from '../core/types';
import { deepMerge } from '../runtime/deepMerge';

// ... (초기 상태 및 일부 유틸리티는 이전과 동일)
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
    assets: [],
    globalCss: '/* Global CSS styles */',
    globalJs: '// Global JavaScript',
};

const initialState: EditorState = {
    project: initialProject,
    ui: {
        selectedId: null,
        mode: 'Page',
        expertMode: false,
        overlays: [],
        editingFragmentId: null,
        notification: null,
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
            left: {
                activeHubTab: 'Pages',
                widthPx: 320,
                lastActivePageId: null,
                lastActiveFragmentId: null,
                isSplit: false,
                splitPercentage: 50,
            },
            right: { widthPx: 420 },
            bottom: { heightPx: 240, isCollapsed: false, advanced: null },
        },
    },
    data: {},
    settings: {},
    flowEdges: {},
    history: { past: [], future: [] },
};
let _seq = 0;
const genId = (prefix: string): string =>
    `${prefix}_${Date.now().toString(36)}_${++_seq}`;

function setByPath(root: any, path: string, value: unknown) {
    const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
    const out = { ...(root ?? {}) };
    let cur: any = out;
    for (let i = 0; i < parts.length - 1; i++) {
        const k = parts[i];
        const prev = cur[k];
        cur[k] =
            Array.isArray(prev) ? [...prev]
                : (prev && typeof prev === 'object') ? { ...prev }
                    : {};
        cur = cur[k];
    }
    cur[parts[parts.length - 1]] = value;
    return out;
}

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

function cloneSubtree(nodes: Record<NodeId, Node>, srcRootId: NodeId): { nodes: Record<NodeId, Node>; newRootId: NodeId } {
    const newNodes: Record<NodeId, Node> = {};
    const idMap = new Map<NodeId, NodeId>();

    const cloneNode = (id: NodeId): NodeId | null => {
        if (idMap.has(id)) return idMap.get(id)!;

        const oldNode = nodes[id];
        if (!oldNode) {
            console.warn(`Node not found during clone: ${id}. Skipping.`);
            return null;
        }

        const newId = genId('node');
        idMap.set(id, newId);

        const newChildren = (oldNode.children?.map(cloneNode).filter(Boolean) as NodeId[]) ?? [];

        newNodes[newId] = {
            ...JSON.parse(JSON.stringify(oldNode)),
            id: newId,
            children: newChildren,
        };
        return newId;
    };

    const newRootId = cloneNode(srcRootId);
    if (!newRootId) throw new Error("Failed to clone root node.");

    return { nodes: newNodes, newRootId };
}


// ✨ [수정] 스토어 외부 헬퍼 함수로 재정의하여 명확성 확보
function findParentId(nodes: Record<NodeId, Node>, childId: NodeId): NodeId | null {
    for (const nid of Object.keys(nodes)) {
        const n = nodes[nid]!;
        if (n.children && n.children.includes(childId)) return nid;
    }
    return null;
}

function isContainer(def: ComponentDefinition | undefined): boolean {
    if (!def)
        return false;

    // Box만 가능
    if (def.id === 'box')
        return true;
    //return def.capabilities?.canHaveChildren === true;
    return false
}

function chooseValidParentId(
    project: Project,
    desiredParentId: NodeId
): NodeId {
    let currentId: NodeId | null = desiredParentId;

    // 100회 이상 탐색하면 무한 루프 방지를 위해 최상위로 이동
    for (let i = 0; i < 100; i++) {
        if (!currentId) break;

        const node = project.nodes[currentId];
        if (node) {
            const def = getDefinition(node.componentId);
            if (isContainer(def)) {
                return currentId;
            }
        }
        currentId = findParentId(project.nodes, currentId);
    }

    // 적합한 부모를 찾지 못하면, 현재 페이지의 최상위 루트 노드를 반환
    return project.rootId;
}


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
    selectPage: (pageId: string) => void;
    addPage: (name?: string) => string;
    removePage: (pageId: string) => void;
    duplicatePage: (pageId: string) => void;
    openFragment: (fragmentId?: string) => void;
    closeFragment: (fragmentId?: string) => void;
    addFragment: (name?: string) => string;
    removeFragment: (fragmentId: string) => void;
    updateFragment: (fragmentId: string, patch: Partial<Omit<Fragment, 'id' | 'rootId'>>) => void;
    addFlowEdge: (edge: FlowEdge) => void;
    updateFlowEdge: (edgeId: string, patch: Partial<FlowEdge>) => void;
    removeFlowEdge: (edgeId: string) => void;
    setCanvasSize: (size: { width: number; height: number }) => void;
    setCanvasZoom: (zoom: number) => void;
    toggleCanvasOrientation: () => void;
    toggleBottomDock: () => void;
    setActiveViewport: (viewport: Viewport) => void;
    setBaseViewport: (viewport: Viewport) => void;
    setViewportMode: (viewport: Viewport, mode: ViewportMode) => void;
    setEditorMode: (mode: EditorMode) => void;
    setActiveHubTab: (tab: ProjectHubTab) => void;
    openComponentEditor: (fragmentId: string) => void;
    closeComponentEditor: () => void;
    addAsset: (asset: Omit<Asset, 'id'>) => string;
    removeAsset: (assetId: string) => void;
    updateGlobalCss: (css: string) => void;
    updateGlobalJs: (js: string) => void;
    getEffectiveDecl: (nodeId: NodeId) => CSSDict | null;
    setData: (path: string, value: unknown) => void;
    setSetting: (key: string, value: unknown) => void;
    setNotification: (message: string) => void;
    toggleLeftPanelSplit: () => void;
    setLeftPanelSplitPercentage: (percentage: number) => void;
    updateComponentPolicy: (componentId: string, patch: Partial<ComponentPolicy>) => void;
    saveNodeAsComponent: (nodeId: NodeId, name: string, description: string, isPublic: boolean) => void;
    publishComponent: () => void;
    insertComponent: (fragmentId: string, parentId?: NodeId) => void;
    hydrateDefaults: () => void;
};

export type EditorStoreState = EditorState & EditorActions;

export const editorStore: StoreApi<EditorStoreState> = createStore<EditorStoreState>((set, get) => ({
    ...initialState,

    // ... (대부분의 액션은 변경 없음)
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
        const nextSelected = prev.nodes[current.ui.selectedId ?? ''] ? current.ui.selectedId : prev.rootId;
        set({
            ...current,
            project: prev,
            ui: { ...current.ui, selectedId: nextSelected },
            history: { past, future }
        });
    },

    redo: () => {
        const current = get();
        if (current.history.future.length === 0) return;
        const next = current.history.future[0];
        const future = current.history.future.slice(1);
        const past = [...current.history.past, current.project];
        const nextSelected = next.nodes[current.ui.selectedId ?? ''] ? current.ui.selectedId : next.rootId;
        set({
            ...current,
            project: next,
            ui: { ...current.ui, selectedId: nextSelected },
            history: { past, future }
        });
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

    // ✨ [수정] addByDef 액션이 새로운 chooseValidParentId 함수를 사용하도록 수정
    addByDef : (defId, parentId) => {
        const newId = genId(`node_${defId}`);
        get().update((s: EditorState) => {
            const p = s.project;
            s.project.nodes[newId] = buildNodeWithDefaults(defId, newId);

            const desiredParentId = parentId ?? s.ui.selectedId ?? p.rootId;
            const finalParentId = chooseValidParentId(p, desiredParentId);

            const parentNode = s.project.nodes[finalParentId]!;
            if (!parentNode.children) parentNode.children = [];
            parentNode.children.push(newId);

            s.ui.selectedId = newId;
        }, true);
        return newId;
    },

    addByDefAt: (defId, parentId, index) => {
        const newId = genId(`node_${defId}`);
        get().update((s: EditorState) => {
            const p = s.project;
            s.project.nodes[newId] = buildNodeWithDefaults(defId, newId);

            // at index는 항상 컨테이너를 부모로 가정
            const parentNode = s.project.nodes[parentId]!;
            if (!parentNode.children) parentNode.children = [];

            const clamped = Math.max(0, Math.min(index, parentNode.children.length));
            parentNode.children.splice(clamped, 0, newId);

            s.ui.selectedId = newId;
        }, true);
        return newId;
    },

    moveNode: (nodeId, newParentId, newIndex) => get().update(s => {
        if (nodeId === s.project.rootId) return;

        const oldParentId = findParentId(s.project.nodes, nodeId);
        if (oldParentId) {
            s.project.nodes[oldParentId]!.children = (s.project.nodes[oldParentId]!.children ?? []).filter(c => c !== nodeId);
        }

        const parentNode = s.project.nodes[newParentId]!;
        if (!parentNode.children) parentNode.children = [];
        const idx = Math.max(0, Math.min(newIndex ?? parentNode.children.length, parentNode.children.length));
        parentNode.children.splice(idx, 0, nodeId);
    }, true),

    removeNodeCascade: (nodeId) => get().update((s) => {
        if (nodeId === s.project.rootId) return;
        const nodes = s.project.nodes;
        const parentId = findParentId(nodes, nodeId);
        if (parentId) {
            nodes[parentId]!.children = (nodes[parentId]!.children ?? []).filter(cid => cid !== nodeId);
        }
        const toDelete = collectSubtreeIds(nodes, nodeId);
        for (const id of toDelete) delete nodes[id];
        s.ui.selectedId = nodes[s.ui.selectedId ?? ''] ? s.ui.selectedId : parentId ?? s.project.rootId;
    }, true),

    toggleNodeVisibility: (nodeId) => get().update((s) => {
        const n = s.project.nodes[nodeId]; if (!n) return;
        n.isVisible = !n.isVisible;
    }, true),

    toggleNodeLock: (nodeId) => get().update((s) => {
        const n = s.project.nodes[nodeId]; if (!n) return;
        n.locked = !n.locked;
    }, true),

    selectPage: (pageId) => get().update((s) => {
        const page = s.project.pages.find(p => p.id === pageId);
        if (!page) return;
        s.project.rootId = page.rootId;
        s.ui.selectedId = page.rootId;
        s.ui.panels.left.lastActivePageId = pageId;
    }, false),

    addPage: (name) => {
        const pageId = genId('page');
        const rootId = genId('node');
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
        const nextNodes = { ...s.project.nodes };
        toDel.forEach(id => delete nextNodes[id]);
        s.project.nodes = nextNodes;
        s.project.pages = s.project.pages.filter(p => p.id !== pageId);
        if (s.project.rootId === page.rootId && s.project.pages[0]) {
            s.project.rootId = s.project.pages[0].rootId;
            s.ui.selectedId = s.project.rootId;
        }
    }, true),

    duplicatePage: (pageId) => get().update(s => {
        const originalPage = s.project.pages.find(p => p.id === pageId);
        if (!originalPage) return;
        const { nodes: clonedNodes, newRootId } = cloneSubtree(s.project.nodes, originalPage.rootId);
        const newPage: Page = {
            id: genId('page'),
            name: `${originalPage.name} Copy`,
            description: originalPage.description,
            slug: originalPage.slug ? `${originalPage.slug}-copy` : undefined,
            rootId: newRootId,
        };
        s.project.nodes = { ...s.project.nodes, ...clonedNodes };
        s.project.pages.push(newPage);
    }, true),

    openFragment: (fragmentId) => get().update((s) => {
        const next = [...(s.ui.overlays ?? [])];
        if (fragmentId) next.push(fragmentId);
        s.ui.overlays = next;
    }, false),

    closeFragment: (fragmentId) => get().update((s) => {
        const prev = s.ui.overlays ?? [];
        if (!prev.length) return;
        s.ui.overlays = fragmentId ? prev.filter(id => id !== fragmentId) : prev.slice(0, -1);
    }, false),

    addFragment: (name) => {
        const newId = genId('comp');
        const rootId = genId('node');
        get().update(s => {
            s.project.nodes[rootId] = buildNodeWithDefaults('box', rootId);
            const newFragment = { id: newId, name: name ?? `Component ${s.project.fragments.length + 1}`, rootId, isPublic: false };
            s.project.fragments = [...s.project.fragments, newFragment];

            if (s.ui.mode === 'Page') {
                const currentPage = s.project.pages.find(p => p.rootId === s.project.rootId);
                s.ui.panels.left.lastActivePageId = currentPage?.id ?? null;
            }

            s.ui.mode = 'Component';
            s.ui.editingFragmentId = newId;
            s.ui.panels.left.lastActiveFragmentId = newId;
            s.ui.selectedId = rootId;
        }, true);
        return newId;
    },

    removeFragment: (fragmentId) => get().update(s => {
        const frag = s.project.fragments.find(f => f.id === fragmentId);
        if (!frag) return;
        const toDel = collectSubtreeIds(s.project.nodes, frag.rootId);
        const nextNodes = { ...s.project.nodes };
        toDel.forEach(id => delete nextNodes[id]);
        s.project.nodes = nextNodes;
        s.project.fragments = s.project.fragments.filter(f => f.id !== fragmentId);

        if (s.ui.editingFragmentId === fragmentId) {
            const nextFragment = s.project.fragments[0];
            s.ui.editingFragmentId = nextFragment?.id ?? null;
            s.ui.selectedId = nextFragment?.rootId ?? null;
        }
    }, true),

    updateFragment: (fragmentId, patch) => get().update(s => {
        s.project.fragments = s.project.fragments.map(f =>
            f.id === fragmentId ? { ...f, ...patch } : f
        );
    }, true),

    setEditorMode: (mode) => get().update(s => {
        if (s.ui.mode === mode) return;

        if (s.ui.mode === 'Page') {
            const currentPage = s.project.pages.find(p => p.rootId === s.project.rootId);
            s.ui.panels.left.lastActivePageId = currentPage?.id ?? s.project.pages[0]?.id ?? null;
        } else {
            s.ui.panels.left.lastActiveFragmentId = s.ui.editingFragmentId;
        }

        s.ui.mode = mode;

        if (mode === 'Page') {
            s.ui.editingFragmentId = null;
            const targetPage = s.project.pages.find(p => p.id === s.ui.panels.left.lastActivePageId) ?? s.project.pages[0];
            if (targetPage) {
                s.project.rootId = targetPage.rootId;
                s.ui.selectedId = targetPage.rootId;
            }
        } else {
            let targetFragment = s.project.fragments.find(f => f.id === s.ui.panels.left.lastActiveFragmentId);

            if (!targetFragment) {
                targetFragment = s.project.fragments[0];
            }

            if (!targetFragment) {
                const newId = get().addFragment('New Component');
                const newFrag = get().project.fragments.find(f => f.id === newId);
                s.ui.editingFragmentId = newFrag!.id;
                s.ui.selectedId = newFrag!.rootId;
            } else {
                s.ui.editingFragmentId = targetFragment.id;
                s.ui.selectedId = targetFragment.rootId;
            }
        }
    }),

    openComponentEditor: (fragmentId) => get().update(s => {
        const frag = s.project.fragments.find(f => f.id === fragmentId);
        if (frag) {
            if (s.ui.mode === 'Page') {
                const currentPage = s.project.pages.find(p => p.rootId === s.project.rootId);
                s.ui.panels.left.lastActivePageId = currentPage?.id ?? null;
            }

            s.ui.mode = 'Component';
            s.ui.editingFragmentId = fragmentId;
            s.ui.panels.left.lastActiveFragmentId = fragmentId;
            s.ui.selectedId = frag.rootId;
        }
    }),

    closeComponentEditor: () => {
        get().setEditorMode('Page');
    },

    saveNodeAsComponent: (nodeId, name, description, isPublic) => get().update(s => {
        const { nodes: clonedNodes, newRootId } = cloneSubtree(s.project.nodes, nodeId);
        const newFragment: Fragment = {
            id: genId('comp'),
            name,
            description,
            rootId: newRootId,
            isPublic,
        };
        s.project.nodes = { ...s.project.nodes, ...clonedNodes };
        s.project.fragments.push(newFragment);
    }, true),

    publishComponent: () => get().update(s => {
        const fragId = s.ui.editingFragmentId;
        if (!fragId) return;

        const fragments = s.project.fragments.map(f =>
            f.id === fragId ? { ...f, isPublic: true } : f
        );
        s.project.fragments = fragments;
    }, true),

    insertComponent: (fragmentId, parentId) => get().update(s => {
        const fragment = s.project.fragments.find(f => f.id === fragmentId);
        if (!fragment) return;

        const { nodes: clonedNodes, newRootId } = cloneSubtree(s.project.nodes, fragment.rootId);
        s.project.nodes = { ...s.project.nodes, ...clonedNodes };

        const desiredParentId = parentId ?? s.ui.selectedId ?? s.project.rootId;
        const finalParentId = chooseValidParentId(s.project, desiredParentId);

        const parentNode = s.project.nodes[finalParentId]!;
        if (!parentNode.children) parentNode.children = [];
        parentNode.children.push(newRootId);
        s.ui.selectedId = newRootId;
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

    toggleBottomDock: () => {
        get().update((s) => {
            const bottom = s.ui.panels.bottom ?? { heightPx: 240, isCollapsed: false, advanced: null };
            s.ui.panels.bottom = { ...bottom, isCollapsed: !bottom.isCollapsed };
        }, false);
    },

    setActiveViewport: (viewport) => get().update(s => { s.ui.canvas.activeViewport = viewport; }),
    setBaseViewport: (viewport) => get().update(s => { s.ui.canvas.baseViewport = viewport; }, true),
    setViewportMode: (viewport, mode) => get().update(s => { s.ui.canvas.vpMode = { ...s.ui.canvas.vpMode, [viewport]: mode }; }, true),
    setActiveHubTab: (tab) => get().update(s => { s.ui.panels.left.activeHubTab = tab; }),

    addAsset: (asset) => {
        const newId = genId('asset');
        get().update(s => {
            if (!s.project.assets) s.project.assets = [];
            s.project.assets.push({ ...asset, id: newId });
        }, true);
        return newId;
    },

    removeAsset: (assetId) => {
        get().update(s => {
            if (s.project.assets) {
                s.project.assets = s.project.assets.filter(a => a.id !== assetId);
            }
        }, true);
    },

    updateGlobalCss: (css) => { get().update(s => { s.project.globalCss = css; }, true); },
    updateGlobalJs: (js) => { get().update(s => { s.project.globalJs = js; }, true); },

    getEffectiveDecl: (nodeId) => {
        const s = get();
        const node = s.project.nodes[nodeId];
        if (!node) return null;

        const el = node.styles?.element ?? {};
        const base = s.ui.canvas.baseViewport;
        const active = s.ui.canvas.activeViewport;
        const mode = s.ui.canvas.vpMode[active];

        const baseDecl = (el as any)[base] ?? {};
        if (mode === 'Independent' && active !== base) {
            const ov = (el as any)[active] ?? {};
            return { ...baseDecl, ...ov };
        }
        return { ...baseDecl };
    },

    setSetting: (key, value) => get().update((s) => { s.settings = { ...(s.settings ?? {}), [key]: value }; }, true),
    setData: (path, value) => get().update((s) => { s.data = setByPath(s.data ?? {}, path, value); }, true),

    setNotification: (message: string) => get().update(s => {
        s.ui.notification = { message, timestamp: Date.now() };
    }),

    toggleLeftPanelSplit: () => get().update(s => {
        s.ui.panels.left.isSplit = !s.ui.panels.left.isSplit;
        if (s.ui.panels.left.isSplit && s.ui.panels.left.activeHubTab !== 'Layers') {
            s.ui.panels.left.activeHubTab = 'Layers';
        }
    }),

    setLeftPanelSplitPercentage: (percentage: number) => get().update(s => {
        s.ui.panels.left.splitPercentage = Math.max(20, Math.min(80, percentage));
    }),

    updateComponentPolicy: (componentId, patch) => get().update(s => {
        if (!s.project.policies) {
            s.project.policies = {};
        }
        if (!s.project.policies.components) {
            s.project.policies.components = {};
        }
        const existing = s.project.policies.components[componentId] ?? {
            version: '1.1', component: componentId, tag: getDefinition(componentId)?.capabilities?.defaultTag ?? 'div'
        };
        s.project.policies.components[componentId] = deepMerge(existing, patch);
    }, true),

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