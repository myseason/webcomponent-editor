'use client';

import * as React from 'react';
import { useEditorLike as useEditor } from './adapters/useEditorLike';
import type { NodeId, SupportedEvent, ActionStep } from '../core/types';

type ActionsBag = Partial<Record<SupportedEvent, { steps: ActionStep[] }>>;

export interface ActionsController {
    /** 현재 저장된 스텝 읽기(패널에서 바로 사용) */
    getSteps(nodeId: NodeId, event: SupportedEvent): ActionStep[];

    /** 지정 노드/이벤트의 스텝 배열을 통째로 교체 저장 */
    writeSteps(nodeId: NodeId, event: SupportedEvent, steps: ActionStep[]): void;

    /** 지정 노드/이벤트의 액션 실행 (최소 러너 내장) */
    run(nodeId: NodeId, event: SupportedEvent): void;
}

/** 과거 데이터 호환: {kind:'Console'} → {kind:'Alert'} 로 정규화 */
function normalizeSteps(steps: any[]): ActionStep[] {
    return (steps ?? []).map((s) => {
        if (s && s.kind === 'Console') {
            return { kind: 'Alert', message: String((s as any).message ?? 'Console') } as ActionStep;
        }
        return s as ActionStep;
    });
}

export function useActionsController(): ActionsController {
    const state = useEditor();

    const getSteps = React.useCallback(
        (nodeId: NodeId, event: SupportedEvent): ActionStep[] => {
            const node = state.project.nodes[nodeId];
            if (!node) return [];
            const bag = (node.props as Record<string, unknown>).__actions as ActionsBag | undefined;
            const raw = bag?.[event]?.steps ?? [];
            return normalizeSteps(raw);
        },
        [state.project.nodes]
    );

    /**
     * 중요: 렌더를 확실히 트리거하기 위해 state.update로 node.props 재할당
     */
    const writeSteps = React.useCallback(
        (nodeId: NodeId, event: SupportedEvent, steps: ActionStep[]) => {
            state.update((s: any) => {
                const node = s.project?.nodes?.[nodeId];
                if (!node) return;

                const prevBag: ActionsBag = (node.props?.__actions as ActionsBag) ?? {};
                const nextBag: ActionsBag = { ...prevBag, [event]: { steps } };

                node.props = { ...(node.props ?? {}), __actions: nextBag };
            });

            if (typeof state.setNotification === 'function') {
                state.setNotification('Actions updated');
            }
        },
        [state]
    );

    /** 최소 러너: Alert / SetProps 만 처리 (코어 타입 기준) */
    const run = React.useCallback(
        (nodeId: NodeId, event: SupportedEvent) => {
            const steps = getSteps(nodeId, event);
            if (!steps.length) {
                state.setNotification?.('No steps to run.');
                return;
            }

            for (const step of steps) {
                try {
                    if (step.kind === 'Alert') {
                        const msg = String(step.message ?? 'Alert');
                        if (typeof state.setNotification === 'function') state.setNotification(msg);
                        else if (typeof window !== 'undefined' && typeof window.alert === 'function') window.alert(msg);
                        else console.info('[Alert]', msg);
                    } else if (step.kind === 'SetProps') {
                        const targetId = step.nodeId ?? nodeId;
                        if (targetId && step.patch && typeof step.patch === 'object') {
                            state.update((s: any) => {
                                const n = s.project?.nodes?.[targetId];
                                if (!n) return;
                                n.props = { ...(n.props ?? {}), ...(step.patch as any) };
                            });
                        }
                    }
                    // TODO: 향후 runActions(ActionStep[], deps)로 대체 가능
                } catch (e) {
                    console.warn('[ActionsController.run] step failed', step, e);
                }
            }
        },
        [getSteps, state]
    );

    return { getSteps, writeSteps, run };
}