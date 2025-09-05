'use client';

import * as React from 'react';
import { useEngine } from '../engine/EditorEngine';
import type { Page } from '../core/types';

function genId(prefix = 'pg_'): string {
    return prefix + Math.random().toString(36).slice(2, 10);
}

export interface PagesReader {
    /** 페이지 목록 조회 (읽기 전용) */
    list(): ReadonlyArray<Page>;
    /** 현재 선택된 페이지 id (없으면 null) */
    getCurrentPageId(): string | null;
    /** id로 페이지 조회 (없으면 null) */
    getById(id: string): Page | null;
    /** 의존성 토큰: 페이지 컬렉션 변경 감지용 */
    pagesToken(): unknown;
}

export interface PagesWriter {
    /** 현재 페이지 설정(선택) */
    setCurrentPage(id: string): void;

    /** 페이지 생성 → id 반환 */
    addPage(title: string): string;
    /** 페이지 이름 변경 */
    renamePage(id: string, title: string): void;
    /** 페이지 삭제 */
    removePage(id: string): void;
    /** 페이지 복제 → 새 id (없으면 null) */
    duplicatePage(id: string): string | null;
    /** 페이지 메타 갱신(name 등) */
    updatePageMeta(id: string, patch: { name?: string } & Record<string, unknown>): void;
}

export interface PagesController {
    reader(): PagesReader;
    writer(): PagesWriter;
}

export function usePagesController(): PagesController {
    const eng = useEngine();

    // ---------- Reader ----------
    const reader = React.useMemo<PagesReader>(() => ({
        list() {
            const raw = (eng.project as any)?.pages ?? [];
            // Page 타입 정규화(누락 필드 guard)
            return raw.map((p: any) => ({
                id: String(p.id),
                name: typeof p.name === 'string' ? p.name : '',
                rootId: p.rootId,
            })) as Page[];
        },
        getCurrentPageId() {
            const cur = (eng.ui as any)?.panels?.left?.lastActivePageId;
            return (typeof cur === 'string' && cur.length > 0) ? cur : null;
        },
        getById(id: string) {
            const pages = this.list();
            return pages.find(p => p.id === id) ?? null;
        },
        pagesToken(): unknown {
            return (eng.project as any)?.pages;
        },
    }), [eng.project, eng.ui]);

    // ---------- Writer ----------
    const writer = React.useMemo<PagesWriter>(() => {
        const api: PagesWriter = {
            setCurrentPage(id: string) {
                // 존재 확인
                const exists = reader.getById(id);
                if (!exists) return;

                eng.update((s: any) => {
                    (s.ui ??= {});
                    (s.ui.panels ??= {});
                    (s.ui.panels.left ??= {});
                    s.ui.panels.left.lastActivePageId = id;

                    // 보조 포커스: 해당 페이지 root 선택
                    const pg = (s.project?.pages ?? []).find((p: any) => p.id === id);
                    const rootId = pg?.rootId ?? s.project?.rootId ?? null;
                    (s.ui as any).selectedId = rootId ?? (s.ui as any).selectedId;
                }, true);
            },

            addPage(title: string): string {
                const id = genId();
                eng.update((s: any) => {
                    (s.project ??= {});
                    (s.project.pages ??= []);
                    const rootId = s.project.rootId ?? null;
                    s.project.pages = [
                        ...s.project.pages,
                        { id, name: title, rootId },
                    ];

                    (s.ui ??= {});
                    (s.ui.panels ??= {});
                    (s.ui.panels.left ??= {});
                    s.ui.panels.left.lastActivePageId = id;
                    (s.ui as any).selectedId = rootId ?? (s.ui as any).selectedId;
                }, true);
                eng.notify?.(`페이지 "${title}"가 추가되었습니다.`);
                return id;
            },

            renamePage(id: string, title: string) {
                eng.update((s: any) => {
                    const pg = (s.project?.pages ?? []).find((p: any) => p.id === id);
                    if (pg) pg.name = title;
                }, true);
            },

            removePage(id: string) {
                eng.update((s: any) => {
                    const pages: any[] = s.project?.pages ?? [];
                    const next = pages.filter((p: any) => p.id !== id);
                    (s.project ??= {});
                    s.project.pages = next;

                    // 현재 페이지였다면 첫 페이지로 포커스 이동
                    const cur = s.ui?.panels?.left?.lastActivePageId;
                    if (cur === id) {
                        const nextId = next[0]?.id ?? null;
                        (s.ui ??= {});
                        (s.ui.panels ??= {});
                        (s.ui.panels.left ??= {});
                        s.ui.panels.left.lastActivePageId = nextId;

                        if (nextId) {
                            const rootId = next.find((p: any) => p.id === nextId)?.rootId
                                ?? s.project.rootId ?? null;
                            (s.ui as any).selectedId = rootId ?? (s.ui as any).selectedId;
                        }
                    }
                }, true);
            },

            duplicatePage(id: string): string | null {
                const src = reader.getById(id);
                if (!src) return null;

                const title = src.name ? `Copy of ${src.name}` : 'Copy';
                const newId = genId();
                eng.update((s: any) => {
                    (s.project ??= {});
                    (s.project.pages ??= []);
                    s.project.pages = [
                        ...s.project.pages,
                        {
                            id: newId,
                            name: title,
                            rootId: src.rootId ?? s.project.rootId ?? null,
                        },
                    ];
                    (s.ui ??= {});
                    (s.ui.panels ??= {});
                    (s.ui.panels.left ??= {});
                    s.ui.panels.left.lastActivePageId = newId;
                    (s.ui as any).selectedId = src.rootId ?? s.project.rootId ?? (s.ui as any).selectedId;
                }, true);

                eng.notify?.('페이지가 복제되었습니다.');
                return newId;
            },

            updatePageMeta(id: string, patch: { name?: string } & Record<string, unknown>) {
                eng.update((s: any) => {
                    const pg = (s.project?.pages ?? []).find((p: any) => p.id === id);
                    if (!pg) return;
                    if (typeof patch?.name === 'string') pg.name = patch.name;
                }, true);
            },
        };
        return api;
    }, [eng, reader]);

    return React.useMemo(() => ({ reader: () => reader, writer: () => writer }), [reader, writer]);
}