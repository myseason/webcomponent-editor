import { createStore, type StoreApi } from 'zustand/vanilla';
import type { EditorState, NodeId, Node, FlowEdge } from '../core/types';

/** 얕은 복사 유틸 — 배열/객체만 처리 */
function shallowClone<T extends object>(obj: T): T {
    return Array.isArray(obj) ? ([...obj] as unknown as T) : ({ ...obj } as T);
}

/** 초기 상태(빈 프로젝트) */
const initialProject: EditorState['project'] = {
    pages: [{ id: 'page_home', name: 'Home', rootId: 'node_root_home', slug: '/' }],
    fragments: [],
    nodes: {
        node_root_home: {
            id: 'node_root_home',
            componentId: 'box',
            props: {},
            styles: { element: {} },
            children: [],
        },
    },
    rootId: 'node_root_home',
};

const initialState: EditorState = {
    project: initialProject,
    ui: { selectedId: null, canvasWidth: 640, overlays: [] }, // ← overlays 초기화
    data: {},
    settings: {},
    flowEdges: {},
};

type EditorActions = {
    /** 얕은 복사 기반 상태 갱신 (Immer 미사용) */
    update: (fn: (draft: EditorState) => void) => void;

    select: (id: NodeId | null) => void;
    getParentOf: (id: NodeId) => NodeId | null;

    addByDef: (defId: string, parentId?: string) => NodeId;
    addByDefAt: (defId: string, parentId: string, index: number) => NodeId;
    patchNode: (id: NodeId, patch: Partial<Node>) => void;
    updateNodeProps: (id: NodeId, props: Record<string, unknown>) => void;
    updateNodeStyles: (id: NodeId, styles: { element?: Record<string, unknown> }) => void;

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

    // for page
    openFragment: (fragmentId: string) => void;
    closeFragment: (fragmentId?: string) => void; // undefined면 최상단 닫기
};

export type EditorStoreState = EditorState & EditorActions;

/** 간단 키 생성기(SSR 렌더 중 호출 금지) */
let _seq = 0;
const genId = (prefix: string): string => `${prefix}_${++_seq}`;

