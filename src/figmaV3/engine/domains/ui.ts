'use client';

import type { Viewport, ViewportMode, EditorUI } from '../../core/types';
import { EditorEngineCore } from '../EditorEngineCore';

export function uiDomain() {
    const R = {
        getUI(): EditorUI { return EditorEngineCore.getState().ui; },
        getUi(): EditorUI { return EditorEngineCore.getState().ui; },
        zoom(): number { return R.getUI()?.canvas?.zoom ?? 1; },
        activeViewport(): Viewport { return (R.getUI()?.canvas?.activeViewport ?? 'desktop') as Viewport; },
        viewportMode(vp: string | Viewport): ViewportMode {
            const k = (vp as Viewport);
            return (R.getUI()?.canvas?.vpMode?.[k] ?? 'size') as ViewportMode;
        },
    };

    const W = {
        setEditorMode(mode: EditorUI['mode']) {
            const s = EditorEngineCore.getState() as any;
            if (s.setEditorMode) return s.setEditorMode(mode);
            EditorEngineCore.updatePatch(({ patchUI, get }) => {
                patchUI({ ...get().ui, mode } as Partial<EditorUI>);
            });
        },

        setActiveHubTab(tab: any) {
            const s = EditorEngineCore.getState() as any;
            if (s.setActiveHubTab) return s.setActiveHubTab(tab);
            const ui = R.getUI();
            EditorEngineCore.updatePatch(({ patchUI }) => {
                patchUI({ panels: { ...ui.panels, left: { ...ui.panels.left, activeHubTab: tab } } } as any);
            });
        },

        toggleLeftPanelSplit() {
            const s = EditorEngineCore.getState() as any;
            if (s.toggleLeftPanelSplit) return s.toggleLeftPanelSplit();
            const ui = R.getUI();
            const curr = ui?.panels?.left?.isSplit ?? false;
            EditorEngineCore.updatePatch(({ patchUI }) => {
                patchUI({ panels: { ...ui.panels, left: { ...ui.panels.left, isSplit: !curr } } } as any);
            });
        },

        setLeftPanelSplitPercentage(pct: number) {
            const s = EditorEngineCore.getState() as any;
            if (s.setLeftPanelSplitPercentage) return s.setLeftPanelSplitPercentage(pct);
            const ui = R.getUI();
            EditorEngineCore.updatePatch(({ patchUI }) => {
                patchUI({ panels: { ...ui.panels, left: { ...ui.panels.left, splitPercentage: pct } } } as any);
            });
        },

        setActiveViewport(vp: Viewport) {
            const s = EditorEngineCore.getState() as any;
            if (s.setActiveViewport) return s.setActiveViewport(vp);
            const ui = R.getUI();
            EditorEngineCore.updatePatch(({ patchUI }) => {
                patchUI({ canvas: { ...ui.canvas, activeViewport: vp } } as any);
            });
        },

        setBaseViewport(vp: Viewport) {
            const s = EditorEngineCore.getState() as any;
            if (s.setBaseViewport) return s.setBaseViewport(vp);
            const ui = R.getUI();
            EditorEngineCore.updatePatch(({ patchUI }) => {
                patchUI({ canvas: { ...ui.canvas, baseViewport: vp } } as any);
            });
        },

        setViewportMode(vp: Viewport, mode: ViewportMode) {
            const s = EditorEngineCore.getState() as any;
            if (s.setViewportMode) return s.setViewportMode(vp, mode);
            const ui = R.getUI();
            const vpMode = { ...(ui.canvas?.vpMode ?? {}), [vp]: mode } as Record<Viewport, ViewportMode>;
            EditorEngineCore.updatePatch(({ patchUI }) => {
                patchUI({ canvas: { ...ui.canvas, vpMode } } as any);
            });
        },

        setCanvasSize(size: { width: number; height: number }) {
            const s = EditorEngineCore.getState() as any;
            if (s.setCanvasSize) return s.setCanvasSize(size);
            const ui = R.getUI();
            EditorEngineCore.updatePatch(({ patchUI }) => {
                patchUI({ canvas: { ...ui.canvas, width: size.width, height: size.height } } as any);
            });
        },

        setCanvasZoom(zoom: number) {
            const s = EditorEngineCore.getState() as any;
            if (s.setCanvasZoom) return s.setCanvasZoom(zoom);
            const ui = R.getUI();
            EditorEngineCore.updatePatch(({ patchUI }) => {
                patchUI({ canvas: { ...ui.canvas, zoom } } as any);
            });
        },

        toggleCanvasOrientation() {
            const s = EditorEngineCore.getState() as any;
            if (s.toggleCanvasOrientation) return s.toggleCanvasOrientation();
            const ui = R.getUI();
            const next = ui.canvas?.orientation === 'portrait' ? 'landscape' : 'portrait';
            EditorEngineCore.updatePatch(({ patchUI }) => {
                patchUI({ canvas: { ...ui.canvas, orientation: next as 'portrait'|'landscape' } } as any);
            });
        },
    };

    return { reader: R, writer: W } as const;
}