'use client';

import * as React from 'react';
import { useActionsController } from '../ActionsController';
import { useEngine } from '../../engine/EditorEngine';
import type { NodeId, SupportedEvent, ActionStep } from '../../core/types';

export interface ActionsAdapterResult {
    // 기존 코드 호환(읽기 참조용)
    project: any;
    ui: any;

    // 기존 useEditor 표면 호환(알림/업데이트)
    setNotification: (msg: string) => void;
    update: (mutator: (draft: any) => void, recordHistory?: boolean) => void;

    // 이벤트/스텝 접근
    getSteps: (nodeId: NodeId, ev: SupportedEvent) => ActionStep[];
    setSteps: (nodeId: NodeId, ev: SupportedEvent, steps: ActionStep[]) => void;

    // 편의(기존 UI와의 표면 호환)
    addStep: (nodeId: NodeId, ev: SupportedEvent, step: ActionStep) => void;
    removeStep: (nodeId: NodeId, ev: SupportedEvent, index: number) => void;
    moveStep: (nodeId: NodeId, ev: SupportedEvent, from: number, to: number) => void;

    // 실행
    run: (nodeId: NodeId, ev: SupportedEvent) => Promise<void>;
}

/**
 * 기존 ActionsPanel 이 기대하는 useEditor() 표면을 컨트롤러 기반으로 브리지.
 * 컴포넌트는 import 만 교체하면 동작/레이아웃 불변.
 */
export function useActionsAdapter(): ActionsAdapterResult {
    const engine = useEngine();
    const ctrl = useActionsController();
    const R = ctrl.reader();
    const W = ctrl.writer();

    const getSteps = React.useCallback(
        (nodeId: NodeId, ev: SupportedEvent): ActionStep[] => {
            // Readonly → 가변 사본으로
            return [...R.getSteps(nodeId, ev)];
        },
        [R]
    );

    const setSteps = React.useCallback(
        (nodeId: NodeId, ev: SupportedEvent, steps: ActionStep[]) => {
            W.setSteps(nodeId, ev, steps);
        },
        [W]
    );

    const addStep = React.useCallback(
        (nodeId: NodeId, ev: SupportedEvent, step: ActionStep) => {
            const steps = getSteps(nodeId, ev);
            steps.push(step);
            W.setSteps(nodeId, ev, steps);
        },
        [getSteps, W]
    );

    const removeStep = React.useCallback(
        (nodeId: NodeId, ev: SupportedEvent, index: number) => {
            const steps = getSteps(nodeId, ev);
            if (index < 0 || index >= steps.length) return;
            steps.splice(index, 1);
            W.setSteps(nodeId, ev, steps);
        },
        [getSteps, W]
    );

    const moveStep = React.useCallback(
        (nodeId: NodeId, ev: SupportedEvent, from: number, to: number) => {
            const steps = getSteps(nodeId, ev);
            if (from < 0 || from >= steps.length) return;
            if (to < 0 || to >= steps.length) return;
            const [m] = steps.splice(from, 1);
            steps.splice(to, 0, m);
            W.setSteps(nodeId, ev, steps);
        },
        [getSteps, W]
    );

    const run = React.useCallback(
        async (nodeId: NodeId, ev: SupportedEvent) => {
            await W.run(nodeId, ev);
        },
        [W]
    );

    return {
        // 기존 useEditor 표면 호환
        project: engine.project,
        ui: engine.ui,
        setNotification: (msg: string) => engine.notify(msg),
        update: (mutator, recordHistory) => engine.update(mutator, !!recordHistory),

        // 액션 편집/실행
        getSteps,
        setSteps,
        addStep,
        removeStep,
        moveStep,
        run,
    };
}