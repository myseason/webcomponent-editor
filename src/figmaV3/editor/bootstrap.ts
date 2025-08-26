'use client';

import './components/registerBasics'; // side-effect import
import { editorStore } from '../store/editStore';
import { loadProjectFromLocal, loadUiFromLocal, saveProjectToLocal, saveUiToLocal } from '../runtime/persistence';
import type { EditorState, Project } from '../core/types';

function debounce<A extends unknown[]>(
    fn: (...args: A) => void,
    ms: number
): (...args: A) => void {
    let t: number | undefined;
    return (...args: A) => {
        if (t !== undefined) window.clearTimeout(t);
        t = window.setTimeout(() => fn(...args), ms);
    };
}

const saveProjectDebounced = debounce<[Project]>((p) => saveProjectToLocal(p), 120);
const saveUiDebounced = debounce<[EditorState['ui']]>((ui) => saveUiToLocal(ui), 120);

export function bootstrapEditor(): void {
    if (typeof window === 'undefined') return;

    // 1) 로컬 복원
    const st = editorStore.getState();
    const p = loadProjectFromLocal();
    if (p) {
        editorStore.setState({ ...st, project: p });
    }
    const ui = loadUiFromLocal();
    if (ui) {
        editorStore.setState((prev) => ({ ...prev, ui: { ...prev.ui, ...ui } }));
    }

    // ✅ 1회 하이드레이트: 레지스트리 defaults를 모든 노드에 병합
    editorStore.getState().hydrateDefaults?.();

    // 2) 변경 감지 → debounce 저장
    let prevProjectJson = JSON.stringify(editorStore.getState().project);
    let prevUiJson = JSON.stringify(editorStore.getState().ui);

    editorStore.subscribe((next) => {
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