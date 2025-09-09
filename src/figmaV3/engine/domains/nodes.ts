import type { Node, NodeId, CSSDict, Viewport, EditorState } from '../../core/types';
import { EditorEngineCore } from '../EditorEngineCore';
import { selectNodes, selectNodeById } from '../../store/slices/nodeSlice';
import { genId, buildNodeWithDefaults, chooseValidParentId, findParentId, collectSubtreeIds, cloneSubtree } from '../../store/utils';
import {getDefinition} from "@/figmaV3/core/registry";

export function nodesDomain() {
    const R = {
        getNodesMap: (): Record<NodeId, Node> => selectNodes(EditorEngineCore.getState()),
        getNode: (id: NodeId | null | undefined): Node | null => {
            if (!id) return null;
            return selectNodeById(id)(EditorEngineCore.getState()) ?? null;
        },
        getCurrentNode: (): Node | null => {
            const state = EditorEngineCore.getState();
            return state.ui.selectedId ? R.getNode(state.ui.selectedId) : null;
        },
        getRootNodeId: (): NodeId | null => EditorEngineCore.getState().project.rootId,
    };

    const W = {
        addNodeByDef(defId: string, parentId?: NodeId, index?: number): NodeId {
            const newId = genId(`node_${defId}`);
            EditorEngineCore.store.getState().update((s: EditorState) => {
                const newNode = buildNodeWithDefaults(defId, newId);
                s.project.nodes[newId] = newNode;
                const desiredParentId = parentId ?? s.ui.selectedId ?? s.project.rootId;
                const finalParentId = chooseValidParentId(s.project, desiredParentId);
                const parentNode = s.project.nodes[finalParentId]!;
                if (!parentNode.children) parentNode.children = [];
                const finalIndex = Math.max(0, Math.min(index ?? parentNode.children.length, parentNode.children.length));
                parentNode.children.splice(finalIndex, 0, newId);
                s.ui.selectedId = newId;
            }, true);
            return newId;
        },
        moveNode(nodeId: NodeId, newParentId: NodeId, newIndex: number) {
            const state = EditorEngineCore.store.getState();
            if (nodeId === state.project.rootId) return;

            const oldParentId = findParentId(state.project.nodes, nodeId);

            state.update((s: EditorState) => {
                if (oldParentId) {
                    const oldParent = s.project.nodes[oldParentId]!;
                    oldParent.children = (oldParent.children ?? []).filter(id => id !== nodeId);
                }

                const newParent = s.project.nodes[newParentId]!;
                if (!newParent.children) newParent.children = [];
                const finalIndex = Math.max(0, Math.min(newIndex, newParent.children.length));
                newParent.children.splice(finalIndex, 0, nodeId);
            }, true);
        },
        removeNodeCascade(nodeId: NodeId) {
            EditorEngineCore.store.getState().update((s: EditorState) => {
                if (nodeId === s.project.rootId) return;
                const parentId = findParentId(s.project.nodes, nodeId);
                if (parentId) {
                    const parent = s.project.nodes[parentId]!;
                    parent.children = (parent.children ?? []).filter(id => id !== nodeId);
                }
                const idsToDelete = collectSubtreeIds(s.project.nodes, nodeId);
                idsToDelete.forEach(id => delete s.project.nodes[id]);
                if (s.ui.selectedId && idsToDelete.includes(s.ui.selectedId)) {
                    s.ui.selectedId = parentId ?? s.project.rootId;
                }
            }, true);
        },
        saveNodeAsComponent(nodeId: NodeId, name: string, description: string, isPublic: boolean) {
            EditorEngineCore.store.getState().update((s: EditorState) => {
                const { nodes: clonedNodes, newRootId } = cloneSubtree(s.project.nodes, nodeId);
                const newFragment = { id: genId('comp'), name, description, rootId: newRootId, isPublic };
                s.project.nodes = { ...s.project.nodes, ...clonedNodes };
                s.project.fragments.push(newFragment);
            }, true);
        },
        insertComponent(fragmentId: string, parentId?: NodeId) {
            EditorEngineCore.store.getState().update((s: EditorState) => {
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
            }, true);
        },
        updateNodeProps: (id: NodeId, props: Record<string, unknown>) => EditorEngineCore.store.getState()._updateNodeProps(id, props),
        updateNodeStyles: (id: NodeId, styles: CSSDict, viewport?: Viewport) => EditorEngineCore.store.getState()._updateNodeStyles(id, styles, viewport),
        toggleNodeVisibility: (nodeId: NodeId) => EditorEngineCore.store.getState()._patchNode(nodeId, { isVisible: !R.getNode(nodeId)?.isVisible }),
        toggleNodeLock: (nodeId: NodeId) => EditorEngineCore.store.getState()._patchNode(nodeId, { locked: !R.getNode(nodeId)?.locked }),
        hydrateDefaults() {
            EditorEngineCore.store.getState().update(s => {
                for (const id in s.project.nodes) {
                    const node = s.project.nodes[id]!;
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
            }, true);
        },
    };

    return { reader: R, writer: W } as const;
}