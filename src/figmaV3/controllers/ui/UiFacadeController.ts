'use client';

import { useMemo } from 'react';
import { EditorEngine } from '@/figmaV3/engine/EditorEngine';

/**
 * LeftSidebar 등 UI 전용 상태 파사드 컨트롤러
 * - View는 본 컨트롤러의 reader()/writer()만 의존
 * - Engine 파사드 우선, 부재 시 update()로 호환 처리
 *
 * 관리 대상(최소셋):
 *   - activeTab: 좌측 패널 활성 탭 (기본 'Layers')
 *   - leftSidebarOpen: 좌측 패널 열림 상태
 *   - leftSidebarWidth: 좌측 패널 너비(px)
 */

export type LeftTabName =
    | 'Layers'
    | 'Pages'
    | 'Palette'
    | 'Assets'
    | 'Components'
    | 'Templates'
    | 'Stylesheets';

export interface UiReader {
    activeTab(): LeftTabName;
    isLeftOpen(): boolean;
    leftWidth(): number;
    token(): string; // 경량 리렌더 토큰
}

export interface UiWriter {
    setActiveTab(tab: LeftTabName): void;
    toggleLeft(): void;
    setLeftOpen(open: boolean): void;
    setLeftWidth(width: number): void;
}

export interface UiFacadeController {
    reader(): UiReader;
    writer(): UiWriter;
}

const DEFAULT_TAB: LeftTabName = 'Layers';
const DEFAULT_WIDTH = 280;

export function useUiFacadeController(): UiFacadeController {
    const reader = useMemo<UiReader>(() => {
        return {
            activeTab() {
                const s = EditorEngine.getState() as any;
                const tab = (s.ui?.leftSidebarTab as LeftTabName | undefined) ?? DEFAULT_TAB;
                return tab;
            },
            isLeftOpen() {
                const s = EditorEngine.getState() as any;
                const v = (s.ui?.leftSidebarOpen as boolean | undefined);
                return typeof v === 'boolean' ? v : true;
            },
            leftWidth() {
                const s = EditorEngine.getState() as any;
                const w = (s.ui?.leftSidebarWidth as number | undefined);
                return typeof w === 'number' && w > 0 ? w : DEFAULT_WIDTH;
            },
            token() {
                const s = EditorEngine.getState() as any;
                const t = String(s.ui?.leftSidebarTab ?? '');
                const o = String(s.ui?.leftSidebarOpen ?? '');
                const w = String(s.ui?.leftSidebarWidth ?? '');
                const ver = String(s.__version__ ?? '');
                return `${t}|${o}|${w}|${ver}`;
            },
        };
    }, []);

    const writer = useMemo<UiWriter>(() => {
        return {
            setActiveTab(tab: LeftTabName) {
                const eng: any = EditorEngine as any;
                if (eng?.ui?.setLeftSidebarTab) {
                    eng.ui.setLeftSidebarTab(tab);
                    return;
                }
                EditorEngine.update((draft: any) => {
                    draft.ui = draft.ui ?? {};
                    draft.ui.leftSidebarTab = tab;
                }, true);
            },
            toggleLeft() {
                const s = EditorEngine.getState() as any;
                const prev = (s.ui?.leftSidebarOpen as boolean | undefined);
                const next = !(typeof prev === 'boolean' ? prev : true);
                this.setLeftOpen(next);
            },
            setLeftOpen(open: boolean) {
                const eng: any = EditorEngine as any;
                if (eng?.ui?.setLeftSidebarOpen) {
                    eng.ui.setLeftSidebarOpen(open);
                    return;
                }
                EditorEngine.update((draft: any) => {
                    draft.ui = draft.ui ?? {};
                    draft.ui.leftSidebarOpen = !!open;
                }, true);
            },
            setLeftWidth(width: number) {
                const w = Math.max(200, Math.min(640, Math.floor(width)));
                const eng: any = EditorEngine as any;
                if (eng?.ui?.setLeftSidebarWidth) {
                    eng.ui.setLeftSidebarWidth(w);
                    return;
                }
                EditorEngine.update((draft: any) => {
                    draft.ui = draft.ui ?? {};
                    draft.ui.leftSidebarWidth = w;
                }, true);
            },
        };
    }, []);

    return useMemo(() => ({ reader: () => reader, writer: () => writer }), [reader, writer]);
}