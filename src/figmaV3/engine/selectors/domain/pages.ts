'use client';

import { EditorEngine } from '../../EditorEngine';

type State = ReturnType<typeof EditorEngine.getState>;

export type PageLite = { id: string; name?: string; rootId: string };

/**
 * 현재 활성 페이지 id
 * 규칙: project.rootId 와 동일한 rootId 를 갖는 Page
 */
export function selectCurrentPageIdFrom(s: State): string | null {
    const rootId = (s as any)?.project?.rootId;
    const pages: PageLite[] = (s as any)?.project?.pages ?? [];
    const page = pages.find(p => p.rootId === rootId);
    return page ? page.id : null;
}

export function selectPagesFrom(s: State): PageLite[] {
    return ((s as any)?.project?.pages ?? []) as PageLite[];
}

export function selectCurrentPageFrom(s: State): PageLite | null {
    const id = selectCurrentPageIdFrom(s);
    const pages = selectPagesFrom(s);
    return id ? (pages.find(p => p.id === id) ?? null) : null;
}