import { EditorCore } from '../EditorCore';
import type { ActionStep, EditorState, NodeId, SupportedEvent } from '../../core/types';

type ActionsBag = Partial<Record<SupportedEvent, { steps: ActionStep[] }>>;

export function actionsDomain() {
    const R = {
        /** 특정 노드의 특정 이벤트에 대한 액션 스텝 목록을 가져옵니다. */
        getActionSteps(nodeId: NodeId, event: SupportedEvent): ReadonlyArray<ActionStep> {
            const node = EditorCore.getState().project.nodes[nodeId];
            if (!node) return [];
            const bag = (node.props as Record<string, any>).__actions as ActionsBag | undefined;
            return bag?.[event]?.steps ?? [];
        },
    };

    const W = {
        /** 특정 노드의 이벤트에 대한 액션 스텝 목록 전체를 설정합니다. */
        setActionSteps(nodeId: NodeId, event: SupportedEvent, steps: ActionStep[]) {
            EditorCore.store.getState()._updateNodeProps(nodeId, {
                __actions: {
                    ...((EditorCore.store.getState().project.nodes[nodeId]?.props as any)?.__actions ?? {}),
                    [event]: { steps },
                },
            });
        },

        /** 액션 스텝을 추가합니다. */
        appendActionStep(nodeId: NodeId, event: SupportedEvent, step: ActionStep) {
            const currentSteps = R.getActionSteps(nodeId, event);
            W.setActionSteps(nodeId, event, [...currentSteps, step]);
        },

        /** 특정 인덱스의 액션 스텝을 업데이트합니다. */
        updateActionStep(nodeId: NodeId, event: SupportedEvent, index: number, patch: Partial<ActionStep>) {
            const currentSteps = Array.from(R.getActionSteps(nodeId, event));
            const targetStep = currentSteps[index];

            if (!targetStep) return;

            // ✅ 해결책: 병합된 객체가 ActionStep임을 명시적으로 단언합니다.
            const updatedStep = { ...targetStep, ...patch } as ActionStep;
            currentSteps[index] = updatedStep;

            W.setActionSteps(nodeId, event, currentSteps);
        },

        /** 특정 인덱스의 액션 스텝을 제거합니다. */
        removeActionStep(nodeId: NodeId, event: SupportedEvent, index: number) {
            const currentSteps = R.getActionSteps(nodeId, event);
            const nextSteps = currentSteps.filter((_, i) => i !== index);
            W.setActionSteps(nodeId, event, nextSteps);
        }
    };

    return { reader: R, writer: W } as const;
}