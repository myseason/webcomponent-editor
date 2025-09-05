'use client';
import { useMemo } from 'react';
import { useEditor } from '../../editor/useEditor';
import { EditorEngine } from '../../engine/EditorEngine';

/** 컨트롤러 전용 훅: zustand state → EditorEngine 파사드로 감싼다 */
export function useEngine(): EditorEngine {
    const state = useEditor();
    return useMemo(() => new EditorEngine(state as any), [state]);
}