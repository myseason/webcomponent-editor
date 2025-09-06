'use client';

import { useMemo } from 'react';
import { EditorEngine } from '../../engine/EditorEngine';
import type { ActionStep, NodeId } from '../../core/types';

/** 노드 props.__actions 의 정규화 타입 */
export type ActionsBag = Record<string, { steps: ActionStep[] }>;

export interface ActionsReader {
    /** 특정 노드의 액션 Bag 조회 */
    getActionBag(nodeId: string | null): ActionsBag | undefined;
    /** 특정 이벤트의 스텝 목록 조회 */
    getActionSteps(nodeId: string | null, eventName: string): ReadonlyArray<ActionStep>;
    /** 해당 노드에서 정의된 이벤트 이름 목록 */
    getEventNames(nodeId: string | null): ReadonlyArray<string>;
    /** View 리렌더 의존 토큰(선택/스텝 수/버전 등) */
    token(nodeId: string | null): string;
    /** (편의) 현재 선택 노드 조회 */
    getNode(nodeId: NodeId | null) : any | undefined;
}

export interface ActionsWriter {
    setActionSteps(nodeId: string, eventName: string, steps: ActionStep[]): void;
    appendActionStep(nodeId: string, eventName: string, step: ActionStep): void;
    removeActionStep(nodeId: string, eventName: string, index: number): void;
    moveActionStep(nodeId: string, eventName: string, from: number, to: number): void;
    runActionSteps(steps: ReadonlyArray<ActionStep>): void;
    runNodeEvent(nodeId: string, eventName: string): void;
}

export interface ActionsController {
    reader(): ActionsReader;
    writer(): ActionsWriter;
}

function normalizeBag(nodeId: string | null): ActionsBag | undefined {
    if (!nodeId) return undefined;
    const node = EditorEngine.nodes.getNodeById(nodeId);
    const bag = (node?.props as any)?.__actions as ActionsBag | undefined;
    if (!bag) return undefined;
    // 내부 일관성 보장
    Object.keys(bag).forEach((k) => {
        if (!Array.isArray(bag[k]?.steps)) bag[k] = { steps: [] };
    });
    return bag;
}

function buildReader(): ActionsReader {
    return {
        getActionBag(nodeId) {
            return normalizeBag(nodeId);
        },
        getActionSteps(nodeId, eventName) {
            const bag = normalizeBag(nodeId);
            return bag?.[eventName]?.steps ?? [];
        },
        getEventNames(nodeId) {
            const bag = normalizeBag(nodeId);
            return bag ? (Object.keys(bag) as ReadonlyArray<string>) : [];
        },
        token(nodeId) {
            // 선택 노드, 각 이벤트 스텝 수, 엔진 전역 버전 등을 섞어 간단 토큰 생성
            const selected = EditorEngine.nodes.getSelectedNodeId() ?? '';
            const bag = normalizeBag(nodeId) ?? {};
            const parts = [String(selected)];
            for (const evt of Object.keys(bag)) {
                parts.push(`${evt}:${bag[evt]?.steps?.length ?? 0}`);
            }
            // 엔진 버전이 있다면 추가 (없으면 생략)
            const v = (EditorEngine.getState() as any).__version__ ?? '';
            parts.push(String(v));
            return parts.join('|');
        },
        getNode(nodeId) {
            return nodeId ? EditorEngine.nodes.getNodeById(nodeId) : undefined;
        }
    };
}

function buildWriter(): ActionsWriter {
    return {
        setActionSteps(nodeId, eventName, steps) {
            EditorEngine.update((draft) => {
                const node = draft.project.nodes[nodeId];
                if (!node) return;
                const bag = ((node.props as any).__actions ??= {});
                (bag[eventName] ??= { steps: [] }).steps = [...steps];
            }, true);
        },

        appendActionStep(nodeId, eventName, step) {
            EditorEngine.update((draft) => {
                const node = draft.project.nodes[nodeId];
                if (!node) return;
                const bag = ((node.props as any).__actions ??= {});
                (bag[eventName] ??= { steps: [] }).steps.push(step);
            }, true);
        },

        removeActionStep(nodeId, eventName, index) {
            EditorEngine.update((draft) => {
                const node = draft.project.nodes[nodeId];
                if (!node) return;
                const bag = ((node.props as any).__actions ??= {});
                const arr = (bag[eventName] ??= { steps: [] }).steps;
                if (index >= 0 && index < arr.length) arr.splice(index, 1);
            }, true);
        },

        moveActionStep(nodeId, eventName, from, to) {
            if (from === to) return;
            EditorEngine.update((draft) => {
                const node = draft.project.nodes[nodeId];
                if (!node) return;
                const bag = ((node.props as any).__actions ??= {});
                const arr = (bag[eventName] ??= { steps: [] }).steps;
                if (from < 0 || from >= arr.length || to < 0 || to >= arr.length) return;
                const [moved] = arr.splice(from, 1);
                arr.splice(to, 0, moved);
            }, true);
        },

        runActionSteps(steps) {
            for (const s of steps) {
                switch (s.kind) {
                    case 'Alert':
                        EditorEngine.ui.setNotification(s.message);
                        break;
                    default:
                        break;
                }
            }
        },

        runNodeEvent(nodeId, eventName) {
            const bag = normalizeBag(nodeId);
            const steps = bag?.[eventName]?.steps ?? [];
            this.runActionSteps(steps);
        },
    };
}

export function useActionsController(): ActionsController {
    const reader = useMemo(() => buildReader(), []);
    const writer = useMemo(() => buildWriter(), []);
    return useMemo(() => ({ reader: () => reader, writer: () => writer }), [reader, writer]);
}