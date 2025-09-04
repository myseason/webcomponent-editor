'use client';

/**
 * UI를 바꾸지 않고도 쉽게 Undo/Redo를 연결하기 위한 선택 훅.
 * - 키바인딩, 개발용 버튼 등에서 호출 가능.
 * - 컨트롤러, undoService, HistoryExecutor를 이어줍니다.
 */

import * as React from 'react';
import { useInspectorController } from '../controllers/InspectorController';
import { undoService } from '../domain/history/UndoService';
import { applyCommand } from '../domain/history/HistoryExecutor';

export function useBindUndoRedo(options?: { withKeyBinding?: boolean }) {
    const ctl = useInspectorController();

    const undo = React.useCallback(() => {
        const inverse = undoService.popUndo();
        if (inverse) applyCommand(inverse, ctl);
    }, [ctl]);

    const redo = React.useCallback(() => {
        const redoCmd = undoService.popRedo();
        if (redoCmd) applyCommand(redoCmd, ctl);
    }, [ctl]);

    // (옵션) 브라우저 키바인딩: Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z
    React.useEffect(() => {
        if (!options?.withKeyBinding) return;
        const onKey = (e: KeyboardEvent) => {
            const mod = e.metaKey || e.ctrlKey;
            if (!mod) return;
            if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            } else if ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y') {
                e.preventDefault();
                redo();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [undo, redo, options?.withKeyBinding]);

    return { undo, redo, canUndo: undoService.canUndo(), canRedo: undoService.canRedo() };
}