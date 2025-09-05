'use client';

import { useMemo } from 'react';
import { useEngine } from '../adapters/useEngine';
import type { EditorEngine } from '../../engine/EditorEngine';

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

function buildReader(engine: EditorEngine): UiReader {
    return {
        mode() {
            return engine.getUI()?.mode;
        },
        selectedId() {
            return engine.getUI()?.selectedId ?? null;
        },
        editingFragmentId() {
            return engine.getUI()?.editingFragmentId ?? null;
        },
        hubTab() {
            // 프로젝트별로 명칭이 다를 수 있으므로 안전 접근
            return engine.getUI()?.hubTab;
        },
        token() {
            const ui = engine.getUI() ?? {};
            // 의존 필드들을 문자열로 묶어서 View의 deps로 사용
            return [
                String(ui.mode ?? ''),
                String(ui.selectedId ?? ''),
                String(ui.editingFragmentId ?? ''),
                String(ui.hubTab ?? ''),
            ].join('::');
        },
    };
}

function buildWriter(engine: EditorEngine): UiWriter {
    return {
        setSelected(id) {
            engine.select(id as any);
        },
        setMode(mode) {
            // v1.3.1 uiSlice에 setMode가 없다면, update 캡슐화로 반영
            const ui = engine.getUI();
            if (typeof (engine as any).setMode === 'function') {
                (engine as any).setMode(mode);
            } else if (typeof (engine as any)['state']?.update === 'function') {
                // EditorEngine에 노출된 update를 통해 안전하게 반영
                (engine as any)['state'].update((draft: any) => {
                    if (draft?.ui) draft.ui.mode = mode;
                });
            }
        },
        setNotification(message) {
            engine.setNotification(message);
        },
        setHubTab(tab) {
            // v1.3.1에 전용 API 없을 가능성 → update 캡슐화
            if (typeof (engine as any)['state']?.update === 'function') {
                (engine as any)['state'].update((draft: any) => {
                    if (draft?.ui) draft.ui.hubTab = tab;
                });
            }
        },
    };
}

export function useUiController(): UiController {
    const engine = useEngine();
    const reader = useMemo(() => buildReader(engine), [engine]);
    const writer = useMemo(() => buildWriter(engine), [engine]);
    return useMemo(() => ({ reader: () => reader, writer: () => writer }), [reader, writer]);
}