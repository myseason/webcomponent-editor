'use client';

import { EditorEngineCore } from '../EditorEngineCore';
import type { EditorStoreState } from '../../store/types';

/** 히스토리 스택의 표준 타입: 상태 스냅샷 배열(읽기 전용) */
export type HistoryStack = ReadonlyArray<EditorStoreState>;

export function historyDomain() {
    const reader = {
        /** 실행 취소 가능 여부 */
        canUndo: (): boolean => {
            const s = EditorEngineCore.getState();
            const past = (s as any).history?.past;
            return Array.isArray(past) && past.length > 0;
        },

        /** 다시 실행 가능 여부 */
        canRedo: (): boolean => {
            const s = EditorEngineCore.getState();
            const future = (s as any).history?.future;
            return Array.isArray(future) && future.length > 0;
        },

        /** ✅ 과거 스택 조회 (읽기 전용) */
        getPast: (): HistoryStack => {
            const s = EditorEngineCore.getState();
            const past = (s as any).history?.past ?? [];
            return past as HistoryStack;
        },

        /** ✅ 미래 스택 조회 (읽기 전용) */
        getFuture: (): HistoryStack => {
            const s = EditorEngineCore.getState();
            const future = (s as any).history?.future ?? [];
            return future as HistoryStack;
        },
    };

    const writer = {
        /** 실행 취소 */
        undo: () => {
            const s = EditorEngineCore.getState() as any;
            if (typeof s.undo === 'function') return s.undo();
            console.warn('[historyDomain] undo fallback no-op');
        },

        /** 다시 실행 */
        redo: () => {
            const s = EditorEngineCore.getState() as any;
            if (typeof s.redo === 'function') return s.redo();
            console.warn('[historyDomain] redo fallback no-op');
        },
    };

    return { reader, writer } as const;
}