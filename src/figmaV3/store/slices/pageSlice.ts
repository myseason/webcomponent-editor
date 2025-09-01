import { StateCreator } from 'zustand';
import { EditorStoreState } from '../types';
import { Page } from '../../core/types';
import { genId, buildNodeWithDefaults, collectSubtreeIds, cloneSubtree } from '../utils';

export interface PageSlice {
    selectPage: (pageId: string) => void;
    addPage: (name?: string) => string;
    removePage: (pageId: string) => void;
    duplicatePage: (pageId: string) => void;
}

export const createPageSlice: StateCreator<EditorStoreState, [], [], PageSlice> = (set, get, _api) => ({
    selectPage: (pageId) => get().update((s) => {
        const page = s.project.pages.find(p => p.id === pageId);
        if (!page) return;
        s.project.rootId = page.rootId;
        s.ui.selectedId = page.rootId;
        s.ui.panels.left.lastActivePageId = pageId;
    }, false),
    addPage: (name) => {
        const pageId = genId('page');
        const rootId = genId('node');
        get().update(s => {
            s.project.nodes[rootId] = buildNodeWithDefaults('box', rootId);
            s.project.pages = [...s.project.pages, { id: pageId, name: name ?? `Page ${s.project.pages.length + 1}`, rootId }];
        }, true);
        return pageId;
    },
    removePage: (pageId) => get().update(s => {
        const page = s.project.pages.find(p => p.id === pageId);
        if (!page || s.project.pages.length <= 1) return;
        const toDel = collectSubtreeIds(s.project.nodes, page.rootId);
        const nextNodes = { ...s.project.nodes };
        toDel.forEach(id => delete nextNodes[id]);
        s.project.nodes = nextNodes;
        s.project.pages = s.project.pages.filter(p => p.id !== pageId);
        if (s.project.rootId === page.rootId) {
            const firstPage = s.project.pages[0];
            if (firstPage) {
                s.project.rootId = firstPage.rootId;
                s.ui.selectedId = firstPage.rootId;
            }
        }
    }, true),
    duplicatePage: (pageId) => get().update(s => {
        const originalPage = s.project.pages.find(p => p.id === pageId);
        if (!originalPage) return;
        const { nodes: clonedNodes, newRootId } = cloneSubtree(s.project.nodes, originalPage.rootId);
        const newPage: Page = {
            id: genId('page'),
            name: `${originalPage.name} Copy`,
            description: originalPage.description,
            slug: originalPage.slug ? `${originalPage.slug}-copy` : undefined,
            rootId: newRootId,
        };
        s.project.nodes = { ...s.project.nodes, ...clonedNodes };
        s.project.pages.push(newPage);
    }, true),
});