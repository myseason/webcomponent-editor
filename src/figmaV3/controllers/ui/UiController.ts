'use client';

import { useMemo } from 'react';
import { EditorEngine } from '../../engine/EditorEngine';

export interface UiReader {
    /** 'Page' | 'Component' | ... */
    mode(): string | undefined;
    /** 현재 선택된 NodeId */
    selectedId(): string | null;
    /** 컴포넌트 편집 중인 fragment id */
    editingFragmentId(): string | null;
    /** (옵션) 좌패널 탭 등 UI 허브 탭 값 */
    hubTab(): string | undefined;
    /** deps token: UI 변경을 View에서 안정적으로 추적 */
    token(): string;
}

export interface UiWriter {
    setSelected(id: string | null): void;
    setMode(mode: string): void;
    setNotification(message: string): void;
    setHubTab(tab: string): void;
}

export interface UiController {
    reader(): UiReader;
    writer(): UiWriter;
}

function buildReader(): UiReader {
    return {
        mode() {
            return EditorEngine.ui.getEditorMode() as any;
        },
        selectedId() {
            return EditorEngine.nodes.getSelectedNodeId();
        },
        editingFragmentId() {
            // v1.3.1: 편집 중 fragment id는 파사드에 직접 노출되어 있지 않으므로 state에서 안전 조회
            return (EditorEngine.getState().ui as any)?.editingFragmentId ?? null;
        },
        hubTab() {
            return EditorEngine.ui.getActiveHubTab() as any;
        },
        token() {
            const ui: any = EditorEngine.getState().ui ?? {};
            return [
                String(ui.mode ?? ''),
                String(ui.selectedId ?? ''),
                String(ui.editingFragmentId ?? ''),
                // 좌패널 hubTab 경로는 파사드의 getActiveHubTab()으로 대응
                String(EditorEngine.ui.getActiveHubTab() ?? ''),
            ].join('::');
        },
    };
}

function buildWriter(): UiWriter {
    return {
        setSelected(id) {
            EditorEngine.nodes.setSelectedNodeId(id as any);
        },
        setMode(mode) {
            EditorEngine.ui.setEditorMode(mode as any);
        },
        setNotification(message) {
            EditorEngine.ui.setNotification(message);
        },
        setHubTab(tab) {
            EditorEngine.ui.setActiveHubTab(tab as any);
        },
    };
}

export function useUiController(): UiController {
    const reader = useMemo(() => buildReader(), []);
    const writer = useMemo(() => buildWriter(), []);
    return useMemo(() => ({ reader: () => reader, writer: () => writer }), [reader, writer]);
}