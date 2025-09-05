'use client';

import * as React from 'react';
import { useEditorLike as useEditor } from './adapters/useEditorLike';


export type PageMetaPatch = {
    name?: string;
    description?: string;
    slug?: string;
};

export interface PagesController {
    addPage(title: string): string | null;
    duplicatePage(pageId: string): string | null;
    removePage(pageId: string): void;
    selectPage(pageId: string): void;
    updatePageMeta(pageId: string, patch: PageMetaPatch): void;
}

export function usePagesController(): PagesController {
    const state = useEditor();

    const addPage = React.useCallback((title: string): string | null => {
        let newId: string | null = null;
        state.update((s: any) => {
            const id = 'pg_' + Math.random().toString(36).slice(2, 8);
            (s.project.pages ??= []).push({ id, name: title, rootId: s.project.rootId });
            s.ui.panels ??= { left: {} };
            s.ui.panels.left ??= {};
            s.ui.panels.left.lastActivePageId = id;
            newId = id;
        });
        state.setNotification?.(`Page "${title}" added`);
        return newId;
    }, [state]);

    const duplicatePage = React.useCallback((pageId: string): string | null => {
        let newId: string | null = null;
        state.update((s: any) => {
            const src = (s.project.pages ?? []).find((p: any) => p.id === pageId);
            if (!src) return;
            const id = 'pg_' + Math.random().toString(36).slice(2, 8);
            const copy = { ...src, id, name: (src.name ?? src.title ?? 'Page') + ' Copy' };
            (s.project.pages ??= []).push(copy);
            s.ui.panels ??= { left: {} };
            s.ui.panels.left ??= {};
            s.ui.panels.left.lastActivePageId = id;
            newId = id;
        });
        state.setNotification?.('Page duplicated');
        return newId;
    }, [state]);

    const removePage = React.useCallback((pageId: string) => {
        state.update((s: any) => {
            s.project.pages = (s.project.pages ?? []).filter((p: any) => p.id !== pageId);
            const pages = s.project.pages ?? [];
            if (s.ui.panels?.left?.lastActivePageId === pageId) {
                s.ui.panels.left.lastActivePageId = pages[0]?.id ?? null;
            }
        });
    }, [state]);

    const selectPage = React.useCallback((pageId: string) => {
        state.update((s: any) => {
            s.ui.panels ??= { left: {} };
            s.ui.panels.left ??= {};
            s.ui.panels.left.lastActivePageId = pageId;
        });
    }, [state]);

    const updatePageMeta = React.useCallback((pageId: string, patch: PageMetaPatch) => {
        state.update((s: any) => {
            const p = (s.project.pages ?? []).find((x: any) => x.id === pageId);
            if (!p) return;
            Object.assign(p, patch);
        });
    }, [state]);

    return { addPage, duplicatePage, removePage, selectPage, updatePageMeta };
}