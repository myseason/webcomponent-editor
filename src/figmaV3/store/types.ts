import type {
    EditorState, Project, NodeId, Node, FlowEdge, CSSDict, Viewport,
    ViewportMode, EditorMode, ProjectHubTab, Asset, Page, Fragment, ComponentPolicy
} from '../core/types';

// --- Slice Action Types ---
export interface BaseSlice {
    _hydrateDefaults: () => void;
}

export interface DataSlice {
    _setAssets: (assets: Asset[]) => void;
    _setGlobalCss: (css: string) => void;
    _setGlobalJs: (js: string) => void;
    _setFlowEdges: (edges: Record<string, FlowEdge>) => void;
    _setData: (data: Record<string, unknown>) => void;
    _setComponentPolicy: (componentId: string, policy: ComponentPolicy) => void;
}

export interface FragmentSlice {
    _setFragments: (fragments: Fragment[]) => void;
    _setOverlays: (overlays: string[]) => void;
}

export interface HistorySlice {
    _setHistory: (history: { past: Project[]; future: Project[] }) => void;
}

export interface NodeSlice {
    _setNodes: (nodes: Record<NodeId, Node>) => void;
    _patchNode: (id: NodeId, patch: Partial<Node>) => void;
    _updateNodeProps: (id: NodeId, props: Record<string, unknown>) => void;
    _updateNodeStyles: (id: NodeId, styles: CSSDict, viewport?: Viewport) => void;
    _setNodeChildren: (id: NodeId, children: NodeId[]) => void;
}

export interface PageSlice {
    _setPages: (pages: Page[]) => void;
    _setRootId: (rootId: NodeId) => void;
}

export interface UiSlice {
    _setSelectedId: (id: NodeId | null) => void;
    _setEditorMode: (mode: EditorMode) => void;
    _setExpertMode: (expertMode: boolean) => void;
    _setCanvasSize: (size: { width: number; height: number }) => void;
    _setCanvasZoom: (zoom: number) => void;
    _setCanvasOrientation: (orientation: 'portrait' | 'landscape') => void;
    _toggleBottomDock: () => void;
    _setActiveViewport: (viewport: Viewport) => void;
    _setBaseViewport: (viewport: Viewport) => void;
    _setViewportMode: (viewport: Viewport, mode: ViewportMode) => void;
    _setActiveHubTab: (tab: ProjectHubTab) => void;
    _setEditingFragmentId: (fragmentId: string | null) => void;
    _setNotification: (message: string | null) => void;
    _toggleLeftPanelSplit: () => void;
    _setLeftPanelSplitPercentage: (percentage: number) => void;
    _setLastActivePageId: (pageId: string | null) => void;
    _setLastActiveFragmentId: (fragmentId: string | null) => void;
    _setLeftWidthPx: (px: number) => void;
}

// --- Main Store Type ---
export type EditorStoreState = EditorState &
    BaseSlice &
    DataSlice &
    FragmentSlice &
    HistorySlice &
    NodeSlice &
    PageSlice &
    UiSlice & {
    update: (fn: (draft: EditorState) => void, recordHistory?: boolean) => void;
};