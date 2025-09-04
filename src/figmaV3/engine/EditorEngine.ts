// src/figmaV3/engine/EditorEngine.ts
import type { NodeId } from '../core/types';

type AnyRecord = Record<string, unknown>;

/**
 * EditorEngine (Facade, POJO)
 * - 절대 React Hook을 호출하지 않습니다.
 * - 외부(커스텀 훅)에서 전달 받은 state 레퍼런스를 사용합니다.
 */
export class EditorEngine {
    constructor(
        private readonly state: {
            ui: any;
            project: any;
            updateNodeProps?: (id: NodeId, patch: AnyRecord) => void;
            updateNodeStyles?: (id: NodeId, patch: AnyRecord) => void;
        }
    ) {}

    // ===== Query =====
    getUI() {
        return this.state.ui;
    }

    getProject() {
        return this.state.project;
    }

    getNode(nodeId: NodeId) {
        return this.state.project?.nodes?.[nodeId] ?? null;
    }

    getComponentIdOf(nodeId: NodeId): string | null {
        return (this.getNode(nodeId)?.componentId as string) ?? null;
    }

    // ===== Command (초기엔 기존 액션 위임; 이후 CommandBus로 교체 예정) =====
    updateNodeProps(nodeId: NodeId, patch: AnyRecord) {
        if (typeof this.state.updateNodeProps === 'function') {
            this.state.updateNodeProps(nodeId, patch);
        }
    }

    updateNodeStyles(nodeId: NodeId, patch: AnyRecord) {
        if (typeof this.state.updateNodeStyles === 'function') {
            this.state.updateNodeStyles(nodeId, patch);
        }
    }

    changeTag(nodeId: NodeId, tag: string) {
        if (typeof this.state.updateNodeProps === 'function') {
            this.state.updateNodeProps(nodeId, { __tag: tag });
        }
    }
}