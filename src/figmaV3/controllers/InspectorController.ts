'use client';

import { EditorEngine } from '../engine/EditorEngine';
import type { NodeId } from '../core/types';
import { computeInspectorTargetNodeId } from '../engine/selectors/inspector';

export class InspectorController {
    // 값 타입이 아니라 정적 파사드 타입 주입
    constructor(private readonly engine: typeof EditorEngine = EditorEngine) {}

    getTargetNodeId(): NodeId | null {
        // computeInspectorTargetNodeId는 정적 파사드 직접 참조로 변경됨(인자 제거)
        const nodeId = computeInspectorTargetNodeId();
        return nodeId ?? null;
    }
}