'use client';

import * as React from 'react';
import { useEngine } from '../engine/Engine';
import type { NodeId } from '../core/types';

export interface LayersReader {
    getNode(id: NodeId): any | null;
    getChildren(id: NodeId): NodeId[];
    getRootId(): NodeId | null;
    isSelected(id: NodeId): boolean;
}
export interface LayersWriter {
    select(id: NodeId): void;
    toggleVisibility(id: NodeId): void;
    toggleLock(id: NodeId): void;
    removeCascade(id: NodeId): void;
    setProps?(nodeId: NodeId, patch: Record<string, unknown>): void;
}
export interface LayersController {
    reader(): LayersReader;
    writer(): LayersWriter;
}

export function useLayersController(): LayersController {
    const eng = useEngine();

    const reader = React.useMemo<LayersReader>(() => ({
        getNode(id) {
            return (eng.project as any)?.nodes?.[id] ?? null;
        },
        getChildren(id) {
            const n = (eng.project as any)?.nodes?.[id];
            return ((n?.children ?? []) as NodeId[]) || [];
        },
        getRootId() {
            return (eng.project as any)?.rootId ?? null;
        },
        isSelected(id) {
            return (eng.ui as any)?.selectedId === id;
        },
    }), [eng.project, eng.ui]);

    const writer = React.useMemo<LayersWriter>(() => ({
        select(id) {
            if (typeof eng.selectNode === 'function') eng.selectNode(id);
            else eng.update((s: any) => { (s.ui as any).selectedId = id; });
        },
        toggleVisibility(id) {
            eng.update((s: any) => {
                const n = s.project?.nodes?.[id]; if (!n) return;
                n.isVisible = !(n.isVisible ?? true);
            });
        },
        toggleLock(id) {
            eng.update((s: any) => {
                const n = s.project?.nodes?.[id]; if (!n) return;
                n.locked = !n.locked;
            });
        },
        removeCascade(id) {
            eng.update((s: any) => {
                const nodes = s.project?.nodes ?? {};
                const removeRec = (nid: NodeId) => {
                    const node = nodes[nid]; if (!node) return;
                    (node.children ?? []).forEach((cid: NodeId) => removeRec(cid));
                    delete nodes[nid];
                };
                removeRec(id);
            });
        },
        setProps(nodeId, patch) {
            eng.update((s: any) => {
                const n = s.project?.nodes?.[nodeId]; if (!n) return;
                n.props = { ...(n.props ?? {}), ...(patch as any) };
            });
        },
    }), [eng]);

    return React.useMemo(() => ({ reader: () => reader, writer: () => writer }), [reader, writer]);
}