'use client';

import { useMemo } from 'react';
import { EditorEngine } from '../../engine/EditorEngine';
import type { Page } from '../../core/types';

/**
 * 기준 컨벤션:
 *   const { reader, writer } = usePagesController();
 *   const R = reader();    // 함수 호출
 *   const W = writer();    // 함수 호출
 *
 * Facade( usePagesFacadeController )가 기대하는 계약을 100% 충족:
 *   - Reader: list(), currentPageId(), token()
 *   - Writer: setSelected(), add()->string, duplicate()->string|null,
 *             rename(), updateMeta(), remove()
 *
 * 동시에, 기존 다른 호출자 호환을 위해 alias 유지:
 *   - Reader alias: usePages(), useCurrentPageId(), useCurrentPage(),
 *                   getPages(), getCurrentPageId(), getCurrentPage(), pagesToken()
 *   - Writer alias: setCurrentById(), setSelectedPageId(), addPage(), renamePage(),
 *                   duplicatePage(), removePage(), movePage(), reorderPage()
 */

type State = ReturnType<typeof EditorEngine.getState>;

type PageLite = Pick<Page, 'id' | 'name' | 'rootId'> & Partial<Page>;

function getPagesSnapshot(s: State): ReadonlyArray<PageLite> {
    return ((s as any)?.project?.pages ?? []) as PageLite[];
}
function getCurrentPageIdSnapshot(s: State): string | null {
    const pages = getPagesSnapshot(s);
    const rootId = (s as any)?.project?.rootId as string | undefined;
    if (!rootId) return null;
    const p = pages.find(pg => pg.rootId === rootId);
    return p ? p.id : null;
}
function getCurrentPageSnapshot(s: State): PageLite | null {
    const id = getCurrentPageIdSnapshot(s);
    const pages = getPagesSnapshot(s);
    return id ? (pages.find(p => p.id === id) ?? null) : null;
}

export interface PagesReader {
    // Facade 계약
    list(): ReadonlyArray<PageLite>;
    currentPageId(): string | null;
    token(): string;

    // 호환 alias
    usePages(): ReadonlyArray<PageLite>;
    useCurrentPageId(): string | null;
    useCurrentPage(): PageLite | null;
    getPages(): ReadonlyArray<PageLite>;
    getCurrentPageId(): string | null;
    getCurrentPage(): PageLite | null;
    pagesToken(): string;
}

export interface PagesWriter {
    // Facade 계약
    setSelected(id: string): void;
    add(title?: string): string;
    duplicate(id: string): string | null;
    rename(id: string, title: string): void;
    updateMeta(id: string, patch: Partial<Page>): void;
    remove(id: string): void;

    // 호환 alias
    setCurrentById(pageId: string): void;
    setSelectedPageId(pageId: string): void;
    addPage(name?: string): string;
    renamePage(pageId: string, name: string): void;
    duplicatePage(pageId: string): string | null;
    removePage(pageId: string): void;
    movePage(fromIndex: number, toIndex: number): void;
    reorderPage(pageId: string, toIndex: number): void;
}

function buildReader(): PagesReader {
    return {
        // Facade 계약
        list() {
            return getPagesSnapshot(EditorEngine.getState());
        },
        currentPageId() {
            return getCurrentPageIdSnapshot(EditorEngine.getState());
        },
        token() {
            const st: any = EditorEngine.getState();
            const rootId = String(st?.project?.rootId ?? '');
            const len = String((st?.project?.pages ?? []).length);
            const ver = String(st?.__version__ ?? '');
            return `${rootId}|${len}|${ver}`;
        },

        // React 훅 기반 정밀 구독이 필요하다면 Facade에서 token을 deps로 사용
        // 여기서는 순수 임퍼러티브 Reader만 유지

        // 호환 alias
        usePages() {
            return this.list();
        },
        useCurrentPageId() {
            return this.currentPageId();
        },
        useCurrentPage() {
            return getCurrentPageSnapshot(EditorEngine.getState());
        },
        getPages() {
            return this.list();
        },
        getCurrentPageId() {
            return this.currentPageId();
        },
        getCurrentPage() {
            return getCurrentPageSnapshot(EditorEngine.getState());
        },
        pagesToken() {
            return this.token();
        },
    };
}

