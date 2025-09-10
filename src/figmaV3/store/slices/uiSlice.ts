import { StateCreator } from 'zustand';
import { EditorStoreState, UiSlice } from '../types';

// --- SELECTORS ---
export const selectUi = (s: EditorStoreState) => s.ui;
export const selectSelectedId = (s: EditorStoreState) => s.ui.selectedId;
export const selectEditorMode = (s: EditorStoreState) => s.ui.mode;

// --- SLICE ---
export const createUiSlice: StateCreator<EditorStoreState, [], [], UiSlice> = (set, get) => ({
    _setSelectedId: (id) => get().update((s) => { s.ui.selectedId = id; }),
    _setEditorMode: (mode) => get().update((s) => { s.ui.mode = mode; }),
    _setExpertMode: (expertMode) => get().update((s) => { s.ui.expertMode = expertMode; }),

    _setCanvasSize: (size) => get().update((s) => {
        s.ui.canvas.width = size.width;
        s.ui.canvas.height = size.height;
    }),
    _setCanvasZoom: (z) => get().update((s) => { s.ui.canvas.zoom = z; }),
    _setCanvasOrientation: (orientation) => get().update((s) => { s.ui.canvas.orientation = orientation; }),

    _toggleBottomDock: () => get().update((s) => {
        const bottom = s.ui.panels.bottom ?? { isCollapsed: false } as any;
        s.ui.panels.bottom = { ...bottom, isCollapsed: !bottom.isCollapsed };
    }),

    _setActiveViewport: (viewport) => get().update((s) => { s.ui.canvas.activeViewport = viewport; }),
    _setBaseViewport: (viewport) => get().update((s) => { s.ui.canvas.baseViewport = viewport; }, true),

    _setViewportMode: (viewport, mode) => get().update((s) => {
        // legacy bridge + 신규 필드 모두 유지
        s.ui.canvas.vpMode = { ...s.ui.canvas.vpMode, [viewport]: mode };
        s.ui.canvas.viewportMode = { ...s.ui.canvas.viewportMode, [viewport]: mode };
    }, true),

    _setActiveHubTab: (tab) => get().update((s) => { s.ui.panels.left.activeHubTab = tab; }),
    _setEditingFragmentId: (fragmentId) => get().update((s) => { s.ui.editingFragmentId = fragmentId; }),
    _setNotification: (message) => get().update((s) => {
        s.ui.notification = message ? { message, timestamp: Date.now() } : null;
    }),

    _toggleLeftPanelSplit: () => get().update((s) => { s.ui.panels.left.isSplit = !s.ui.panels.left.isSplit; }),
    _setLeftPanelSplitPercentage: (percentage) => get().update((s) => {
        s.ui.panels.left.splitPercentage = Math.max(20, Math.min(80, percentage));
    }),
    _setLeftWidthPx: (px: number) => get().update((s) => { s.ui.panels.left.widthPx = px; }),

    _setLastActivePageId: (pageId) => get().update((s) => { s.ui.panels.left.lastActivePageId = pageId; }),
    _setLastActiveFragmentId: (fragmentId) => get().update((s) => { s.ui.panels.left.lastActiveFragmentId = fragmentId; }),
});