'use client';
/**
 * bootstrapEditor
 * - 기본 컴포넌트 등록(사이드 이펙트 import)
 * - 로컬스토리지에서 프로젝트/UI 복원
 * - 상태 변경을 debounce로 저장
 */

import './components/registerBasics'; // side-effect import (별도 호출 불필요)
import { editorStore } from '../store/editStore';
import {
    loadProjectFromLocal,
    loadUiFromLocal,
    saveProjectToLocal,
    saveUiToLocal,
} from '../runtime/persistence';
import type { EditorState, Project } from '../core/types';

/** 가변 인자 제네릭 debounce (any 금지, DOM 타이머) */
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
    // 클라이언트에서만 동작
    if (typeof window === 'undefined') return;

    // 1) 로컬 복원
    const st = editorStore.getState();

    const p = loadProjectFromLocal();
    if (p) {
        editorStore.setState({ ...st, project: p });
    }

    const ui = loadUiFromLocal();
    if (ui) {
        editorStore.setState((prev) => ({
            ...prev,
            ui: { ...prev.ui, ...ui },
        }));
    }

    // 2) 변경 감지 → debounce 저장
    let prevProjectJson = JSON.stringify(editorStore.getState().project);
    let prevUiJson = JSON.stringify(editorStore.getState().ui);

    editorStore.subscribe((next /*, _prev */) => {
        // 프로젝트 저장
        const pj = JSON.stringify(next.project);
        if (pj !== prevProjectJson) {
            prevProjectJson = pj;
            saveProjectDebounced(next.project);
        }

        // UI 저장
        const uj = JSON.stringify(next.ui);
        if (uj !== prevUiJson) {
            prevUiJson = uj;
            saveUiDebounced(next.ui);
        }
    });
}