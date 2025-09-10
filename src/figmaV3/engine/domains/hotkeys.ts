'use client';

import { EditorCore } from '../EditorCore';
import type { EditorStoreState } from '../../store/types';
import { nodesDomain } from './nodes';
import { pagesDomain } from './pages';

/**
 * 전역 에디터 단축키 설치/해제 (도메인 레이어)
 * - controllers/hooks.ts 대체
 * - 기존 엔진/도메인 패턴을 유지: nodesDomain/pagesDomain의 writer 사용 + store slice 원자연산 호출
 */
export function installEditorHotkeys(): () => void {
    const s = EditorCore.store.getState() as EditorStoreState;
    const { writer: ND } = nodesDomain();
    const { writer: PD } = pagesDomain();

    const onKey = (e: KeyboardEvent) => {
        // 플랫폼별 수정키
        const isMac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');
        const mod = isMac ? e.metaKey : e.ctrlKey;

        const state = EditorCore.store.getState() as EditorStoreState;
        const sel = state.ui.selectedId;

        // Undo / Redo
        if (mod && !e.shiftKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            state._undo?.();
            return;
        }
        if (mod && e.shiftKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            state._redo?.();
            return;
        }

        // Duplicate
        if (mod && e.key.toLowerCase() === 'd' && sel) {
            e.preventDefault();
            ND.duplicateSelected?.();
            return;
        }

        // Group / Ungroup
        if (mod && e.key.toLowerCase() === 'g') {
            e.preventDefault();
            if (e.shiftKey && sel) {
                ND.ungroupSelected?.();
            } else if (sel) {
                ND.groupSelected?.();
            }
            return;
        }

        // Lock
        if (mod && e.key.toLowerCase() === 'l' && sel) {
            e.preventDefault();
            state._toggleNodeLock?.(sel);
            return;
        }

        // Hide
        if (mod && e.key.toLowerCase() === 'h' && sel) {
            e.preventDefault();
            state._toggleNodeVisibility?.(sel);
            return;
        }

        // Delete / Backspace
        if ((e.key === 'Backspace' || e.key === 'Delete') && sel) {
            if (sel !== state.project.rootId) {
                e.preventDefault();
                state._deleteNodeCascade?.(sel);
            }
            return;
        }
    };

    if (typeof window !== 'undefined') {
        window.addEventListener('keydown', onKey);
    }

    // disposer
    return () => {
        if (typeof window !== 'undefined') {
            window.removeEventListener('keydown', onKey);
        }
    };
}