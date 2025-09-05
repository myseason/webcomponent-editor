'use client';

import { useMemo } from 'react';
import type { Fragment, Node, NodeId } from '../../core/types';
import { useEngine } from '../adapters/useEngine';
import type { EditorEngine } from '../../engine/EditorEngine';

export interface LayersReader {
    rootId(): NodeId | null;
    getNode(id: NodeId): Node | null;
    getChildren(id: NodeId): readonly NodeId[];
    isRoot(id: NodeId): boolean;
    selectedId(): NodeId | null;
    token(): unknown;
}
export interface LayersWriter {
    setSelected(id: NodeId | null): void;
    toggleVisible(id: NodeId): void;
    toggleLock(id: NodeId): void;
    removeCascade(id: NodeId): void;
}
export interface LayersController {
    reader(): LayersReader;
    writer(): LayersWriter;
}

function buildReader(engine: EditorEngine): LayersReader {
    return {
        rootId() {
            const ui = engine.getUI();
            const proj = engine.getProject();
            if (ui.mode === 'Component' && ui.editingFragmentId) {
                const frag = proj.fragments.find((f: Fragment) => f.id === ui.editingFragmentId) ?? null;
                return frag?.rootId ?? null;
            }
            return proj.rootId ?? null;
        },
        getNode(id) {
            return engine.getNode(id);
        },
        getChildren(id) {
            const n = engine.getNode(id);
            const nodes = engine.getProject().nodes ?? {};
            const children = (n?.children ?? []) as NodeId[];
            return children.filter((cid) => !!nodes[cid]);
        },
        isRoot(id) {
            const ui = engine.getUI();
            const proj = engine.getProject();
            const frag = proj.fragments.find((f: Fragment) => f.id === ui.editingFragmentId) ?? null;
            return id === proj.rootId || (frag?.rootId === id);
        },
        selectedId() {
            return engine.getUI().selectedId ?? null;
        },
        token() {
            const p = engine.getProject();
            return [p.rootId, Object.keys(p.nodes ?? {}).length, engine.getUI().selectedId];
        },
    };
}

function buildWriter(engine: EditorEngine): LayersWriter {
    return {
        setSelected(id) { engine.select(id); },
        toggleVisible(id) { engine.toggleNodeVisibility(id); },
        toggleLock(id) { engine.toggleNodeLock(id); },
        removeCascade(id) { engine.removeNodeCascade(id); },
    };
}

export function useLayersController(): LayersController {
    const engine = useEngine();
    const reader = useMemo(() => buildReader(engine), [engine]);
    const writer = useMemo(() => buildWriter(engine), [engine]);
    return useMemo(() => ({ reader: () => reader, writer: () => writer }), [reader, writer]);
}