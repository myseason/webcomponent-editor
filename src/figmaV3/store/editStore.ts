import { createStore } from 'zustand/vanilla';
import type { EditorState, NodeId, Node, FlowEdge } from '../core/types';

/** shallow copy helper */
function shallowClone<T extends object>(obj: T): T {
  return Array.isArray(obj) ? ([...obj] as unknown as T) : ({ ...obj } as T);
}

/** 초기 상태(빈 프로젝트) */
const initialState: EditorState = {
  project: {
    pages: [{ id: 'page_home', name: 'Home', rootId: 'node_root_home', slug: '/' }],
    fragments: [],
    nodes: {
      node_root_home: { id: 'node_root_home', componentId: 'box', props: {}, styles: { element: {} }, children: [] },
    },
    rootId: 'node_root_home',
  },
  ui: { selectedId: null, canvasWidth: 640 },
  data: {},
  settings: {},
  flowEdges: {},
};

export type EditorStore = {
  state: EditorState;
  subscribe: (listener: () => void) => () => void;
  getState: () => EditorState;
  update: (fn: (draft: EditorState) => void) => void;

  select: (id: NodeId | null) => void;
  getParentOf: (id: NodeId) => NodeId | null;

  addByDef: (defId: string, parentId?: string) => NodeId;
  addByDefAt: (defId: string, parentId: string, index: number) => NodeId;
  patchNode: (id: NodeId, patch: Partial<Node>) => void;
  updateNodeProps: (id: NodeId, props: Record<string, unknown>) => void;
  updateNodeStyles: (id: NodeId, styles: Record<string, unknown>) => void;

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
};

/** 간단한 키 생성기(SSR 안전: render 중 호출 금지) */
let _seq = 0;
const genId = (prefix: string): string => `${prefix}_${++_seq}`;

