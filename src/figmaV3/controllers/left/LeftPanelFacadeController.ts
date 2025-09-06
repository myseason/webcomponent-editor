'use client';

import { useSyncExternalStore, useRef } from 'react';
import { EditorEngine } from '../../engine/EditorEngine';

// 1) 공통 스냅샷 (하나의 구독만)
function useLeftPanelSnapshot() {
    const cacheRef = useRef<any>(null);
    const subscribe = (cb: () => void) =>
        EditorEngine.subscribe(() => {
            cacheRef.current = EditorEngine.getState();
            cb();
        });
    const get = () => (cacheRef.current ??= EditorEngine.getState());
    return useSyncExternalStore(subscribe, get, get);
}

// 2) 단일 훅
export function useLeftPanelFacadeController() {
    const snap = useLeftPanelSnapshot();

    // ---- Reader 모음 ----
    const reader = {
        project: () => snap.project,
        ui: () => snap.ui,

        // Layers
        outline: () => (EditorEngine as any).layers?.outline?.() ?? [],

        // Pages
        pages: () => (EditorEngine as any).pages?.list?.() ?? (snap.project?.pages ?? []),
        currentPageId: () => (EditorEngine as any).pages?.currentId?.() ?? (snap.ui?.currentPageId ?? null),

        // Palette/Components/Assets/Templates/Stylesheets
        components: () => (EditorEngine as any).library?.components?.() ?? [],
        assets: () => (snap.data?.assets ?? []),
        templates: () => (snap.project?.templates ?? []),
        stylesheets: () => (snap.project?.stylesheets ?? []),
    } as const;

    // ---- Writer 모음 (엔진 파사드 우선, 없으면 폴백 update) ----
    const writer = {
        // 공통
        update: EditorEngine.update.bind(EditorEngine),
        setNotification: (EditorEngine as any).ui?.setNotification?.bind((EditorEngine as any).ui)
            ?? ((m: string) => console.info('[notification]', m)),

        // Layers
        setSelectedNodeId: (id: string | null) =>
            (EditorEngine as any).ui?.setSelectedId?.(id) ??
            EditorEngine.update((d: any) => { d.ui = d.ui || {}; d.ui.selectedId = id; }),
        moveNode: (nid: string, pid: string, idx?: number) =>
            (EditorEngine as any).nodes?.move?.(nid, pid, idx) ??
            EditorEngine.update((d: any) => { /* 폴백 구현(이미 보유) */ }),
        appendChild: (pid: string, cid: string) =>
            (EditorEngine as any).nodes?.appendChild?.(pid, cid),
        removeCascade: (nid: string) =>
            (EditorEngine as any).nodes?.removeCascade?.(nid),
        toggleHidden: (nid: string) =>
            (EditorEngine as any).nodes?.toggleHidden?.(nid),
        toggleLocked: (nid: string) =>
            (EditorEngine as any).nodes?.toggleLocked?.(nid),

        // Pages
        addPage: (name?: string) => (EditorEngine as any).pages?.add?.(name),
        removePage: (id: string) => (EditorEngine as any).pages?.remove?.(id),
        renamePage: (id: string, name: string) => (EditorEngine as any).pages?.rename?.(id, name),
        setCurrentPage: (id: string) => (EditorEngine as any).pages?.setCurrent?.(id),

        // Palette/Components
        createNodeFromPalette: (def: any, parentId?: string, index?: number) =>
            (EditorEngine as any).nodes?.create?.(def, parentId, index),
        publishComponent: (id: string) =>
            (EditorEngine as any).components?.publish?.(id),

        // Assets
        addAsset: (file: File) => (EditorEngine as any).assets?.add?.(file),
        removeAsset: (id: string) => (EditorEngine as any).assets?.remove?.(id),

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

        // LeftSidebar(UI)
        toggleLeftPanel: () =>
            (EditorEngine as any).ui?.toggleLeftPanel?.(),
        setLeftPanelTab: (tab: string) =>
            (EditorEngine as any).ui?.setLeftPanelTab?.(tab),
    } as const;

    // 3) 도메인별 서브 네임스페이스를 제공(가독성↑, 트리쉐이킹↑)
    return {
        reader,
        writer,
        layers:   { reader: { outline: reader.outline }, writer: {
                setSelectedNodeId: writer.setSelectedNodeId, moveNode: writer.moveNode,
                appendChild: writer.appendChild, removeCascade: writer.removeCascade,
                toggleHidden: writer.toggleHidden, toggleLocked: writer.toggleLocked,
            }},
        pages:    { reader: { pages: reader.pages, currentPageId: reader.currentPageId }, writer: {
                addPage: writer.addPage, removePage: writer.removePage, renamePage: writer.renamePage, setCurrentPage: writer.setCurrentPage,
            }},
        palette:  { reader: {}, writer: { createNode: writer.createNodeFromPalette } },
        components:{ reader: { components: reader.components }, writer: { publishComponent: writer.publishComponent } },
        assets:   { reader: { assets: reader.assets }, writer: { addAsset: writer.addAsset, removeAsset: writer.removeAsset } },
        templates:{ reader: { templates: reader.templates }, writer: { addTemplate: writer.addTemplate, removeTemplate: writer.removeTemplate } },
        stylesheets:{ reader: { stylesheets: reader.stylesheets }, writer: { addStylesheet: writer.addStylesheet, updateStylesheet: writer.updateStylesheet, removeStylesheet: writer.removeStylesheet } },
        sidebar:  { reader: { ui: reader.ui }, writer: { toggleLeftPanel: writer.toggleLeftPanel, setLeftPanelTab: writer.setLeftPanelTab } },
    };
}