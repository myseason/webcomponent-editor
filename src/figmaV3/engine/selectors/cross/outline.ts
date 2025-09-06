'use client';

import { EditorEngine } from '../../EditorEngine';
import { selectCurrentPageIdFrom, selectPagesFrom } from '../domain/pages';
import { selectChildrenIdsFrom, selectNodeNameFrom } from '../domain/nodes';

type State = ReturnType<typeof EditorEngine.getState>;

export type OutlineItem = {
    id: string;
    name: string;
    children: OutlineItem[];
};

/**
 * 주어진 pageId의 rootId부터 노드 트리를 OutlineItem[]로 변환합니다.
 */
export function selectPageOutlineFrom(s: State, pageId: string | null): OutlineItem[] {
    if (!pageId) return [];
    const pages = selectPagesFrom(s);
    const page = pages.find(p => p.id === pageId);
    const rootId = page?.rootId;
    if (!rootId) return [];

    function build(id: string): OutlineItem {
        const name = selectNodeNameFrom(s, id);
        const childIds = selectChildrenIdsFrom(s, id);
        return {
            id,
            name,
            children: childIds.map(build),
        };
    }

    return [build(rootId)];
}

/**
 * 현재 활성 페이지의 outline
 */
export function selectCurrentPageOutlineFrom(s: State): OutlineItem[] {
    const currentId = selectCurrentPageIdFrom(s);
    return selectPageOutlineFrom(s, currentId);
}