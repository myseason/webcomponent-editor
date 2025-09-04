import type { NodeId } from '../core/types';
import { EditorEngine } from '../engine/EditorEngine';
import { computeInspectorTargetNodeId } from '../engine/selectors/inspector';

/**
 * InspectorController (스켈레톤)
 * - Phase 1: 대상 nodeId/componentId만 산출 (정책/섹션 VM은 이후 단계)
 */
export type InspectorVM = {
    target: null | {
        nodeId: NodeId;
        componentId: string | null;
    };
};

export class InspectorController {
    constructor(private readonly engine: EditorEngine) {}

    computeViewModel(): InspectorVM {
        const nodeId = computeInspectorTargetNodeId(this.engine);
        if (!nodeId) return { target: null };

        const componentId = this.engine.getComponentIdOf(nodeId);
        return {
            target: { nodeId, componentId }
        };
    }
}