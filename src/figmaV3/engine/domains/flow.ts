'use client';

import type { FlowEdge } from '../../core/types';
import { EditorEngineCore } from '../EditorEngineCore';

export function flowDomain() {
    const R = {
        getFlowEdges(): Record<string, FlowEdge> {
            return (EditorEngineCore.getState().flowEdges ?? {}) as Record<string, FlowEdge>;
        },
    };

    const W = {
        addFlowEdge(edge: FlowEdge) {
            const s = EditorEngineCore.getState() as any;
            if (s.addFlowEdge) return s.addFlowEdge(edge);
            EditorEngineCore.updatePatch(({ get, set }) => {
                const prev = get();
                const map = { ...(prev.flowEdges ?? {}) } as Record<string, FlowEdge>;
                const id = edge.id ?? `flow_${Math.random().toString(36).slice(2, 9)}`;
                map[id] = { ...edge, id };
                set({ flowEdges: map } as any);
            });
        },
        updateFlowEdge(edgeId: string, patch: Partial<FlowEdge>) {
            const s = EditorEngineCore.getState() as any;
            if (s.updateFlowEdge) return s.updateFlowEdge(edgeId, patch);
            EditorEngineCore.updatePatch(({ get, set }) => {
                const prev = get();
                const map = { ...(prev.flowEdges ?? {}) } as Record<string, FlowEdge>;
                if (!map[edgeId]) return;
                map[edgeId] = { ...map[edgeId], ...patch };
                set({ flowEdges: map } as any);
            });
        },
        removeFlowEdge(edgeId: string) {
            const s = EditorEngineCore.getState() as any;
            if (s.removeFlowEdge) return s.removeFlowEdge(edgeId);
            EditorEngineCore.updatePatch(({ get, set }) => {
                const prev = get();
                const map = { ...(prev.flowEdges ?? {}) } as Record<string, FlowEdge>;
                delete map[edgeId];
                set({ flowEdges: map } as any);
            });
        },
    };

    return { reader: R, writer: W } as const;
}