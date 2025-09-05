'use client';

import * as React from 'react';
import { useEngine } from '../engine/EditorEngine';

export type UIMode = 'view' | 'edit' | 'design' | string;

export interface UiReader {
    /** 현재 UI 모드 조회 */
    getMode(): UIMode;
    /** 전문가 모드(예시) */
    isExpertMode(): boolean;
}

export interface UiWriter {
    /** UI 모드 변경 */
    setMode(mode: UIMode): void;
    /** 알림 노출(엔진 위임) */
    notify(msg: string): void;
}

export interface UiController {
    reader(): UiReader;
    writer(): UiWriter;
}

export function useUiController(): UiController {
    const eng = useEngine();

    const reader = React.useMemo<UiReader>(() => ({
        getMode(): UIMode {
            const m = (eng.ui as any)?.mode;
            return (typeof m === 'string' && m.length > 0) ? m : 'view';
        },
        isExpertMode(): boolean {
            const x = (eng.ui as any)?.expertMode;
            return !!x;
        },
    }), [eng.ui]);

    const writer = React.useMemo<UiWriter>(() => ({
        setMode(mode: UIMode) {
            eng.update((s: any) => {
                (s.ui ??= {});
                s.ui.mode = mode;
            }, true);
        },
        notify(msg: string) {
            eng.notify?.(msg);
        },
    }), [eng]);

    return React.useMemo(() => ({ reader: () => reader, writer: () => writer }), [reader, writer]);
}