function buildWriter(): PagesWriter {
    return {
        // Facade 계약
        setSelected(id: string) {
            const eng: any = EditorEngine as any;
            if (eng?.pages?.setSelectedPageId) {
                eng.pages.setSelectedPageId(id);
                return;
            }
            // 호환: project.rootId를 대상 페이지 rootId로 전환
            EditorEngine.update((draft: any) => {
                const pages: PageLite[] = draft.project?.pages ?? [];
                const tgt = pages.find(p => p.id === id);
                if (tgt?.rootId) draft.project.rootId = tgt.rootId;
            }, true);
        },

        add(title?: string) {
            const eng: any = EditorEngine as any;
            if (eng?.pages?.addPage) {
                const newId = eng.pages.addPage(title);
                // 엔진이 id를 반환하지 않으면 아래 호환 경로로 추적
                if (newId) return newId;
            }
            let createdId = '';
            EditorEngine.update((draft: any) => {
                const id = genId('page');
                const rootId = genId('node');
                draft.project.pages = draft.project.pages ?? [];
                draft.project.nodes = draft.project.nodes ?? {};
                draft.project.pages.push({ id, name: title ?? 'New Page', rootId });
                draft.project.nodes[rootId] = { id: rootId, name: title ?? 'Root', children: [] };
                draft.project.rootId = rootId;
                createdId = id;
            }, true);
            return createdId;
        },

        duplicate(id: string) {
            const eng: any = EditorEngine as any;
            if (eng?.pages?.duplicatePage) {
                return eng.pages.duplicatePage(id) ?? null;
            }
            let newPageId: string | null = null;
            EditorEngine.update((draft: any) => {
                const pages: PageLite[] = draft.project?.pages ?? [];
                const nodes: Record<string, any> = draft.project?.nodes ?? {};
                const src = pages.find(p => p.id === id);
                if (!src) return;
                const newRoot = cloneSubtree(nodes, src.rootId);
                newPageId = genId('page');
                const newName = (src.name ?? 'Page') + ' Copy';
                pages.push({ id: newPageId, name: newName, rootId: newRoot });
                draft.project.rootId = newRoot;
            }, true);
            return newPageId;
        },

        rename(id: string, title: string) {
            const eng: any = EditorEngine as any;
            if (eng?.pages?.renamePage) {
                eng.pages.renamePage(id, title);
                return;
            }
            EditorEngine.update((draft: any) => {
                const pages: PageLite[] = draft.project?.pages ?? [];
                const p = pages.find(pg => pg.id === id);
                if (p) p.name = title;
            }, true);
        },

        updateMeta(id: string, patch: Partial<Page>) {
            EditorEngine.update((draft: any) => {
                const pages: PageLite[] = draft.project?.pages ?? [];
                const p = pages.find(pg => pg.id === id);
                if (!p) return;
                // 안전 병합: 허용 필드만 갱신
                if (typeof patch.description !== 'undefined') (p as any).description = patch.description;
                if (typeof patch.slug !== 'undefined')       (p as any).slug = patch.slug;
            }, true);
        },

        remove(id: string) {
            const eng: any = EditorEngine as any;
            if (eng?.pages?.removePage) {
                eng.pages.removePage(id);
                return;
            }
            EditorEngine.update((draft: any) => {
                const pages: PageLite[] = draft.project?.pages ?? [];
                const idx = pages.findIndex(p => p.id === id);
                if (idx < 0) return;
                const [removed] = pages.splice(idx, 1);
                if (removed?.rootId) {
                    const nodes: Record<string, any> = draft.project?.nodes ?? {};
                    removeCascade(nodes, removed.rootId);
                    if (draft.project.rootId === removed.rootId) {
                        draft.project.rootId = pages[0]?.rootId ?? null;
                    }
                }
            }, true);
        },

        // ---- 호환 alias ----
        setCurrentById(pageId: string) { this.setSelected(pageId); },
        setSelectedPageId(pageId: string) { this.setSelected(pageId); },
        addPage(name?: string) { return this.add(name); },
        renamePage(pageId: string, name: string) { this.rename(pageId, name); },
        duplicatePage(pageId: string) { return this.duplicate(pageId); },
        removePage(pageId: string) { this.remove(pageId); },

        movePage(fromIndex: number, toIndex: number) {
            const eng: any = EditorEngine as any;
            if (eng?.pages?.movePage) {
                eng.pages.movePage(fromIndex, toIndex);
                return;
            }
            EditorEngine.update((draft: any) => {
                const pages: PageLite[] = draft.project?.pages ?? [];
                if (fromIndex < 0 || fromIndex >= pages.length) return;
                const [pg] = pages.splice(fromIndex, 1);
                const idx = Math.max(0, Math.min(toIndex, pages.length));
                pages.splice(idx, 0, pg);
            }, true);
        },

        reorderPage(pageId: string, toIndex: number) {
            const eng: any = EditorEngine as any;
            if (eng?.pages?.reorderPage) {
                eng.pages.reorderPage(pageId, toIndex);
                return;
            }
            EditorEngine.update((draft: any) => {
                const pages: PageLite[] = draft.project?.pages ?? [];
                const from = pages.findIndex(p => p.id === pageId);
                if (from < 0) return;
                const [pg] = pages.splice(from, 1);
                const idx = Math.max(0, Math.min(toIndex, pages.length));
                pages.splice(idx, 0, pg);
            }, true);
        },
    };
}

export function usePagesController() {
    const R = useMemo(() => buildReader(), []);
    const W = useMemo(() => buildWriter(), []);
    return useMemo(() => ({ reader: () => R, writer: () => W }), [R, W]);
}

/* ---------------------------- utilities ---------------------------- */

function genId(prefix: string) {
    return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}
function cloneSubtree(nodes: Record<string, any>, rootId: string): string {
    function clone(id: string): string {
        const nid = `${id}_${Math.random().toString(36).slice(2, 6)}`;
        const src = nodes[id] ?? { id, children: [] };
        const kids = (src.children ?? []).map((k: string) => clone(k));
        nodes[nid] = { ...src, id: nid, children: kids };
        return nid;
    }
    return clone(rootId);
}
function removeCascade(nodes: Record<string, any>, rootId: string) {
    const toDelete: string[] = [];
    (function collect(id: string) {
        toDelete.push(id);
        for (const k of nodes[id]?.children ?? []) collect(k);
    })(rootId);
    for (const id of toDelete) delete nodes[id];
}