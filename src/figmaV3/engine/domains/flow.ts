import type { FlowEdge } from '../../core/types';
import { EditorCore } from '../EditorCore';
import { selectFlowEdges } from '../../store/slices/dataSlice';
import { genId } from '../../store/utils';

export function flowDomain() {
    const R = {
        /** 모든 플로우 엣지 맵을 가져옵니다. */
        getFlowEdges: (): Record<string, FlowEdge> => selectFlowEdges(EditorCore.getState()),
    };

    const W = {
        /** 새 플로우 엣지를 추가합니다. */
        addFlowEdge(edge: Omit<FlowEdge, 'id'>): string {
            const id = genId('edge');
            const currentEdges = R.getFlowEdges();
            const newEdges = { ...currentEdges, [id]: { ...edge, id } };
            EditorCore.store.getState()._setFlowEdges(newEdges);
            return id;
        },
        /** 플로우 엣지를 업데이트합니다. */
        updateFlowEdge(edgeId: string, patch: Partial<FlowEdge>) {
            const currentEdges = R.getFlowEdges();
            if (!currentEdges[edgeId]) return;
            const newEdges = { ...currentEdges, [edgeId]: { ...currentEdges[edgeId]!, ...patch } };
            EditorCore.store.getState()._setFlowEdges(newEdges);
        },
        /** 플로우 엣지를 제거합니다. */
        removeFlowEdge(edgeId: string) {
            const currentEdges = R.getFlowEdges();
            const { [edgeId]: _, ...newEdges } = currentEdges;
            EditorCore.store.getState()._setFlowEdges(newEdges);
        },
    };

    return { reader: R, writer: W } as const;
}