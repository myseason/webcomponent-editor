import { StateCreator } from 'zustand';
import { EditorStoreState } from '../types';
import { NodeId, EditorMode, Viewport, ViewportMode, ProjectHubTab } from '../../core/types';

export interface UiSlice {
    select: (id: NodeId | null) => void;
    setEditorMode: (mode: EditorMode) => void;
    setCanvasSize: (size: { width: number, height: number }) => void;
    setCanvasZoom: (zoom: number) => void;
    toggleCanvasOrientation: () => void;
    toggleBottomDock: () => void;
    setActiveViewport: (viewport: Viewport) => void;
    setBaseViewport: (viewport: Viewport) => void;
    setViewportMode: (viewport: Viewport, mode: ViewportMode) => void;
    setActiveHubTab: (tab: ProjectHubTab) => void;
    openComponentEditor: (fragmentId: string) => void;
    closeComponentEditor: () => void;
    setNotification: (message: string) => void;
    toggleLeftPanelSplit: () => void;
    setLeftPanelSplitPercentage: (percentage: number) => void;
}

export const createUiSlice: StateCreator<EditorStoreState, [], [], UiSlice> = (set, get, _api) => ({
    select: (id) => get().update(s => { s.ui.selectedId = id; }),
    setEditorMode: (mode) => get().update(s => {
        if (s.ui.mode === mode) return;
        if (s.ui.mode === 'Page') {
            const currentPage = s.project.pages.find(p => p.rootId === s.project.rootId);
            s.ui.panels.left.lastActivePageId = currentPage?.id ?? s.project.pages[0]?.id ?? null;
        } else {
            s.ui.panels.left.lastActiveFragmentId = s.ui.editingFragmentId;
        }
        s.ui.mode = mode;
        if (mode === 'Page') {
            s.ui.editingFragmentId = null;
            const targetPage = s.project.pages.find(p => p.id === s.ui.panels.left.lastActivePageId) ?? s.project.pages[0];
            if (targetPage) {
                s.project.rootId = targetPage.rootId;
                s.ui.selectedId = targetPage.rootId;
            }
        } else {
            let targetFragment = s.project.fragments.find(f => f.id === s.ui.panels.left.lastActiveFragmentId) ?? s.project.fragments[0];
            if (!targetFragment) {
                const newId = get().addFragment('New Component');
                const newFrag = get().project.fragments.find(f => f.id === newId);
                if (newFrag) {
                    s.ui.editingFragmentId = newFrag.id;
                    s.ui.selectedId = newFrag.rootId;
                }
            } else {
                s.ui.editingFragmentId = targetFragment.id;
                s.ui.selectedId = targetFragment.rootId;
            }
        }
    }),
    setCanvasSize: (size) => get().update(s => { s.ui.canvas.width = size.width; s.ui.canvas.height = size.height; }),
    setCanvasZoom: (z) => get().update(s => { s.ui.canvas.zoom = z; }),
    toggleCanvasOrientation: () => get().update(s => {
        const { width, height } = s.ui.canvas;
        s.ui.canvas.width = height;
        s.ui.canvas.height = width;
    }),
    toggleBottomDock: () => get().update(s => {
        const bottom = s.ui.panels.bottom ?? { heightPx: 240, isCollapsed: false, advanced: null };
        s.ui.panels.bottom = { ...bottom, isCollapsed: !bottom.isCollapsed };
    }),
    setActiveViewport: (viewport) => get().update(s => { s.ui.canvas.activeViewport = viewport; }),
    setBaseViewport: (viewport) => get().update(s => { s.ui.canvas.baseViewport = viewport; }, true),
    setViewportMode: (viewport, mode) => get().update(s => { s.ui.canvas.vpMode = { ...s.ui.canvas.vpMode, [viewport]: mode }; }, true),
    setActiveHubTab: (tab) => get().update(s => { s.ui.panels.left.activeHubTab = tab; }),
    openComponentEditor: (fragmentId) => get().update(s => {
        const frag = s.project.fragments.find(f => f.id === fragmentId);
        if (frag) {
            if (s.ui.mode === 'Page') {
                const currentPage = s.project.pages.find(p => p.rootId === s.project.rootId);
                s.ui.panels.left.lastActivePageId = currentPage?.id ?? null;
            }
            s.ui.mode = 'Component';
            s.ui.editingFragmentId = fragmentId;
            s.ui.panels.left.lastActiveFragmentId = fragmentId;
            s.ui.selectedId = frag.rootId;
        }
    }),
    closeComponentEditor: () => { get().setEditorMode('Page'); },
    setNotification: (message: string) => get().update(s => { s.ui.notification = { message, timestamp: Date.now() }; }),
    toggleLeftPanelSplit: () => get().update(s => {
        s.ui.panels.left.isSplit = !s.ui.panels.left.isSplit;
        if (s.ui.panels.left.isSplit && s.ui.panels.left.activeHubTab !== 'Layers') {
            s.ui.panels.left.activeHubTab = 'Layers';
        }
    }),
    setLeftPanelSplitPercentage: (percentage: number) => get().update(s => {
        s.ui.panels.left.splitPercentage = Math.max(20, Math.min(80, percentage));
    }),
});