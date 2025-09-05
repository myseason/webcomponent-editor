'use client';

/**
 * ActionsFacadeController
 * - View에서 액션(steps) 편집/실행과 관련된 모든 읽기/쓰기 경로를 단일 파사드로 제공
 * - 내부적으로 ActionsController + UiController + PagesController를 결합
 *
 * 네이밍 규칙:
 *  Reader:
 *    - selectedNodeId()
 *    - selectedPageId()
 *    - pages() : ReadonlyArray<Page>
 *    - getEventKeys(nodeId)
 *    - getSteps(nodeId, evt)
 *    - getActionBag(nodeId)
 *    - defaultNavigateTargetId()
 *    - facadeToken()
 *  Writer:
 *    - setActionSteps(nodeId, evt, steps)
 *    - addActionStep(nodeId, evt, step)
 *    - updateActionStep(nodeId, evt, index, patch)
 *    - removeActionStep(nodeId, evt, index)
 *    - runActionSteps(nodeId, evt)
 *    - setNotification?(msg)
 */

import { useMemo } from 'react';
import type { Page } from '../../core/types';

import { useActionsController } from './ActionsController';
import { useUiController } from '../ui/UiController';
import { usePagesController } from '../pages/PagesController';

export interface ActionsFacadeReader {
    /** 현재 선택된 노드 id */
    selectedNodeId(): string | null;

    /** 현재 선택된 페이지 id */
    selectedPageId(): string | null;

    /** 프로젝트의 페이지 목록(읽기 전용) */
    pages(): ReadonlyArray<Page>;

    /** 해당 노드에서 사용 가능한 이벤트 키 목록 */
    getEventKeys(nodeId: string | null | undefined): string[];

    /** 해당 노드/이벤트의 steps */
    getActionSteps(nodeId: string | null | undefined, evt: string): ReadonlyArray<any>;

    /** 해당 노드의 actions bag */
    getActionBag(nodeId: string | null | undefined): Readonly<Record<string, { steps: any[] }>>;

    /** 기본 네비게이션 타겟 페이지 id (없으면 null) */
    defaultNavigateTargetId(): string | null;

    /** deps 토큰 */
    facadeToken(): string;
}

export interface ActionsFacadeWriter {
    setActionSteps(nodeId: string, evt: string, steps: any[]): void;
    addActionStep(nodeId: string, evt: string, step: any): void;
    updateActionStep(nodeId: string, evt: string, index: number, patch: Partial<any>): void;
    removeActionStep(nodeId: string, evt: string, index: number): void;
    runActionSteps(nodeId: string, evt: string): Promise<void> | void;

    setNotification?(msg: string): void;
}

export interface ActionsFacadeController {
    reader(): ActionsFacadeReader;
    writer(): ActionsFacadeWriter;
}

export function useActionsFacadeController(): ActionsFacadeController {
    const A = useActionsController();
    const U = useUiController();
    const P = usePagesController();

    const AR = A.reader();
    const AW = A.writer();
    const UR = U.reader();
    const UW = U.writer?.();

    const PR = P.reader();

    const reader = useMemo<ActionsFacadeReader>(() => ({
        selectedNodeId: () => UR.selectedId(),
        selectedPageId: () => PR.currentPageId(),
        pages: () => PR.list() as ReadonlyArray<Page>,
        getEventKeys: (nid) => AR.getEventKeys(nid),
        getActionSteps: (nid, evt) => AR.getSteps(nid, evt),
        getActionBag: (nid) => AR.getActionBag(nid),
        defaultNavigateTargetId: () => {
            const pages = PR.list();
            if (pages.length > 0) return pages[0].id;
            return null;
        },
        facadeToken: () => {
            const parts = [
                AR.facadeToken?.(),
                UR.token?.(),
                PR.token?.(),
            ].filter(Boolean);
            return parts.join('||');
        },
    }), [AR, UR, PR]);

    const writer = useMemo<ActionsFacadeWriter>(() => ({
        setActionSteps: (nid, evt, steps) => AW.setActionSteps(nid, evt, steps),
        addActionStep: (nid, evt, step) => AW.addActionStep(nid, evt, step),
        updateActionStep: (nid, evt, idx, patch) => AW.updateActionStep(nid, evt, idx, patch),
        removeActionStep: (nid, evt, idx) => AW.removeActionStep(nid, evt, idx),
        runActionSteps: (nid, evt) => AW.runActionSteps(nid, evt),
        setNotification: UW?.setNotification?.bind(UW),
    }), [AW, UW]);

    return useMemo(() => ({ reader: () => reader, writer: () => writer }), [reader, writer]);
}