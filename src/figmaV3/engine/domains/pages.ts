import type { Page, Node } from '../../core/types';
import { EditorCore } from '../EditorCore';
import { selectPages, selectPageById, selectCurrentRootId } from '../../store/slices/pageSlice';
import { buildNodeWithDefaults, genId, collectSubtreeIds, cloneSubtree } from '../../store/utils';

export function pagesDomain() {
    const R = {
        /** 모든 페이지 목록을 가져옵니다. */
        getPages: (): Page[] => selectPages(EditorCore.getState()),
        /** ID로 특정 페이지를 가져옵니다. */
        getPageById: (id: string): Page | undefined => selectPageById(id)(EditorCore.getState()),
        /** 현재 활성화된 페이지를 가져옵니다. */
        getCurrentPage: (): Page | null => {
            const state = EditorCore.getState();
            const rootId = selectCurrentRootId(state);
            return state.project.pages.find(p => p.rootId === rootId) ?? null;
        },
    };

    const W = {
        /** 특정 페이지를 활성화합니다. */
        selectPage(pageId: string) {
            const state = EditorCore.store.getState();
            const page = R.getPageById(pageId);
            if (!page) return;

            // 여러 slice setter들을 조합하여 유스케이스 실행
            state._setRootId(page.rootId);
            state._setSelectedId(page.rootId);
            state._setLastActivePageId(pageId);
        },

        /** 새 페이지를 추가하고 해당 페이지로 전환합니다. */
        addPage(name?: string): string {
            const state = EditorCore.store.getState();
            const pageId = genId('page');
            const rootId = genId('node');

            const newPage: Page = { id: pageId, name: name ?? `Page ${state.project.pages.length + 1}`, rootId };
            const rootNode = buildNodeWithDefaults('box', rootId);

            // 여러 slice setter들을 조합
            state._setPages([...state.project.pages, newPage]);
            state._patchNode(rootId, rootNode); // patchNode를 사용하여 추가
            W.selectPage(pageId); // 방금 만든 페이지로 전환

            return pageId;
        },

        /** 페이지와 관련된 모든 노드를 삭제합니다. */
        removePage(pageId: string) {
            const state = EditorCore.store.getState();
            if (state.project.pages.length <= 1) return; // 마지막 페이지는 삭제 불가

            const pageToRemove = R.getPageById(pageId);
            if (!pageToRemove) return;

            // 여러 상태를 하나의 트랜잭션으로 변경
            state.update(s => {
                const idsToDelete = collectSubtreeIds(s.project.nodes, pageToRemove.rootId);
                idsToDelete.forEach(id => delete s.project.nodes[id]);

                s.project.pages = s.project.pages.filter(p => p.id !== pageId);

                if (s.project.rootId === pageToRemove.rootId) {
                    const firstPage = s.project.pages[0];
                    if (firstPage) {
                        s.project.rootId = firstPage.rootId;
                        s.ui.selectedId = firstPage.rootId;
                        s.ui.panels.left.lastActivePageId = firstPage.id;
                    }
                }
            }, true);
        },

        /** 페이지와 관련 노드 트리를 복제합니다. */
        duplicatePage(pageId: string): string | undefined {
            let newPageId: string | undefined;
            const state = EditorCore.store.getState();

            state.update(s => {
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
                newPageId = newPage.id;

                s.project.nodes = { ...s.project.nodes, ...clonedNodes };
                s.project.pages.push(newPage);
            }, true);
            return newPageId;
        },

        /** 페이지의 메타데이터(이름, 설명 등)를 업데이트합니다. */
        updatePageMeta(pageId: string, patch: Partial<Omit<Page, 'id' | 'rootId'>>) {
            const state = EditorCore.store.getState();
            const newPages = state.project.pages.map(p =>
                p.id === pageId ? { ...p, ...patch } : p
            );
            state._setPages(newPages);
        }
    };

    return { reader: R, writer: W } as const;
}