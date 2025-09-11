import type { Node, NodeId, CSSDict, Viewport, EditorState } from '../../core/types';
import { EditorCore } from '../EditorCore';
import { getDefinition } from "@/figmaV3/core/registry";
import { genId, buildNodeWithDefaults, chooseValidParentId, cloneSubtree } from '../../store/utils';
import { selectNodeById, selectNodes } from "@/figmaV3/store/slices/nodeSlice";

/** 스타일 shallow-merge 유틸: element 스타일은 뷰포트별 사전이라 보호적으로 합칩니다. */
function mergeStyles(base: any, patch: any) {
    const out = { ...(base ?? {}) };
    if (patch?.element) {
        out.element = { ...(base?.element ?? {}) };
        for (const k of Object.keys(patch.element)) {
            out.element[k] = { ...(base?.element?.[k] ?? {}), ...(patch.element[k] ?? {}) };
        }
    }
    // 필요 시 다른 스타일 네임스페이스도 병합
    return out;
}

export function nodesDomain() {
    const R = {
        getNodesMap: (): Record<NodeId, Node> => selectNodes(EditorCore.getState()),
        getNode: (id: NodeId | null | undefined): Node | null => {
            if (!id) return null;
            return selectNodeById(id)(EditorCore.getState()) ?? null;
        },
        getRootNodeId: (): NodeId | null => EditorCore.getState().project.rootId,
        getCurrentNode: (): Node | null => {
            const s = EditorCore.getState();
            const id = s.ui.selectedId;
            return id ? (s.project.nodes[id] ?? null) : null;
        },
    };

    const W = {
        addNodeByDef(defId: string, parentId?: NodeId, index?: number): NodeId {
            const S = EditorCore.store.getState();
            const newId = genId(`node_${defId}`);
            const newNode = buildNodeWithDefaults(defId, newId);
            S._createNode(newNode);

            const st = EditorCore.store.getState();
            const desiredParentId = parentId ?? st.ui.selectedId ?? st.project.rootId;
            const finalParentId = chooseValidParentId(st.project, desiredParentId);
            const parent = st.project.nodes[finalParentId]!;
            const finalIndex = Math.max(
                0,
                Math.min(index ?? (parent.children?.length ?? 0), parent.children?.length ?? 0)
            );

            // set parent id
            newNode.parentId = finalParentId;

            S._moveNode(newId, finalParentId, finalIndex);
            S._setSelectedId(newId);
            return newId;
        },

        moveNode(nodeId: NodeId, newParentId: NodeId, newIndex: number) {
            EditorCore.store.getState()._moveNode(nodeId, newParentId, newIndex);
        },

        removeNodeCascade(nodeId: NodeId) {
            EditorCore.store.getState()._deleteNodeCascade(nodeId);
        },

        updateNodeProps(id: NodeId, props: Record<string, unknown>) {
            EditorCore.store.getState()._updateNodeProps(id, props);
        },

        updateNodeStyles(id: NodeId, styles: CSSDict, viewport?: Viewport) {
            EditorCore.store.getState()._updateNodeStyles(id, styles, viewport);
        },

        // ui.ts에 유사 함수 존재 (selectNode)
        setSelectNodeId(nodeId: NodeId) {
            EditorCore.store.getState()._setSelectedId(nodeId);
        },

        duplicateSelected() {
            const S = EditorCore.store.getState();
            const sel = S.ui.selectedId;
            if (!sel) return;

            // 부모/인덱스 탐색
            const nodes = S.project.nodes;
            let parentId: string | null = null;
            let index = 0;
            for (const id in nodes) {
                const n = nodes[id]!;
                const idx = n.children?.findIndex((cid) => cid === sel) ?? -1;
                if (idx >= 0) {
                    parentId = id;
                    index = idx + 1;
                    break;
                }
            }
            if (!parentId) return;

            // 서브트리 복제
            const { nodes: cloned, newRootId } = cloneSubtree(nodes, sel);
            S.update((st) => {
                st.project.nodes = { ...st.project.nodes, ...cloned };
            }, true);
            S._moveNode(newRootId, parentId, index);
            S._setSelectedId(newRootId);
        },

        groupSelected(groupComponentId = 'box') {
            const S = EditorCore.store.getState();
            const sel = S.ui.selectedId;
            if (!sel) return;

            // 부모/인덱스
            const st = EditorCore.getState();
            const nodes = st.project.nodes;
            let parentId: string | null = null;
            let index = 0;
            for (const id in nodes) {
                const n = nodes[id]!;
                const idx = n.children?.findIndex((cid) => cid === sel) ?? -1;
                if (idx >= 0) {
                    parentId = id;
                    index = idx;
                    break;
                }
            }
            if (!parentId) return;

            const gid = genId('group');
            const groupNode: Node = {
                id: gid,
                componentId: groupComponentId,
                children: [],
                props: {},
                styles: { element: { base: {} } },
                isVisible: true,
                locked: false,
            };

            S._createNode(groupNode);
            S._moveNode(gid, parentId, index);
            S._moveNode(sel, gid, 0);
            S._setSelectedId(gid);
        },

        ungroupSelected() {
            const S = EditorCore.store.getState();
            const sel = S.ui.selectedId;
            if (!sel) return;

            const st = EditorCore.getState();
            const nodes = st.project.nodes;
            const group = nodes[sel];
            if (!group || !group.children || group.children.length === 0) return;

            // 부모 찾기
            let parentId: string | null = null;
            for (const id in nodes) {
                const n = nodes[id]!;
                if (n.children?.includes(sel)) {
                    parentId = id;
                    break;
                }
            }
            if (!parentId) return;

            const startIndex = nodes[parentId]!.children!.findIndex((id) => id === sel);
            group.children.forEach((cid, i) => {
                S._moveNode(cid, parentId!, startIndex + i + 1);
            });
            S._deleteNodeCascade(sel);
            S._setSelectedId(parentId);
        },

        /**
         * ✅ 컨테이너 승격: 노드를 BoxDef(또는 주어진 컨테이너 Def) 기반으로 "재구성"합니다.
         * - ID/parent/children/visible/locked 등은 유지
         * - componentId/기본 props/기본 styles 등은 새 Def로 교체
         * - 기존 props/styles는 보수적으로 merge
         * - 자식 유지가 가능한 컨테이너(def.capabilities.canHaveChildren=true)만 승격 대상으로 가정
         */
        upgradeNodeToContainer(nodeId: NodeId, containerDefId = 'box') {
            const S = EditorCore.store.getState();
            const st = EditorCore.getState();
            const node = st.project.nodes[nodeId];
            if (!node) return;

            const curDef = getDefinition(node.componentId);
            const curCanHaveChildren = !!curDef?.capabilities?.canHaveChildren;

            // 이미 컨테이너면 무시
            if (curCanHaveChildren) return;

            // 대상 컨테이너 정의
            const nextDef = getDefinition(containerDefId);
            if (!nextDef?.capabilities?.canHaveChildren) {
                // 안전장치: 대상이 컨테이너가 아니면 중단
                return;
            }

            // 새 Def의 기본 노드 스캐폴드를 생성 (ID는 동일하게 유지하기 위해 임시 생성)
            const scaffold = buildNodeWithDefaults(containerDefId, nodeId);

            // 교체 노드 구성
            const replaced: Node = {
                id: node.id,                            // 동일 ID 유지
                componentId: containerDefId,            // 새 Def
                parentId: node.parentId,        // 부모 유지
                children: [...(node.children ?? [])],   // 자식 유지
                isVisible: node.isVisible !== false,
                locked: !!node.locked,

                // props: 새 기본값 위에 기존 props 덮어쓰기 (태그/속성 유지)
                props: {
                    ...(scaffold.props ?? {}),
                    ...(node.props ?? {}),
                },

                // styles: 새 기본값과 기존 스타일 element를 뷰포트별로 병합
                styles: mergeStyles(scaffold.styles, node.styles),
            };

            // 저장
            S.update((draft) => {
                draft.project.nodes[replaced.id] = replaced;
            }, true);
        },
    };

    return { reader: R, writer: W } as const;
}