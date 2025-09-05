'use client';

import * as React from 'react';
import { useEngine } from '../engine/Engine';
// core/types.ts에는 PageId 타입이 없습니다. (TS2724 fix)
type PageId = string;

export interface PagesReader {
    list(): Array<{ id: PageId; title: string }>;
    current(): PageId | null;
}
export interface PagesWriter {
    selectPage(id: PageId): void;
    addPage(title: string): PageId;
    renamePage(id: PageId, title: string): void;
    removePage(id: PageId): void;
}
export interface PagesController {
    reader(): PagesReader;
    writer(): PagesWriter;
}

export function usePagesController(): PagesController {
    const eng = useEngine();

    const reader = React.useMemo<PagesReader>(() => ({
        list() {
            const pages = (eng.project as any)?.pages ?? [];
            return pages.map((p: any) => ({ id: p.id as PageId, title: String(p.name ?? '') }));
        },
        current() {
            return (eng.ui as any)?.panels?.left?.lastActivePageId
                ?? ((eng.project as any)?.pages?.[0]?.id ?? null);
        },
    }), [eng.project, eng.ui]);

    const writer = React.useMemo<PagesWriter>(() => ({
        selectPage(id) {
            eng.update((s: any) => {
                (s.ui as any).panels.left.lastActivePageId = id;
                const rootId = (s.project as any)?.pages?.find((p: any) => p.id === id)?.rootId;
                if (rootId) (s.ui as any).selectedId = rootId;
            });
        },
        addPage(title) {
            const id = ('pg_' + Math.random().toString(36).slice(2, 8)) as PageId;
            eng.update((s: any) => {
                (s.project as any).pages = [
                    ...(s.project?.pages ?? []),
                    { id, name: title, rootId: (s.project as any).rootId },
                ];
                (s.ui as any).panels.left.lastActivePageId = id;
                (s.ui as any).selectedId = (s.project as any).rootId;
            });
            eng.notify(`페이지 "${title}"가 추가되었습니다.`);
            return id;
        },
        renamePage(id, title) {
            eng.update((s: any) => {
                const p = (s.project as any).pages?.find((x: any) => x.id === id);
                if (p) p.name = title;
            });
        },
        removePage(id) {
            eng.update((s: any) => {
                (s.project as any).pages = (s.project?.pages ?? []).filter((p: any) => p.id !== id);
                const currentId = (s.ui as any).panels.left.lastActivePageId;
                if (currentId === id) {
                    const nextId = (s.project as any)?.pages?.[0]?.id ?? null;
                    (s.ui as any).panels.left.lastActivePageId = nextId;
                    if (nextId) {
                        (s.ui as any).selectedId =
                            (s.project as any)?.pages?.find((p: any) => p.id === nextId)?.rootId
                            ?? (s.ui as any).selectedId;
                    }
                }
            });
        },
    }), [eng]);

    return React.useMemo(() => ({ reader: () => reader, writer: () => writer }), [reader, writer]);
}