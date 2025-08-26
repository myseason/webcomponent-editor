import { createStore, type StoreApi } from 'zustand/vanilla';
import { getDefinition } from '../core/registry';
import type {
    EditorState,
    Project,
    NodeId,
    Node,
    FlowEdge,
    CSSDict,
} from '../core/types';

import { filterStyleKeysByTag } from '../runtime/capabilities';

/**
 * 초기 상태(빈 프로젝트)
 * - Home 페이지 1개
 * - 루트 노드(box)
 */
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
    ui: {
        selectedId: null,
        canvasWidth: 640,
        overlays: [], // 프래그먼트 오버레이 스택
        // bottomRight는 optional. Inspector/BottomDock에서 필요 시 update로 생성해 씁니다.
        // bottomRight: { open: false, kind: 'None', widthPct: 36 },
    },
    data: {},
    settings: {},
    flowEdges: {},
};

/** 액션 타입(빌더/UI에서 사용) */
type EditorActions = {
    /** 얕은 복사 기반 상태 갱신 (Immer 미사용) */
    update: (fn: (draft: EditorState) => void) => void;

    /** 선택 노드 변경 */
    select: (id: NodeId | null) => void;

    /** 부모 노드 조회 */
    getParentOf: (id: NodeId) => NodeId | null;

    /** 노드 추가(부모 끝에) */
    addByDef: (defId: string, parentId?: string) => NodeId;

    /** 노드 추가(부모의 index 위치) */
    addByDefAt: (defId: string, parentId: string, index: number) => NodeId;

    /** 노드 얕은 패치(표준 시그니처) */
    patchNode: (id: NodeId, patch: Partial<Node>) => void;

    /** props 병합 업데이트(표준 시그니처) */
    updateNodeProps: (id: NodeId, props: Record<string, unknown>) => void;

    /** styles.element 병합 업데이트(표준 시그니처) */
    updateNodeStyles: (id: NodeId, styles: { element?: CSSDict }) => void;

    /** 페이지 전환(현재 rootId 변경) */
    selectPage: (pageId: string) => void;

    /** 페이지 추가/삭제 */
    addPage: (name?: string) => string;
    removePage: (pageId: string) => void;

    /** 프래그먼트 추가/삭제 */
    addFragment: (name?: string) => string;
    removeFragment: (fragmentId: string) => void;

    /** 플로우 엣지 관리 */
    addFlowEdge: (edge: FlowEdge) => string;
    updateFlowEdge: (edgeId: string, patch: Partial<FlowEdge>) => void;
    removeFlowEdge: (edgeId: string) => void;

    /** 데이터/설정 */
    setData: (path: string, value: unknown) => void;
    setSetting: (path: string, value: unknown) => void;

    /** 오버레이(프래그먼트) 스택 제어 */
    openFragment: (fragmentId: string) => void;
    closeFragment: (fragmentId?: string) => void;
    hydrateDefaults: () => void;
};

/** 스토어가 내보내는 상태 + 액션 (useEditor의 반환 타입) */
export type EditorStoreState = EditorState & EditorActions;

/** 간단 키 생성기(SSR 렌더 중 호출 금지) */
let _seq = 0;
const genId = (prefix: string): string => `${prefix}_${++_seq}`;

// 파일 상단 쪽( genId 아래 )에 추가
function buildNodeWithDefaults(defId: string, id: string): Node {
    const def = getDefinition(defId);
    const defProps = (def?.defaults?.props ?? {}) as Record<string, unknown>;

    // styles 기본은 element 안/밖 어느 형태든 허용적으로 병합
    const defStylesRaw = (def?.defaults?.styles ?? {}) as Record<string, unknown>;
    const defElem =
        ((defStylesRaw as any).element as CSSDict | undefined) ??
        (defStylesRaw as CSSDict);

    return {
        id,
        componentId: defId,
        props: { ...defProps },
        styles: { element: { ...(defElem ?? {}) } },
        children: [],
    };
}


// 부모 찾기(빠름/간단): project.nodes를 순회해서 childId를 포함한 노드 검색
function findParentId(p: Project, childId: NodeId): NodeId | null {
    for (const nid of Object.keys(p.nodes)) {
        const n = p.nodes[nid];
        if (n.children && n.children.includes(childId)) return nid;
    }
    return null;
}

// 해당 defId가 컨테이너인지 판정
function isContainerDef(defId: string): boolean {
    const def = getDefinition(defId);
    return !!def?.capabilities?.canHaveChildren;
}

// 현재 위치(desiredParent)에서 가장 가까운 "컨테이너 조상"을 선택
function chooseValidParentId(p: Project, desiredParent: NodeId | null | undefined, fallbackRoot: NodeId): NodeId {
    let cur: NodeId = desiredParent && p.nodes[desiredParent] ? desiredParent : fallbackRoot;

    // cur가 컨테이너면 즉시 OK
    if (isContainerDef(p.nodes[cur].componentId)) return cur;

    // 위로 타고 올라가며 컨테이너를 찾는다
    let guard = 0;
    while (guard++ < 999) {
        const parent = findParentId(p, cur);
        if (!parent) break;
        if (isContainerDef(p.nodes[parent].componentId)) return parent;
        cur = parent;
    }

    // 그래도 못 찾으면 root 보장 (root는 Box이므로 컨테이너)
    return fallbackRoot;
}

