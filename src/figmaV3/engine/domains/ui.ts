import { EditorCore } from '../EditorCore';
import type { EditorState, EditorUI, NodeId, Viewport, ViewportMode, EditorMode, ProjectHubTab } from '../../core/types';
import { selectUi } from '../../store/slices/uiSlice';

export function uiDomain() {
    const R = {
        getUI: (): EditorUI => selectUi(EditorCore.getState()),
        getSelectedNodeId: (): NodeId | null => R.getUI().selectedId,
        getEditorMode: (): EditorMode => R.getUI().mode,
        getExpertMode: (): boolean => !!R.getUI().expertMode,
    };

    const W = {
        setEditorMode(mode: EditorMode) {
            const state = EditorCore.store.getState();
            if (state.ui.mode === mode) return;

            if (mode === 'Page') {
                const targetPage = state.project.pages.find(p => p.id === state.ui.panels.left.lastActivePageId) ?? state.project.pages[0];
                if (targetPage) {
                    state._setRootId(targetPage.rootId);
                    state._setSelectedId(targetPage.rootId);
                }
                state._setEditingFragmentId(null);
                state._setActiveHubTab('Pages');
            } else {
                const targetFragment = state.project.fragments.find(f => f.id === state.ui.panels.left.lastActiveFragmentId) ?? state.project.fragments[0];
                if (targetFragment) {
                    state._setEditingFragmentId(targetFragment.id);
                    state._setSelectedId(targetFragment.rootId);
                }
                state._setActiveHubTab('Components');
            }
            state._setEditorMode(mode);
        },
        openComponentEditor(fragmentId: string) {
            const state = EditorCore.store.getState();
            const frag = state.project.fragments.find(f => f.id === fragmentId);
            if (!frag) return;

            if (state.ui.mode === 'Page') {
                const currentPage = state.project.pages.find(p => p.rootId === state.project.rootId);
                state._setLastActivePageId(currentPage?.id ?? null);
            }
            state._setEditorMode('Component');
            state._setActiveHubTab('Components');
            state._setEditingFragmentId(fragmentId);
            state._setLastActiveFragmentId(fragmentId);
            state._setSelectedId(frag.rootId);
        },
        closeComponentEditor: () => W.setEditorMode('Page'),
        selectNode: (id: NodeId | null) => EditorCore.store.getState()._setSelectedId(id),
        setExpertMode: (expertMode: boolean) => EditorCore.store.getState()._setExpertMode(expertMode),
        setCanvasSize: (size: { width: number; height: number; }) => EditorCore.store.getState()._setCanvasSize(size),
        setCanvasZoom: (zoom: number) => EditorCore.store.getState()._setCanvasZoom(zoom),
        toggleCanvasOrientation: () => {
            const state = EditorCore.store.getState();
            const { width, height, orientation } = state.ui.canvas;
            const newOrientation = state.ui.canvas.orientation === 'landscape' ? 'portrait' : 'landscape';
            state._setCanvasSize({ width: height, height: width });
            state._setCanvasOrientation(newOrientation);
        },
        toggleBottomDock: () => EditorCore.store.getState()._toggleBottomDock(),
        setActiveViewport: (viewport: Viewport) => EditorCore.store.getState()._setActiveViewport(viewport),
        setBaseViewport: (viewport: Viewport) => EditorCore.store.getState()._setBaseViewport(viewport),
        setViewportMode: (viewport: Viewport, mode: ViewportMode) => EditorCore.store.getState()._setViewportMode(viewport, mode),
        setActiveHubTab: (tab: ProjectHubTab) => EditorCore.store.getState()._setActiveHubTab(tab),
        setNotification: (message: string | null) => EditorCore.store.getState()._setNotification(message),
        toggleLeftPanelSplit: () => {
            const state = EditorCore.store.getState();
            state._toggleLeftPanelSplit();
            if (state.ui.panels.left.isSplit && state.ui.panels.left.activeHubTab !== 'Layers') {
                state._setActiveHubTab('Layers');
            }
        },
        setLeftPanelSplitPercentage: (percentage: number) => EditorCore.store.getState()._setLeftPanelSplitPercentage(percentage),
        setLeftWidthPx: (px: number) => EditorCore.store.getState()._setLeftWidthPx(px)
    };

    return { reader: R, writer: W } as const;
}