import { StateCreator } from 'zustand';
import { EditorStoreState, NodeSlice } from '../types';
import { Node, NodeId, CSSDict, Viewport } from '../../core/types';
import { findParentId, collectSubtreeIds } from '../utils';

// --- SELECTORS ---
export const selectNodes = (s: EditorStoreState) => s.project.nodes;
export const selectNodeById = (id: NodeId) => (s: EditorStoreState) => s.project.nodes[id];

// --- SLICE ---
export const createNodeSlice: StateCreator<EditorStoreState, [], [], NodeSlice> = (set, get) => ({
    _setNodes: (nodes) => get().update((s) => { s.project.nodes = nodes; }, true),

    _createNode: (node) => get().update((s) => {
        if (s.project.nodes[node.id]) return; // id 중복 방지
        s.project.nodes[node.id] = node;
    }, true),

    _deleteNodeCascade: (id) => get().update((s) => {
        if (id === s.project.rootId) return;
        const parentId = findParentId(s.project.nodes, id);
        if (parentId) {
            const parent = s.project.nodes[parentId]!;
            parent.children = (parent.children ?? []).filter((cid) => cid !== id);
        }
        const ids = collectSubtreeIds(s.project.nodes, id);
        ids.forEach((nid) => delete s.project.nodes[nid]);

        if (s.ui.selectedId && ids.includes(s.ui.selectedId)) {
            s.ui.selectedId = parentId ?? s.project.rootId;
        }
    }, true),

    _patchNode: (id, patch) => get().update((s) => {
        if (!s.project.nodes[id]) return;
        s.project.nodes[id] = { ...s.project.nodes[id]!, ...patch };
    }, true),

    _bulkPatchNodes: (patches) => get().update((s) => {
        for (const { id, patch } of patches) {
            if (!s.project.nodes[id]) continue;
            s.project.nodes[id] = { ...s.project.nodes[id]!, ...patch };
        }
    }, true),

    _updateNodeProps: (id, props) => get().update((s) => {
        const node = s.project.nodes[id];
        if (node) node.props = { ...node.props, ...props };
    }, true),

    _updateNodeStyles: (id, styles, viewport) => get().update((s) => {
        const node = s.project.nodes[id];
        if (!node) return;

        if (!node.styles) (node as any).styles = { element: { base: {} } };
        if (!node.styles.element) (node.styles as any).element = { base: {} };

        const base = s.ui.canvas.baseViewport;
        const vp =
            viewport ??
            (s.ui.canvas.vpMode[s.ui.canvas.activeViewport] === 'Independent'
                ? s.ui.canvas.activeViewport
                : base);

        const prev = (node.styles.element as any)[vp] ?? {};
        (node.styles.element as any)[vp] = { ...prev, ...styles };
    }, true),

    _setNodeChildren: (id, children) => get().update((s) => {
        const node = s.project.nodes[id];
        if (node) node.children = children;
    }, true),

    _reorderChild: (parentId, fromIndex, toIndex) => get().update((s) => {
        const parent = s.project.nodes[parentId];
        if (!parent || !parent.children) return;
        const list = [...parent.children];
        const [moved] = list.splice(fromIndex, 1);
        list.splice(Math.max(0, Math.min(toIndex, list.length)), 0, moved);
        parent.children = list;
    }, true),

    _moveNode: (nodeId, newParentId, newIndex) => get().update((s) => {
        if (nodeId === s.project.rootId) return;
        const oldParentId = findParentId(s.project.nodes, nodeId);
        if (oldParentId) {
            const oldParent = s.project.nodes[oldParentId]!;
            oldParent.children = (oldParent.children ?? []).filter((id) => id !== nodeId);
        }
        const newParent = s.project.nodes[newParentId]!;
        if (!newParent.children) newParent.children = [];
        const idx = Math.max(0, Math.min(newIndex, newParent.children.length));
        newParent.children.splice(idx, 0, nodeId);
    }, true),

    _toggleNodeVisibility: (id) => get().update((s) => {
        const n = s.project.nodes[id];
        if (!n) return;
        n.isVisible = !n.isVisible;
    }, true),

    _toggleNodeLock: (id) => get().update((s) => {
        const n = s.project.nodes[id];
        if (!n) return;
        n.locked = !n.locked;
    }, true),
});