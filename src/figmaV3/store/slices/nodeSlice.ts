import { StateCreator } from 'zustand';
import { EditorStoreState } from '../types';
import { Node, NodeId, CSSDict, Viewport, Fragment } from '../../core/types';
import { genId, buildNodeWithDefaults, chooseValidParentId, findParentId, collectSubtreeIds, cloneSubtree } from '../utils';
import { getDefinition } from '../../core/registry';

export interface NodeSlice {
    addByDef: (defId: string, parentId?: NodeId) => NodeId;
    addByDefAt: (defId: string, parentId: NodeId, index: number) => void;
    patchNode: (id: NodeId, patch: Partial<Node>) => void;
    updateNodeProps: (id: NodeId, props: Record<string, unknown>) => void;
    updateNodeStyles: (id: NodeId, styles: CSSDict, viewport?: Viewport) => void;
    moveNode: (nodeId: NodeId, newParentId: NodeId, newIndex: number) => void;
    removeNodeCascade: (nodeId: NodeId) => void;
    toggleNodeVisibility: (nodeId: NodeId) => void;
    toggleNodeLock: (nodeId: NodeId) => void;
    saveNodeAsComponent: (nodeId: NodeId, name: string, description: string, isPublic: boolean) => void;
    insertComponent: (fragmentId: string, parentId?: NodeId) => void;
    hydrateDefaults: () => void;
}

export const createNodeSlice: StateCreator<EditorStoreState, [], [], NodeSlice> = (set, get, _api) => ({
    addByDef: (defId, parentId) => {
        const newId = genId(`node_${defId}`);
        get().update((s) => {
            s.project.nodes[newId] = buildNodeWithDefaults(defId, newId);
            const p = s.project;
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
        get().update((s) => {
            s.project.nodes[newId] = buildNodeWithDefaults(defId, newId);
            const parentNode = s.project.nodes[parentId]!;
            if (!parentNode.children) parentNode.children = [];
            const clamped = Math.max(0, Math.min(index, parentNode.children.length));
            parentNode.children.splice(clamped, 0, newId);
            s.ui.selectedId = newId;
        }, true);
    },
    patchNode: (id, patch) => get().update(s => { s.project.nodes[id] = { ...s.project.nodes[id]!, ...patch }; }, true),
    updateNodeProps: (id, props) => get().update(s => {
        const node = s.project.nodes[id]!;
        s.project.nodes[id] = { ...node, props: { ...node.props, ...props } };
    }, true),
    updateNodeStyles: (id, styles, viewport) => get().update(s => {
        const node = s.project.nodes[id];
        if (!node) return;
        if (!node.styles) (node as any).styles = { element: { base: {} } };
        if (!node.styles.element) (node.styles as any).element = { base: {} };
        const base = s.ui.canvas.baseViewport;
        const vp = viewport ?? (s.ui.canvas.vpMode[s.ui.canvas.activeViewport] === 'Independent' ? s.ui.canvas.activeViewport : base);
        const prev = (node.styles.element as any)[vp] ?? {};
        (node.styles.element as any)[vp] = { ...prev, ...styles };
    }, true),
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
    toggleNodeVisibility: (nodeId) => get().update((s) => { const n = s.project.nodes[nodeId]; if (n) n.isVisible = !n.isVisible; }, true),
    toggleNodeLock: (nodeId) => get().update((s) => { const n = s.project.nodes[nodeId]; if (n) n.locked = !n.locked; }, true),
    saveNodeAsComponent: (nodeId, name, description, isPublic) => get().update(s => {
        const { nodes: clonedNodes, newRootId } = cloneSubtree(s.project.nodes, nodeId);
        const newFragment: Fragment = {
            id: genId('comp'), name, description, rootId: newRootId, isPublic,
        };
        s.project.nodes = { ...s.project.nodes, ...clonedNodes };
        s.project.fragments.push(newFragment);
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
});