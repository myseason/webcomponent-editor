// src/figmaV3/editor/bootstrap.ts
'use client';

import './components/registerBasics';
import { editorStore } from '../store/editorStore';
import {
    loadProjectFromLocal,
    loadUiFromLocal,
    saveProjectToLocal,
    saveUiToLocal,
} from '../runtime/persistence';
import type { EditorState, Project, EditorUI } from '../core/types';

function debounce<A extends unknown[]>(
    fn: (...args: A) => void,
    ms: number
) {
    let t: number | undefined;
    return (...args: A) => {
        if (t !== undefined) window.clearTimeout(t);
        t = window.setTimeout(() => fn(...args), ms) as unknown as number;
    };
}

const saveProjectDebounced = debounce<[Project]>(p => saveProjectToLocal(p), 250);
const saveUiDebounced = debounce<[EditorUI]>(ui => saveUiToLocal(ui), 250);

export function bootstrapEditor(): void {
    if (typeof window === 'undefined') return;

    // 1) 로컬에서 로드
    const p = loadProjectFromLocal();
    if (p) {
        editorStore.setState(prev => ({ ...prev, project: p }));
    }

    const ui = loadUiFromLocal();
    if (ui) {
        // NOTE: update로 병합 (패널/캔버스 파트는 얕은 병합로직 유지)
        editorStore.getState().update((s: EditorState) => {
            s.ui = {
                ...s.ui,
                ...ui,
                canvas: { ...s.ui.canvas, ...ui.canvas },
                panels: {
                    left:   { ...s.ui.panels.left,   ...(ui.panels?.left ?? {}) },
                    right:  { ...s.ui.panels.right,  ...(ui.panels?.right ?? {}) },
                    bottom: { ...s.ui.panels.bottom, ...(ui.panels?.bottom ?? {}) },
                },
            };
        });
    }

    // 2) 기본값 하이드레이션
    editorStore.getState()._hydrateDefaults?.();

    // 3) 변경 감지 → 저장(디바운스)
    let prevProjectJson = JSON.stringify(editorStore.getState().project);
    let prevUiJson = JSON.stringify(editorStore.getState().ui);

    editorStore.subscribe(next => {
        const pj = JSON.stringify(next.project);
        if (pj !== prevProjectJson) {
            prevProjectJson = pj;
            saveProjectDebounced(next.project);
        }

        const uj = JSON.stringify(next.ui);
        if (uj !== prevUiJson) {
            prevUiJson = uj;
            saveUiDebounced(next.ui);
        }
    });
}