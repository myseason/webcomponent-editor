'use client';

import { useRef, useSyncExternalStore } from 'react';
import { EditorEngine } from '../../engine/EditorEngine';

type Snap = {
    ui: any;
    project: {
        nodes: Record<string, any>;
        policies?: any;
        rootId?: string;
        inspectorFilters?: Record<string, any>;
    };
    token: string;
};

function computeSnap(): Snap {
    const s = EditorEngine.getState() as any;
    const ui = s?.ui ?? {};
    const project = s?.project ?? {};
    const nodes = (project.nodes ?? {}) as Record<string, any>;
    const policies = project.policies ?? undefined;
    const rootId = project.rootId ?? undefined;
    const inspectorFilters = project.inspectorFilters ?? undefined;

    const token = `${ui?.selectedId ?? ''}|${Object.keys(nodes).length}|${s?.__version__ ?? ''}`;
    return { ui, project: { nodes, policies, rootId, inspectorFilters }, token };
}

export function useNodePropsController() {
    const snapRef = useRef<Snap>(computeSnap());

    const subscribe = (onChange: () => void) => {
        const unsub = EditorEngine.subscribe(() => {
            const next = computeSnap();
            if (next.token !== snapRef.current.token) {
                snapRef.current = next;
                onChange();
            }
        });
        return () => { if (typeof unsub === 'function') unsub(); };
    };

    const getSnapshot = () => snapRef.current;
    const { ui, project } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    const updateNodeProps = (nodeId: string, patch: Record<string, unknown>) => {
        const eng: any = EditorEngine as any;
        if (eng?.nodes?.updateNodeProps) {
            eng.nodes.updateNodeProps(nodeId, patch);
            return;
        }
        EditorEngine.update((draft: any) => {
            const n = draft.project.nodes[nodeId];
            if (!n) return;
            n.props = { ...(n.props ?? {}), ...(patch ?? {}) };
        }, true);
    };

    return { ui, project, updateNodeProps };
}