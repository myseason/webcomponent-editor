// src/figmaV3/controllers/left/LeftPanelFacadeController.ts
'use client';

import { useRef, useSyncExternalStore } from 'react';
import { EditorEngine } from '../../engine/EditorEngine';

function useLeftPanelSnapshot<T = any>() {
    const cacheRef = useRef<T | null>(null);
    const subscribe = (cb: () => void) =>
        EditorEngine.subscribe(() => {
            cacheRef.current = EditorEngine.getState() as T;
            cb();
        });
    const get = () => (cacheRef.current ??= EditorEngine.getState() as T);
    return useSyncExternalStore(subscribe, get, get);
}

export function useLeftPanelFacadeController() {
    const snap: any = useLeftPanelSnapshot();

    const reader = {
        project: () => snap.project,
        ui: () => snap.ui,
        outline: () => (EditorEngine as any).layers?.outline?.() ?? [],
        pages: () => (EditorEngine as any).pages?.list?.() ?? (snap.project?.pages ?? []),
        currentPageId: () => (EditorEngine as any).pages?.currentId?.() ?? (snap.ui?.currentPageId ?? null),
        components: () => (EditorEngine as any).library?.components?.() ?? (snap.project?.components ?? []),
        assets: () => (snap.data?.assets ?? snap.project?.assets ?? []),
        templates: () => (snap.project?.templates ?? []),
        stylesheets: () => (snap.project?.stylesheets ?? []),
        isAdmin: () => Boolean(snap.ui?.isAdmin),
    } as const;

    const writer = {
        update: EditorEngine.update.bind(EditorEngine),
        setNotification:
            (EditorEngine as any).ui?.setNotification?.bind((EditorEngine as any).ui) ??
            ((m: string) => console.info('[notification]', m)),

        // Layers
        setSelectedNodeId: (id: string | null) =>
            (EditorEngine as any).ui?.setSelectedId?.(id) ??
            EditorEngine.update((d: any) => { d.ui = d.ui || {}; d.ui.selectedId = id; }),
        moveNode: (nid: string, pid: string, idx?: number) =>
            (EditorEngine as any).nodes?.move?.(nid, pid, idx),
        appendChild: (pid: string, cid: string) =>
            (EditorEngine as any).nodes?.appendChild?.(pid, cid),
        removeCascade: (nid: string) =>
            (EditorEngine as any).nodes?.removeCascade?.(nid),
        toggleHidden: (nid: string) =>
            (EditorEngine as any).nodes?.toggleHidden?.(nid),
        toggleLocked: (nid: string) =>
            (EditorEngine as any).nodes?.toggleLocked?.(nid),

        // 레거시 별칭
        select: (id: string | null) =>
            (EditorEngine as any).ui?.setSelectedId?.(id) ??
            EditorEngine.update((d: any) => { d.ui = d.ui || {}; d.ui.selectedId = id; }),
        toggleNodeVisibility: (nid: string) =>
            (EditorEngine as any).nodes?.toggleHidden?.(nid),
        toggleNodeLock: (nid: string) =>
            (EditorEngine as any).nodes?.toggleLocked?.(nid),
        removeNodeCascade: (nid: string) =>
            (EditorEngine as any).nodes?.removeCascade?.(nid),

        // Pages
        addPage: (name?: string) => (EditorEngine as any).pages?.add?.(name),
        removePage: (id: string) => (EditorEngine as any).pages?.remove?.(id),
        renamePage: (id: string, name: string) => (EditorEngine as any).pages?.rename?.(id, name),
        setCurrentPage: (id: string) => (EditorEngine as any).pages?.setCurrent?.(id),
        selectPage: (id: string) => (EditorEngine as any).pages?.setCurrent?.(id),
        duplicatePage: (id: string) =>
            (EditorEngine as any).pages?.duplicate?.(id) ??
            EditorEngine.update((d: any) => {
                const pages: any[] = d.project?.pages ?? [];
                const src = pages.find((p: any) => p.id === id);
                if (!src) return;
                const copyId = `page_${Date.now()}`;
                const idx = pages.indexOf(src);
                const insertAt = idx >= 0 ? idx + 1 : pages.length;
                pages.splice(insertAt, 0, { ...src, id: copyId, name: `${src.name} copy` });
                d.project = d.project || {};
                d.project.pages = pages;
            }),

        // Palette / Components
        createNode: (def: any, parentId?: string, index?: number) =>
            (EditorEngine as any).nodes?.create?.(def, parentId, index),
        addByDef: (def: any, parentId?: string, index?: number) =>
            (EditorEngine as any).nodes?.create?.(def, parentId, index),
        insertComponent: (componentId: string, parentId?: string, index?: number) =>
            (EditorEngine as any).components?.insert?.(componentId, parentId, index),

        // ComponentsPanel 관련 (여기 추가!)
        addFragment: (name: string) =>
            (EditorEngine as any).components?.add?.(name) ??
            EditorEngine.update((d: any) => {
                // 안전 폴백: 최소 구조로 components 목록에 추가
                d.project = d.project || {};
                const list = (d.project.components = d.project.components || []);
                const id = `cmp_${Date.now()}`;
                list.push({ id, name, rootId: null });
            }),
        updateFragment: (fragmentId: string, patch: any) =>
            (EditorEngine as any).components?.update?.(fragmentId, patch),
        removeFragment: (fragmentId: string) =>
            (EditorEngine as any).components?.remove?.(fragmentId),
        openComponentEditor: (componentId: string) =>
            (EditorEngine as any).components?.openEditor?.(componentId),
        publishComponent: (componentId?: string) =>
            (componentId ? (EditorEngine as any).components?.publish?.(componentId) : undefined),

        // Assets
        addAsset: (fileOrMeta: File | { name: string; url: string }) =>
            (EditorEngine as any).assets?.add?.(fileOrMeta),
        removeAsset: (id: string) =>
            (EditorEngine as any).assets?.remove?.(id),
        updateGlobalCss: (css: string) =>
            (EditorEngine as any).assets?.updateGlobalCss?.(css) ??
            EditorEngine.update((d: any) => {
                d.project = d.project || {};
                d.project.globals = d.project.globals || {};
                d.project.globals.css = String(css);
            }),
        updateGlobalJs: (js: string) =>
            (EditorEngine as any).assets?.updateGlobalJs?.(js) ??
            EditorEngine.update((d: any) => {
                d.project = d.project || {};
                d.project.globals = d.project.globals || {};
                d.project.globals.js = String(js);
            }),

        // Templates
        addTemplate: (t: any) => (EditorEngine as any).templates?.add?.(t),
        removeTemplate: (id: string) => (EditorEngine as any).templates?.remove?.(id),

        // Stylesheets
        addStylesheet: (name: string, content = '') =>
            (EditorEngine as any).stylesheets?.add?.(name, content),
        updateStylesheet: (id: string, content: string) =>
            (EditorEngine as any).stylesheets?.update?.(id, content),
        removeStylesheet: (id: string) =>
            (EditorEngine as any).stylesheets?.remove?.(id),

        // Left Sidebar (UI)
        setEditorMode: (mode: string) =>
            (EditorEngine as any).ui?.setEditorMode?.(mode),
        setActiveHubTab: (tab: string) =>
            (EditorEngine as any).ui?.setActiveHubTab?.(tab),
        toggleLeftPanelSplit: () => {
            EditorEngine.ui.toggleLeftPanelSplit();
        },
        setLeftPanelSplitPercentage: (pct: number) =>
            (EditorEngine as any).ui?.setLeftPanelSplitPercentage?.(pct),
    } as const;

    return {
        reader,
        writer,

        layers: {
            reader: { outline: reader.outline },
            writer: {
                setSelectedNodeId: writer.setSelectedNodeId,
                moveNode: writer.moveNode,
                appendChild: writer.appendChild,
                removeCascade: writer.removeCascade,
                toggleHidden: writer.toggleHidden,
                toggleLocked: writer.toggleLocked,
                select: writer.select,
                toggleNodeVisibility: writer.toggleNodeVisibility,
                toggleNodeLock: writer.toggleNodeLock,
                removeNodeCascade: writer.removeNodeCascade,
            },
        },

        pages: {
            reader: { pages: reader.pages, currentPageId: reader.currentPageId },
            writer: {
                addPage: writer.addPage,
                removePage: writer.removePage,
                renamePage: writer.renamePage,
                setCurrentPage: writer.setCurrentPage,
                selectPage: writer.selectPage,
                duplicatePage: writer.duplicatePage,
            },
        },

        palette: {
            reader: {},
            writer: {
                createNode: writer.createNode,
                addByDef: writer.addByDef,
                insertComponent: writer.insertComponent,
            },
        },

        components: {
            reader: { components: reader.components },
            writer: {
                addFragment: writer.addFragment,          // ← 추가
                updateFragment: writer.updateFragment,
                removeFragment: writer.removeFragment,
                openComponentEditor: writer.openComponentEditor,
                publishComponent: writer.publishComponent,
            },
        },

        assets: {
            reader: { assets: reader.assets },
            writer: {
                addAsset: writer.addAsset,
                removeAsset: writer.removeAsset,
                updateGlobalCss: writer.updateGlobalCss,
                updateGlobalJs: writer.updateGlobalJs,
            },
        },

        templates: {
            reader: { templates: reader.templates },
            writer: {
                addTemplate: writer.addTemplate,
                removeTemplate: writer.removeTemplate,
            },
        },

        stylesheets: {
            reader: { stylesheets: reader.stylesheets },
            writer: {
                addStylesheet: writer.addStylesheet,
                updateStylesheet: writer.updateStylesheet,
                removeStylesheet: writer.removeStylesheet,
            },
        },

        sidebar: {
            reader: { ui: reader.ui },
            writer: {
                setEditorMode: writer.setEditorMode,
                setActiveHubTab: writer.setActiveHubTab,
                toggleLeftPanelSplit: writer.toggleLeftPanelSplit,
                setLeftPanelSplitPercentage: writer.setLeftPanelSplitPercentage,
            },
        },

        flags: { reader: { isAdmin: reader.isAdmin } },
    };
}