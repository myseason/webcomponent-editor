// src/figmaV3/store/slices/nodeSlice.ts

import { StateCreator } from 'zustand';
import { EditorStoreState, NodeSlice } from '../types';
import { Node, NodeId, CSSDict, Viewport } from '../../core/types';

// --- SELECTORS ---
export const selectNodes = (s: EditorStoreState) => s.project.nodes;
export const selectNodeById = (id: NodeId) => (s: EditorStoreState) => s.project.nodes[id];

// --- SLICE ---
export const createNodeSlice: StateCreator<EditorStoreState, [], [], NodeSlice> = (set, get) => ({
    _setNodes: (nodes) => get().update(s => { s.project.nodes = nodes; }, true),
    _patchNode: (id, patch) => get().update(s => { s.project.nodes[id] = { ...s.project.nodes[id]!, ...patch }; }, true),
    _updateNodeProps: (id, props) => get().update(s => {
        const node = s.project.nodes[id];
        if (node) node.props = { ...node.props, ...props };
    }, true),
    _updateNodeStyles: (id, styles, viewport) => get().update(s => {
        const node = s.project.nodes[id];
        if (!node) return;
        if (!node.styles) (node as any).styles = { element: { base: {} } };
        if (!node.styles.element) (node.styles as any).element = { base: {} };
        const base = s.ui.canvas.baseViewport;
        const vp = viewport ?? (s.ui.canvas.vpMode[s.ui.canvas.activeViewport] === 'Independent' ? s.ui.canvas.activeViewport : base);
        const prev = (node.styles.element as any)[vp] ?? {};
        (node.styles.element as any)[vp] = { ...prev, ...styles };
    }, true),
    _setNodeChildren: (id, children) => get().update(s => {
        const node = s.project.nodes[id];
        if (node) node.children = children;
    }, true),
});