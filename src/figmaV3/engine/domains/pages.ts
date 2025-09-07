'use client';
import type { Page } from '../../core/types';
import { EditorEngineCore } from '../EditorEngineCore';

export function pagesDomain() {
    const R = {
        getPages(): Page[] { return EditorEngineCore.getState().project?.pages ?? []; },
        getCurrentPage(): Page | null {
            const ui = EditorEngineCore.getState().ui;
            const id = ui?.panels?.left?.lastActivePageId ?? null;
            return (EditorEngineCore.getState().project?.pages ?? []).find(p => p.id === id) ?? null;
        },
    };
    const W = {
        setCurrentPage(pageId: string) {
            const s = EditorEngineCore.getState() as any;
            if (s.selectPage) return s.selectPage(pageId);
            const ui = EditorEngineCore.getState().ui;
            EditorEngineCore.updatePatch(({ patchUI }) => {
                patchUI({ panels: { ...ui.panels, left: { ...ui.panels.left, lastActivePageId: pageId } } } as any);
            });
        },
        addPage(name?: string) {
            const s = EditorEngineCore.getState() as any;
            if (s.addPage) return s.addPage(name);
            EditorEngineCore.updatePatch(({ get, patchProject }) => {
                const prev = get();
                const id = `page_${Math.random().toString(36).slice(2, 9)}`;
                const pages = [...(prev.project.pages ?? []), { id, name: name ?? 'Untitled', rootId: prev.project.rootId } as Page];
                patchProject({ pages });
            });
        },
        removePage(pageId: string) {
            const s = EditorEngineCore.getState() as any;
            if (s.removePage) return s.removePage(pageId);
            EditorEngineCore.updatePatch(({ get, patchProject, patchUI }) => {
                const prev = get();
                const pages = (prev.project.pages ?? []).filter(p => p.id !== pageId);
                patchProject({ pages });
                const panels = prev.ui.panels;
                if (panels.left.lastActivePageId === pageId) {
                    patchUI({ panels: { ...panels, left: { ...panels.left, lastActivePageId: pages[0]?.id ?? null } } } as any);
                }
            });
        },
        duplicatePage(pageId: string) {
            const s = EditorEngineCore.getState() as any;
            if (s.duplicatePage) return s.duplicatePage(pageId);
            EditorEngineCore.updatePatch(({ get, patchProject }) => {
                const prev = get();
                const src = (prev.project.pages ?? []).find(p => p.id === pageId);
                if (!src) return;
                const id = `page_${Math.random().toString(36).slice(2, 9)}`;
                const pages = [...(prev.project.pages ?? []), { ...src, id, name: `${src.name} copy` }];
                patchProject({ pages });
            });
        },
        updatePageMeta(pageId: string, patch: Partial<Page>) {
            EditorEngineCore.updatePatch(({ get, patchProject }) => {
                const prev = get();
                const pages = (prev.project.pages ?? []).map(p => p.id === pageId ? { ...p, ...patch } : p);
                patchProject({ pages });
            });
        },
    };
    return { reader: R, writer: W } as const;
}