/**
 * editorStore
 * - Zustand vanilla store
 */
export const editorStore: StoreApi<EditorStoreState> = createStore<EditorStoreState>(
    (set, get) => {
        /** 내부 헬퍼: 상태 필드만 교체(액션은 유지) */
        const replaceState = (next: EditorState) =>
            set((prev: EditorStoreState) => ({ ...prev, ...next }));

        const update: EditorActions['update'] = (fn) => {
            const cur = get();

            // draft는 EditorState만 얕은 복사 (배열/객체 수준)
            const draft: EditorState = {
                project: {
                    ...cur.project,
                    pages: [...cur.project.pages],
                    fragments: [...cur.project.fragments],
                    nodes: { ...cur.project.nodes },
                    rootId: cur.project.rootId,
                },
                ui: {
                    ...cur.ui,
                    overlays: [...(cur.ui.overlays ?? [])],
                    // bottomRight는 optional일 수 있으므로 얕은 복사 시 존재하면 펼침
                    bottomRight: (cur.ui as EditorState['ui']).bottomRight
                        ? { ...(cur.ui as EditorState['ui']).bottomRight }
                        : undefined,
                } as EditorState['ui'],
                data: { ...cur.data },
                settings: { ...cur.settings },
                flowEdges: { ...cur.flowEdges },
            };

            fn(draft);
            replaceState(draft);
        };

        const getParentOf: EditorActions['getParentOf'] = (id) => {
            const nodes = get().project.nodes;
            for (const node of Object.values(nodes) as Node[]) {
                if ((node.children ?? []).includes(id)) return node.id;
            }
            return null;
        };

        const addByDef: EditorActions['addByDef'] = (defId, parentId) => {
            const newId = genId(`node_${defId}`);
            update((s: EditorState) => {
                const p = s.project;
                p.nodes = { ...p.nodes };

                // ✅ 기본값 포함하여 생성
                p.nodes[newId] = buildNodeWithDefaults(defId, newId);

                const targetParent = parentId ?? p.rootId;
                const parent = p.nodes[targetParent];
                if (!parent) throw new Error(`Parent not found: ${targetParent}`);
                parent.children = [...(parent.children ?? []), newId];
            });
            return newId;
        };

        // addByDefAt
        const addByDefAt: EditorActions['addByDefAt'] = (defId, parentId, index) => {
            const newId = genId(`node_${defId}`);
            update((s: EditorState) => {
                const p = s.project;
                p.nodes = { ...p.nodes };

                // ✅ 기본값 포함하여 생성
                p.nodes[newId] = buildNodeWithDefaults(defId, newId);

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
            update((s: EditorState) => {
                const node = s.project.nodes[id];
                if (!node) return;
                if (
                    id === s.project.rootId &&
                    (patch as { id?: NodeId }).id &&
                    (patch as { id?: NodeId }).id !== id
                ) {
                    throw new Error('루트 노드 id 변경 금지');
                }
                s.project.nodes = {
                    ...s.project.nodes,
                    [id]: { ...node, ...patch },
                };
            });
        };

        const updateNodeProps: EditorActions['updateNodeProps'] = (id, props) => {
            update((s: EditorState) => {
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

                // 태그 결정: Common meta __tag 없으면 'div'
                const tag = ((node.props as Record<string, unknown>).__tag as string | undefined) ?? 'div';

                // 들어온 element 스타일 키/값 추출 (값 타입을 CSSDict의 value로 단언)
                const incoming = Object.entries(styles.element ?? {}) as [string, string | number | undefined][];

                // 태그 정책으로 키 필터
                const allowedKeys = filterStyleKeysByTag(
                    tag,
                    incoming.map(([k]) => k),
                    s.project.tagPolicies
                );

                const picked: CSSDict = {};
                for (const [k, v] of incoming) {
                    if (allowedKeys.includes(k)) picked[k] = v;
                }

                const prev = node.styles ?? { element: {} };
                s.project.nodes = {
                    ...s.project.nodes,
                    [id]: {
                        ...node,
                        styles: {
                            ...prev,
                            element: { ...(prev.element ?? {}), ...picked },
                        },
                    },
                };
            });
        };

        const selectPage: EditorActions['selectPage'] = (pageId) => {
            update((s: EditorState) => {
                const page = s.project.pages.find((p) => p.id === pageId);
                if (!page) throw new Error(`페이지 없음: ${pageId}`);
                s.project = { ...s.project, rootId: page.rootId };
            });
        };

        // addPage (루트 박스도 기본값으로)
        const addPage: EditorActions['addPage'] = (name) => {
            const id = genId('page');
            const rootId = genId('node_root');

            const root = buildNodeWithDefaults('box', rootId);
            (root.styles.element as Record<string, unknown>) = {
                ...(root.styles.element ?? {}),
                width: '100%',
                minHeight: 600, // 필요시
            };

            update((s: EditorState) => {
                s.project = {
                    ...s.project,
                    pages: [...s.project.pages, { id, name: name ?? 'Page', rootId, slug: undefined }],
                    nodes: {
                        ...s.project.nodes,
                        // ✅ box 기본값 적용
                        [rootId]: root,
                    },
                };
            });
            return id;
        };

        const removePage: EditorActions['removePage'] = (pageId) => {
            update((s: EditorState) => {
                const idx = s.project.pages.findIndex((p) => p.id === pageId);
                if (idx < 0) return;
                const page = s.project.pages[idx];
                if (s.project.rootId === page.rootId)
                    throw new Error('현재 표시 중인 페이지는 삭제할 수 없습니다');
                s.project = {
                    ...s.project,
                    pages: s.project.pages.filter((p) => p.id !== pageId),
                };
                // NOTE: 필요 시 nodes GC
            });
        };

        // addFragment (루트 박스도 기본값으로)
        const addFragment: EditorActions['addFragment'] = (name) => {
            const id = genId('fragment');
            const rootId = genId('frag_root');

            const root = buildNodeWithDefaults('box', rootId);
            (root.styles.element as Record<string, unknown>) = {
                ...(root.styles.element ?? {}),
                width: '100%',
                minHeight: 600, // 필요시
            };

            update((s: EditorState) => {
                s.project = {
                    ...s.project,
                    fragments: [...s.project.fragments, { id, name: name ?? 'Fragment', rootId }],
                    nodes: {
                        ...s.project.nodes,
                        // ✅ box 기본값 적용
                        [rootId]: root,
                    },
                };
            });
            return id;
        };

        const removeFragment: EditorActions['removeFragment'] = (fragmentId) => {
            update((s: EditorState) => {
                s.project = {
                    ...s.project,
                    fragments: s.project.fragments.filter((f) => f.id !== fragmentId),
                };
            });
        };

        const addFlowEdge: EditorActions['addFlowEdge'] = (edge) => {
            const id = genId('flow');
            update((s: EditorState) => {
                s.flowEdges = { ...s.flowEdges, [id]: { ...edge, id } };
            });
            return id;
        };

        const updateFlowEdge: EditorActions['updateFlowEdge'] = (edgeId, patch) => {
            update((s: EditorState) => {
                const prev = s.flowEdges[edgeId];
                if (!prev) return;
                s.flowEdges = { ...s.flowEdges, [edgeId]: { ...prev, ...patch } };
            });
        };

        const removeFlowEdge: EditorActions['removeFlowEdge'] = (edgeId) => {
            update((s: EditorState) => {
                const next = { ...s.flowEdges };
                delete next[edgeId];
                s.flowEdges = next;
            });
        };

        const setData: EditorActions['setData'] = (path, value) => {
            // NOTE: 현재는 단순 키 기반. 필요시 dot-path 지원로 확장 가능.
            update((s: EditorState) => {
                s.data = { ...s.data, [path]: value };
            });
        };

        const setSetting: EditorActions['setSetting'] = (path, value) => {
            update((s: EditorState) => {
                s.settings = { ...s.settings, [path]: value };
            });
        };

        const select: EditorActions['select'] = (id) => {
            update((s: EditorState) => {
                s.ui = { ...s.ui, selectedId: id };
            });
        };

        /** 오버레이 스택 조작 */
        const openFragment: EditorActions['openFragment'] = (fragmentId) => {
            update((s: EditorState) => {
                s.ui = { ...s.ui, overlays: [...(s.ui.overlays ?? []), fragmentId] };
            });
        };

        const closeFragment: EditorActions['closeFragment'] = (fragmentId) => {
            update((s: EditorState) => {
                const overlays = [...(s.ui.overlays ?? [])];
                if (!fragmentId) {
                    overlays.pop();
                } else {
                    const idx = overlays.lastIndexOf(fragmentId);
                    if (idx >= 0) overlays.splice(idx, 1);
                }
                s.ui = { ...s.ui, overlays };
            });
        };

        // EditorActions 타입에 추가
        //   hydrateDefaults: () => void;
        // 구현부 추가 (다른 액션들과 같은 위치)
        const hydrateDefaults: EditorActions['hydrateDefaults'] = () => {
            update((s: EditorState) => {
                const nodes = s.project.nodes;
                for (const id of Object.keys(nodes)) {
                    const n = nodes[id] as Node;
                    const def = getDefinition(n.componentId);
                    if (!def) continue;

                    const defProps = (def.defaults?.props ?? {}) as Record<string, unknown>;
                    const defStylesRaw = (def.defaults?.styles ?? {}) as Record<string, unknown>;
                    const defElem =
                        ((defStylesRaw as any).element as CSSDict | undefined) ??
                        (defStylesRaw as CSSDict);

                    const curElem = (n.styles?.element ?? {}) as CSSDict;

                    const mergedProps = { ...defProps, ...n.props };
                    const mergedStyles = { element: { ...(defElem ?? {}), ...curElem } };

                    nodes[id] = { ...n, props: mergedProps, styles: mergedStyles };
                }
            });
        };

        // 반환: 상태 + 액션
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
            closeFragment,
            hydrateDefaults, // ✅ 추가
        };
    }
);