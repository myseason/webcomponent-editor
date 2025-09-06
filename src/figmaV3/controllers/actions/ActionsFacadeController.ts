'use client';

import { useMemo } from 'react';
import { useActionsController } from './ActionsController';
import type { ActionStep, Page } from '../../core/types';
import { EditorEngine } from '../../engine/EditorEngine';

/**
 * 화면에서 기대하는 읽기 Facade
 * - 기존 호출(예: facadeToken, selectedNodeId, pages, defaultNavigateTargetId)도 alias로 유지
 */
export interface ActionsFacadeReader {
    getActionBag(nodeId?: string | null): Readonly<Record<string, { steps: ActionStep[] }>>;
    getEventKeys(nodeId?: string | null): ReadonlyArray<string>;
    getActionSteps(nodeId: string | null, eventName: string): ReadonlyArray<ActionStep>;
    /** 리렌더 토큰(기본) */
    token(nodeId?: string | null): string;
    /** 호환용 alias */
    facadeToken(): string;

    /** 아래는 기존 ActionsPanel이 기대하던 편의 메서드(페이지 데이터 등) */
    selectedNodeId(): string | null;
    pages(): ReadonlyArray<Page>;
    defaultNavigateTargetId(): string | null;
}

export interface ActionsFacadeWriter {
    setActionSteps(nodeId: string, eventName: string, steps: ActionStep[]): void;
    appendActionStep(nodeId: string, eventName: string, step: ActionStep): void;
    /** 인덱스 스텝 부분 수정 */
    updateActionStep(nodeId: string, eventName: string, index: number, patch: Partial<ActionStep>): void;
    removeActionStep(nodeId: string, eventName: string, index: number): void;
    moveActionStep(nodeId: string, eventName: string, from: number, to: number): void;
    /** 특정 노드의 이벤트 실행 */
    run(nodeId: string, eventName: string): void;
    /** 스텝 배열 직접 실행 */
    runSteps(steps: ReadonlyArray<ActionStep>): void;

    /** 호환용 alias: (nodeId, eventName) 시그니처를 기대하는 기존 코드 대응 */
    runActionSteps(nodeId: string, eventName: string): void;
}

export interface ActionsFacadeController {
    reader(): ActionsFacadeReader;
    writer(): ActionsFacadeWriter;
}

export function useActionsFacadeController(): ActionsFacadeController {
    const { reader: r0, writer: w0 } = useActionsController();
    const AR = r0();
    const AW = w0();

    const reader = useMemo<ActionsFacadeReader>(() => {
        return {
            getActionBag(nid) {
                const bag = AR.getActionBag(nid ?? null);
                // Facade는 항상 객체를 반환해야 하므로 undefined -> {}
                return (bag ?? {}) as Readonly<Record<string, { steps: ActionStep[] }>>;
            },
            getEventKeys(nid) {
                return AR.getEventNames(nid ?? null);
            },
            getActionSteps(nid, evt) {
                return AR.getActionSteps(nid, evt);
            },

            token(nid) {
                return AR.token(nid ?? null);
            },
            // 호환용
            facadeToken() {
                return AR.token(null);
            },

            // === 편의 메서드: 기존 ActionsPanel 참조 보존 ===
            selectedNodeId() {
                return EditorEngine.nodes.getSelectedNodeId();
            },
            pages() {
                // Engine에 전용 pages API가 없다면 store에서 안전 조회
                const state = EditorEngine.getState() as any;
                return (state?.project?.pages ?? []) as ReadonlyArray<Page>;
            },
            defaultNavigateTargetId() {
                // 기본 네비게이션 목적지: 현 선택 페이지 또는 첫 페이지
                const st = EditorEngine.getState() as any;
                const pid =
                    (st?.ui?.currentPageId as string | null | undefined) ??
                    (st?.project?.pages?.[0]?.id as string | undefined) ??
                    null;
                return pid;
            },
        };
    }, [AR]);

    const writer = useMemo<ActionsFacadeWriter>(() => {
        return {
            setActionSteps(nodeId, eventName, steps) {
                // readonly로 들어와도 내부에서 복사 후 전달
                AW.setActionSteps(nodeId, eventName, steps.slice());
            },
            appendActionStep(nodeId, eventName, step) {
                AW.appendActionStep(nodeId, eventName, step);
            },
            updateActionStep(nodeId, eventName, index, patch) {
                // 타입 안전성: 기존 스텝을 복사해서 부분 병합 후 캐스팅
                const curr = AR.getActionSteps(nodeId, eventName).slice();
                if (index < 0 || index >= curr.length) return;

                // 동일 kind에 한해 부분 병합, kind가 바뀌는 patch라면 교체
                const before = curr[index];
                const next =
                    (patch as any)?.kind && (patch as any).kind !== (before as any).kind
                        ? (patch as ActionStep) // kind 바뀌면 교체
                        : ({ ...(before as any), ...(patch as any) } as ActionStep); // 같은 kind면 병합

                curr[index] = next;
                AW.setActionSteps(nodeId, eventName, curr);
            },
            removeActionStep(nodeId, eventName, index) {
                AW.removeActionStep(nodeId, eventName, index);
            },
            moveActionStep(nodeId, eventName, from, to) {
                AW.moveActionStep(nodeId, eventName, from, to);
            },
            run(nodeId, eventName) {
                AW.runNodeEvent(nodeId, eventName);
            },
            runSteps(steps) {
                AW.runActionSteps(steps.slice());
            },
            // 호환용 alias
            runActionSteps(nodeId, eventName) {
                AW.runNodeEvent(nodeId, eventName);
            },
        };
    }, [AR, AW]);

    return useMemo(() => ({ reader: () => reader, writer: () => writer }), [reader, writer]);
}