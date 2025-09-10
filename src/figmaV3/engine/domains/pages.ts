// src/figmaV3/engine/domains/pages.ts
import type { Page } from '../../core/types';
import { EditorCore } from '../EditorCore';
import { genId, buildNodeWithDefaults, collectSubtreeIds, cloneSubtree } from '../../store/utils';

export function pagesDomain() {
    const R = {
        getPages: (): Page[] => EditorCore.getState().project.pages,
        getPageById: (id: string): Page | undefined => EditorCore.getState().project.pages.find(p => p.id === id),
        getCurrentPage: (): Page | null => {
            const s = EditorCore.getState();
            const rootId = s.project.rootId;
            return s.project.pages.find(p => p.rootId === rootId) ?? null;
        },
    };

    const W = {
        selectPage(pageId: string) {
            const st = EditorCore.store.getState();
            const page = R.getPageById(pageId);
            if (!page) return;
            st._setRootId(page.rootId);
            st._setSelectedId(page.rootId);
            st._setLastActivePageId(pageId);
        },

        addPage(name?: string): string {
            const st = EditorCore.store.getState();
            const pageId = genId('page');
            const rootId = genId('node');
            const newPage: Page = {
                id: pageId,
                name: name ?? `Page ${st.project.pages.length + 1}`,
                rootId,
            };
            const rootNode = buildNodeWithDefaults('box', rootId);

            st._setPages([...st.project.pages, newPage]);
            st._createNode(rootNode);

            W.selectPage(pageId);
            return pageId;
        },

        removePage(pageId: string) {
            const st = EditorCore.store.getState();
            if (st.project.pages.length <= 1) return;
            const page = R.getPageById(pageId);
            if (!page) return;

            st.update(s => {
                const ids = collectSubtreeIds(s.project.nodes, page.rootId);
                ids.forEach(id => delete s.project.nodes[id]);
                s.project.pages = s.project.pages.filter(p => p.id !== pageId);

                if (s.project.rootId === page.rootId) {
                    const first = s.project.pages[0];
                    if (first) {
                        s.project.rootId = first.rootId;
                        s.ui.selectedId = first.rootId;
                        s.ui.panels.left.lastActivePageId = first.id;
                    }
                }
            }, true);
        },

        duplicatePage(pageId: string): string | undefined {
            let newId: string | undefined;
            const st = EditorCore.store.getState();
            st.update(s => {
                const src = s.project.pages.find(p => p.id === pageId);
                if (!src) return;

                const { nodes: cloned, newRootId } = cloneSubtree(s.project.nodes, src.rootId);
                const next: Page = {
                    id: genId('page'),
                    name: `${src.name} Copy`,
                    rootId: newRootId,
                };
                newId = next.id;
                s.project.nodes = { ...s.project.nodes, ...cloned };
                s.project.pages.push(next);
            }, true);
            return newId;
        },

        updatePageMeta(pageId: string, patch: Partial<Page>) {
            const st = EditorCore.store.getState();
            const next = st.project.pages.map(p => (p.id === pageId ? { ...p, ...patch } : p));
            st._setPages(next);
        },
    };

    return { reader: R, writer: W } as const;
}