export const editorStore = createStore<EditorStore>((set, get) => {
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  const store: EditorStore = {
    state: initialState,

    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    getState: () => store.state,

    /** 얕은 복사 기반 update (Immer 미사용) */
    update: (fn) => {
      const next = shallowClone(store.state);
      fn(next);
      store.state = next;
      emit();
    },

    select: (id) => {
      store.update((s) => {
        s.ui = shallowClone(s.ui);
        s.ui.selectedId = id;
      });
    },

    getParentOf: (id) => {
      const { nodes } = store.state.project;
      for (const [pid, node] of Object.entries(nodes)) {
        if (node.children.includes(id)) return pid;
      }
      return null;
    },

    addByDef: (defId, parentId) => {
      // NOTE: defId → 실제 defaults는 registry에서 조합 (여기선 placeholder)
      const newId = genId(`node_${defId}`);
      store.update((s) => {
        const p = s.project;
        p.nodes = shallowClone(p.nodes);
        p.nodes[newId] = { id: newId, componentId: defId, props: {}, styles: { element: {} }, children: [] };
        const targetParent = parentId ?? p.rootId;
        const parent = p.nodes[targetParent];
        if (!parent) throw new Error(`Parent not found: ${targetParent}`);
        parent.children = [...parent.children, newId];
      });
      return newId;
    },

    addByDefAt: (defId, parentId, index) => {
      const newId = genId(`node_${defId}`);
      store.update((s) => {
        const p = s.project;
        p.nodes = shallowClone(p.nodes);
        p.nodes[newId] = { id: newId, componentId: defId, props: {}, styles: { element: {} }, children: [] };
        const parent = p.nodes[parentId];
        if (!parent) throw new Error(`Parent not found: ${parentId}`);
        const children = [...parent.children];
        const clamped = Math.max(0, Math.min(index, children.length));
        children.splice(clamped, 0, newId);
        parent.children = children;
      });
      return newId;
    },

    patchNode: (id, patch) => {
      store.update((s) => {
        const node = s.project.nodes[id];
        if (!node) return;
        if (id === s.project.rootId && (patch as { id?: NodeId }).id && (patch as { id?: NodeId }).id !== id) {
          throw new Error('루트 노드 id 변경 금지');
        }
        s.project.nodes = shallowClone(s.project.nodes);
        s.project.nodes[id] = { ...node, ...patch };
      });
    },

    updateNodeProps: (id, props) => {
      store.update((s) => {
        const node = s.project.nodes[id];
        if (!node) return;
        s.project.nodes = shallowClone(s.project.nodes);
        s.project.nodes[id] = { ...node, props: { ...node.props, ...props } };
      });
    },

    updateNodeStyles: (id, styles) => {
      store.update((s) => {
        const node = s.project.nodes[id];
        if (!node) return;
        s.project.nodes = shallowClone(s.project.nodes);
        const prev = node.styles ?? { element: {} };
        s.project.nodes[id] = { ...node, styles: { ...prev, element: { ...(prev.element ?? {}), ...(styles as Record<string, unknown>).element ?? {} } } as Node['styles'] };
      });
    },

    selectPage: (pageId) => {
      store.update((s) => {
        const page = s.project.pages.find((p) => p.id == pageId);
        if (!page) throw new Error(`페이지 없음: ${pageId}`);
        s.project = shallowClone(s.project);
        s.project.rootId = page.rootId;
      });
    },

    addPage: (name) => {
      const id = genId('page');
      const rootId = genId('node_root');
      store.update((s) => {
        s.project = shallowClone(s.project);
        s.project.pages = [...s.project.pages, { id, name: name ?? 'Page', rootId, slug: undefined }];
        s.project.nodes = { ...s.project.nodes, [rootId]: { id: rootId, componentId: 'box', props: {}, styles: { element: {} }, children: [] } };
      });
      return id;
    },

    removePage: (pageId) => {
      store.update((s) => {
        const idx = s.project.pages.findIndex((p) => p.id === pageId);
        if (idx < 0) return;
        const page = s.project.pages[idx];
        if (s.project.rootId === page.rootId) throw new Error('현재 표시 중인 페이지는 삭제할 수 없습니다');
        s.project = shallowClone(s.project);
        s.project.pages = s.project.pages.filter((p) => p.id !== pageId);
        // nodes 정리는 생략(가비지) — 필요 시 GC 로직 추가
      });
    },

    addFragment: (name) => {
      const id = genId('fragment');
      const rootId = genId('frag_root');
      store.update((s) => {
        s.project = shallowClone(s.project);
        s.project.fragments = [...s.project.fragments, { id, name: name ?? 'Fragment', rootId }];
        s.project.nodes = { ...s.project.nodes, [rootId]: { id: rootId, componentId: 'box', props: {}, styles: { element: {} }, children: [] } };
      });
      return id;
    },

    removeFragment: (fragmentId) => {
      store.update((s) => {
        s.project = shallowClone(s.project);
        s.project.fragments = s.project.fragments.filter((f) => f.id !== fragmentId);
      });
    },

    addFlowEdge: (edge) => {
      const id = genId('flow');
      store.update((s) => {
        s.flowEdges = { ...s.flowEdges, [id]: { ...edge, id } };
      });
      return id;
    },

    updateFlowEdge: (edgeId, patch) => {
      store.update((s) => {
        const prev = s.flowEdges[edgeId];
        if (!prev) return;
        s.flowEdges = { ...s.flowEdges, [edgeId]: { ...prev, ...patch } };
      });
    },

    removeFlowEdge: (edgeId) => {
      store.update((s) => {
        const next = { ...s.flowEdges };
        delete next[edgeId];
        s.flowEdges = next;
      });
    },

    setData: (path, value) => {
      store.update((s) => {
        s.data = { ...s.data, [path]: value };
      });
    },

    setSetting: (path, value) => {
      store.update((s) => {
        s.settings = { ...s.settings, [path]: value };
      });
    },
  };

  return store;
});