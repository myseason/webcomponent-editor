import type { Node, NodeId, CSSDict, Viewport, EditorState } from '../../core/types';
import { EditorCore } from '../EditorCore';
import { getDefinition } from "@/figmaV3/core/registry";
import { genId, buildNodeWithDefaults, chooseValidParentId, cloneSubtree } from '../../store/utils';
import {selectNodeById, selectNodes} from "@/figmaV3/store/slices/nodeSlice";

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
            const finalIndex = Math.max(0, Math.min(index ?? (parent.children?.length ?? 0), parent.children?.length ?? 0));
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

        toggleNodeVisibility(nodeId: NodeId) {
            EditorCore.store.getState()._toggleNodeVisibility(nodeId);
        },

        toggleNodeLock(nodeId: NodeId) {
            EditorCore.store.getState()._toggleNodeLock(nodeId);
        },

        // ui.ts에 유사 함수 존재 (selectNode)
        setSelectNodeId(nodeId: NodeId){
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
                if (idx >= 0) { parentId = id; index = idx + 1; break; }
            }
            if (!parentId) return;

            // 서브트리 복제
            const { nodes: cloned, newRootId } = cloneSubtree(nodes, sel);
            S.update((st) => { st.project.nodes = { ...st.project.nodes, ...cloned }; }, true);
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
                if (idx >= 0) { parentId = id; index = idx; break; }
            }
            if (!parentId) return;

            const gid = genId('group');
            const groupNode: Node = {
                id: gid,
                //name: 'Group',
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
                if (n.children?.includes(sel)) { parentId = id; break; }
            }
            if (!parentId) return;

            const startIndex = nodes[parentId]!.children!.findIndex((id) => id === sel);
            group.children.forEach((cid, i) => {
                S._moveNode(cid, parentId!, startIndex + i + 1);
            });
            S._deleteNodeCascade(sel);
            S._setSelectedId(parentId);
        },
    };

    return { reader: R, writer: W } as const;
}