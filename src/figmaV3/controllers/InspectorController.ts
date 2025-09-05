'use client';

import * as React from 'react';
import { useEngine } from '../engine/EditorEngine';
import type { NodeId, Viewport, CSSDict } from '../core/types';

export interface InspectorReader {
    selectedId(): NodeId | null;
    viewport(): Viewport;
    getNode(id: NodeId | null): any | null;
}
export interface InspectorWriter {
    select(id: NodeId): void;
    updateNodeProps(id: NodeId, patch: Record<string, unknown>): void;
    updateNodeStyles(id: NodeId, patch: CSSDict, viewport?: Viewport): void;
    setExpertMode(on: boolean): void;
    notify(msg: string): void;
}
export interface InspectorController {
    reader(): InspectorReader;
    writer(): InspectorWriter;
}

export function useInspectorController(): InspectorController {
    const eng = useEngine();

    const reader = React.useMemo<InspectorReader>(() => ({
        selectedId() { return (eng.ui as any)?.selectedId ?? null; },
        viewport() { return (eng.ui as any)?.canvas?.activeViewport ?? 'base'; },
        getNode(id) { if (!id) return null; return (eng.project as any)?.nodes?.[id] ?? null; },
    }), [eng.project, eng.ui]);

    const writer = React.useMemo<InspectorWriter>(() => ({
        select(id) {
            if (typeof eng.selectNode === 'function') eng.selectNode(id);
            else eng.update((s: any) => { (s.ui as any).selectedId = id; });
        },
        updateNodeProps(id, patch) {
            eng.update((s: any) => {
                const n = s.project?.nodes?.[id]; if (!n) return;
                n.props = { ...(n.props ?? {}), ...(patch as any) };
            });
        },
        updateNodeStyles(id, patch, _viewport) {
            eng.update((s: any) => {
                const n = s.project?.nodes?.[id]; if (!n) return;
                const prev = (n.props?.style ?? {}) as Record<string, unknown>;
                n.props = { ...(n.props ?? {}), style: { ...prev, ...(patch as any) } };
            });
        },
        setExpertMode(on) {
            eng.update((s: any) => { (s.ui as any).expertMode = !!on; });
        },
        notify(msg) { eng.notify(msg); },
    }), [eng]);

    return React.useMemo(() => ({ reader: () => reader, writer: () => writer }), [reader, writer]);
}