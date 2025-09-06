'use client';

import { useMemo } from 'react';
import { EditorEngine } from '@/figmaV3/engine/EditorEngine';
import type { Stylesheet } from '@/figmaV3/core/types';

/**
 * Project Stylesheets 전용 Facade 컨트롤러
 * - View는 본 컨트롤러의 reader()/writer()만 의존
 * - EditorEngine 파사드 우선, 부재 기능은 update 호환 경로로 안전 처리
 */

export interface StylesheetsReader {
    sheets(): ReadonlyArray<Stylesheet>;
    token(): string; // 경량 리렌더 토큰
}

export interface StylesheetsWriter {
    addUrl(name: string, url: string): void;
    addInline(name: string, content: string): void;
    toggleEnabled(id: string): void;
    remove(id: string): void;
}

export interface StylesheetsFacadeController {
    reader(): StylesheetsReader;
    writer(): StylesheetsWriter;
}

export function useStylesheetsFacadeController(): StylesheetsFacadeController {
    const reader = useMemo<StylesheetsReader>(() => {
        return {
            sheets() {
                const s = EditorEngine.getState() as any;
                return (s.project?.stylesheets ?? []) as Stylesheet[];
            },
            token() {
                const s = EditorEngine.getState() as any;
                const len = (s.project?.stylesheets ?? []).length;
                const ver = String(s.__version__ ?? '');
                return `${len}|${ver}`;
            },
        };
    }, []);

    const writer = useMemo<StylesheetsWriter>(() => {
        const genId = (prefix: string): string => `${prefix}_${Date.now().toString(36)}`;

        return {
            addUrl(name: string, url: string) {
                if (!url.trim()) return;
                EditorEngine.update((draft: any) => {
                    const newSheet: Stylesheet = {
                        id: genId('sheet'),
                        name: name.trim() || 'External CSS',
                        source: 'url',
                        url: url.trim(),
                        enabled: true,
                    } as any;
                    draft.project.stylesheets = [...(draft.project.stylesheets ?? []), newSheet];
                }, true);
            },

            addInline(name: string, content: string) {
                if (!content.trim()) return;
                EditorEngine.update((draft: any) => {
                    const newSheet: Stylesheet = {
                        id: genId('sheet'),
                        name: name.trim() || 'Inline CSS',
                        source: 'inline',
                        content,
                        enabled: true,
                    } as any;
                    draft.project.stylesheets = [...(draft.project.stylesheets ?? []), newSheet];
                }, true);
            },

            toggleEnabled(id: string) {
                EditorEngine.update((draft: any) => {
                    draft.project.stylesheets = (draft.project.stylesheets ?? []).map((ss: Stylesheet) =>
                        ss.id === id ? ({ ...ss, enabled: !ss.enabled } as Stylesheet) : ss
                    );
                }, true);
            },

            remove(id: string) {
                EditorEngine.update((draft: any) => {
                    draft.project.stylesheets = (draft.project.stylesheets ?? []).filter(
                        (ss: Stylesheet) => ss.id !== id
                    );
                }, true);
            },
        };
    }, []);

    return useMemo(() => ({ reader: () => reader, writer: () => writer }), [reader, writer]);
}