export const editorStore: StoreApi<EditorStoreState> = createStore<EditorStoreState>((set, get) => {
    /** 내부 헬퍼: 상태 필드만 교체(액션은 유지) */
    const replaceState = (next: EditorState) =>
        set((prev) => ({ ...prev, ...next }));

    const update: EditorActions['update'] = (fn) => {
        const cur = get();
        // draft는 EditorState만 얕은 복사
        const draft: EditorState = {
            project: {
                ...cur.project,
                pages: [...cur.project.pages],
                fragments: [...cur.project.fragments],
                nodes: { ...cur.project.nodes },
                rootId: cur.project.rootId,
            },
            ui: { ...cur.ui },
            data: { ...cur.data },
            settings: { ...cur.settings },
            flowEdges: { ...cur.flowEdges },
        };
        fn(draft);
        replaceState(draft);
    };

    const getParentOf: EditorActions['getParentOf'] = (id) => {
        const nodes = get().project.nodes;
        // Object.values로 Node로 안전 순회
        for (const node of Object.values(nodes) as Node[]) {
            if ((node.children ?? []).includes(id)) {
                return node.id;
            }
        }
        return null;
    };

    const addByDef: EditorActions['addByDef'] = (defId, parentId) => {
        const newId = genId(`node_${defId}`);
        update((s) => {
            const p = s.project;
            p.nodes = { ...p.nodes };
            p.nodes[newId] = {
                id: newId,
                componentId: defId,
                props: {},
                styles: { element: {} },
                children: [],
            };
            const targetParent = parentId ?? p.rootId;
            const parent = p.nodes[targetParent];
            if (!parent) throw new Error(`Parent not found: ${targetParent}`);
            parent.children = [...(parent.children ?? []), newId];
        });
        return newId;
    };

    const addByDefAt: EditorActions['addByDefAt'] = (defId, parentId, index) => {
        const newId = genId(`node_${defId}`);
        update((s) => {
            const p = s.project;
            p.nodes = { ...p.nodes };
            p.nodes[newId] = {
                id: newId,
                componentId: defId,
                props: {},
                styles: { element: {} },
                children: [],
            };
            const parent = p.nodes[parentId];
            if (!parent) throw new Error(`Parent not found: ${parentId}`);
            const children = [...(parent.children ?? [])];
            const clamped = Math.max(0, Math.min(index, children.length));
            children.splice(clamped, 0, newId);
            parent.children = children;
        });
        return newId;
    };

    const patchNode: EditorActions['patchNode'] = (id, patch) => {
        update((s) => {
            const node = s.project.nodes[id];
            if (!node) return;
            if (id === s.project.rootId && (patch as { id?: NodeId }).id && (patch as { id?: NodeId }).id !== id) {
                throw new Error('루트 노드 id 변경 금지');
            }
            s.project.nodes = { ...s.project.nodes, [id]: { ...node, ...patch } };
        });
    };

    const updateNodeProps: EditorActions['updateNodeProps'] = (id, props) => {
        update((s) => {
            const node = s.project.nodes[id];
            if (!node) return;
            s.project.nodes = {
                ...s.project.nodes,
                [id]: { ...node, props: { ...node.props, ...props } },
            };
        });
    };

    const updateNodeStyles: EditorActions['updateNodeStyles'] = (id, styles) => {
        update((s) => {
            const node = s.project.nodes[id];
            if (!node) return;
            const prev = node.styles ?? { element: {} };
            s.project.nodes = {
                ...s.project.nodes,
                [id]: {
                    ...node,
                    styles: {
                        ...prev,
                        element: { ...(prev.element ?? {}), ...(styles.element ?? {}) },
                    },
                },
            };
        });
    };

    const selectPage: EditorActions['selectPage'] = (pageId) => {
        update((s) => {
            const page = s.project.pages.find((p) => p.id === pageId);
            if (!page) throw new Error(`페이지 없음: ${pageId}`);
            s.project = { ...s.project, rootId: page.rootId };
        });
    };

    const addPage: EditorActions['addPage'] = (name) => {
        const id = genId('page');
        const rootId = genId('node_root');
        update((s) => {
            s.project = {
                ...s.project,
                pages: [...s.project.pages, { id, name: name ?? 'Page', rootId, slug: undefined }],
                nodes: {
                    ...s.project.nodes,
                    [rootId]: { id: rootId, componentId: 'box', props: {}, styles: { element: {} }, children: [] },
                },
            };
        });
        return id;
    };

    const removePage: EditorActions['removePage'] = (pageId) => {
        update((s) => {
            const idx = s.project.pages.findIndex((p) => p.id === pageId);
            if (idx < 0) return;
            const page = s.project.pages[idx];
            if (s.project.rootId === page.rootId) throw new Error('현재 표시 중인 페이지는 삭제할 수 없습니다');
            s.project = { ...s.project, pages: s.project.pages.filter((p) => p.id !== pageId) };
            // TODO: 필요 시 nodes GC
        });
    };

    const addFragment: EditorActions['addFragment'] = (name) => {
        const id = genId('fragment');
        const rootId = genId('frag_root');
        update((s) => {
            s.project = {
                ...s.project,
                fragments: [...s.project.fragments, { id, name: name ?? 'Fragment', rootId }],
                nodes: {
                    ...s.project.nodes,
                    [rootId]: { id: rootId, componentId: 'box', props: {}, styles: { element: {} }, children: [] },
                },
            };
        });
        return id;
    };

    const removeFragment: EditorActions['removeFragment'] = (fragmentId) => {
        update((s) => {
            s.project = { ...s.project, fragments: s.project.fragments.filter((f) => f.id !== fragmentId) };
        });
    };

    const addFlowEdge: EditorActions['addFlowEdge'] = (edge) => {
        const id = genId('flow');
        update((s) => {
            s.flowEdges = { ...s.flowEdges, [id]: { ...edge, id } };
        });
        return id;
    };

    const updateFlowEdge: EditorActions['updateFlowEdge'] = (edgeId, patch) => {
        update((s) => {
            const prev = s.flowEdges[edgeId];
            if (!prev) return;
            s.flowEdges = { ...s.flowEdges, [edgeId]: { ...prev, ...patch } };
        });
    };

    const removeFlowEdge: EditorActions['removeFlowEdge'] = (edgeId) => {
        update((s) => {
            const next = { ...s.flowEdges };
            delete next[edgeId];
            s.flowEdges = next;
        });
    };

    const setData: EditorActions['setData'] = (path, value) => {
        update((s) => {
            s.data = { ...s.data, [path]: value };
        });
    };

    const setSetting: EditorActions['setSetting'] = (path, value) => {
        update((s) => {
            s.settings = { ...s.settings, [path]: value };
        });
    };

    const select: EditorActions['select'] = (id) => {
        update((s) => {
            s.ui = { ...s.ui, selectedId: id };
        });
    };

    // createStore 내부 반환에 아래 추가
    const openFragment: EditorActions['openFragment'] = (fragmentId) => {
        update((s) => {
            s.ui = { ...s.ui, overlays: [...s.ui.overlays, fragmentId] };
        });
    };

    const closeFragment: EditorActions['closeFragment'] = (fragmentId) => {
        update((s) => {
            const overlays = [...s.ui.overlays];
            if (!fragmentId) { overlays.pop(); }
            else {
                const idx = overlays.lastIndexOf(fragmentId);
                if (idx >= 0) overlays.splice(idx, 1);
            }
            s.ui = { ...s.ui, overlays };
        });
    };

    return {
        ...initialState,
        update,
        select,
        getParentOf,
        addByDef,
        addByDefAt,
        patchNode,
        updateNodeProps,
        updateNodeStyles,
        selectPage,
        addPage,
        removePage,
        addFragment,
        removeFragment,
        addFlowEdge,
        updateFlowEdge,
        removeFlowEdge,
        setData,
        setSetting,
        openFragment,
        closeFragment
    };
});