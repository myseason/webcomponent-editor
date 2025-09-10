import { StateCreator } from 'zustand';
import { EditorStoreState, PageSlice } from '../types';
import type { NodeId, Page, Node } from '../../core/types';

// --- SELECTORS ---
export const selectPages = (s: EditorStoreState) => s.project.pages;
export const selectCurrentRootId = (s: EditorStoreState) => s.project.rootId;
export const selectPageById = (id: string) => (s: EditorStoreState) => s.project.pages.find((p) => p.id === id);

// --- SLICE ---
export const createPageSlice: StateCreator<EditorStoreState, [], [], PageSlice> = (set, get) => ({
    _setPages: (pages) => get().update((s) => { s.project.pages = pages; }, true),
    _setRootId: (rootId) => get().update((s) => { s.project.rootId = rootId; }, false),

    _addPage: (page) => get().update((s) => {
        s.project.pages.push(page);
    }, true),

    _removePage: (pageId) => get().update((s) => {
        if (s.project.pages.length <= 1) return; // 마지막 페이지는 삭제 불가
        const page = s.project.pages.find((p) => p.id === pageId);
        if (!page) return;

        s.project.pages = s.project.pages.filter((p) => p.id !== pageId);

        if (s.project.rootId === page.rootId) {
            const first = s.project.pages[0];
            if (first) {
                s.project.rootId = first.rootId;
                s.ui.selectedId = first.rootId;
                s.ui.panels.left.lastActivePageId = first.id;
            }
        }
    }, true),

    _updatePageMeta: (pageId, patch) => get().update((s) => {
        s.project.pages = s.project.pages.map((p) => (p.id === pageId ? { ...p, ...patch } : p));
    }, true),

    _duplicatePageFromRoot: (sourceRootId, nextPage, clonedNodes) => get().update((s) => {
        s.project.nodes = { ...s.project.nodes, ...clonedNodes };
        s.project.pages.push(nextPage);
        // root 전환 여부는 도메인 계층에서 결정
    }, true),
});