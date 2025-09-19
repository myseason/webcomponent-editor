import type {
    EditorState, Project, NodeId, Node, FlowEdge, CSSDict, Viewport, ViewportMode,
    EditorMode, ProjectHubTab, Asset, Page, Fragment, ComponentPolicy, Stylesheet
} from '../core/types';

// --- Slice Action Types ---
export interface BaseSlice {
    _hydrateDefaults: () => void;
    _resetProject: (next: Project) => void;
    _patchProject: (patch: Partial<Project>) => void;
}

export interface DataSlice {
    _setAssets: (assets: Asset[]) => void;
    _upsertAsset: (asset: Asset) => void;
    _removeAsset: (assetId: string) => void;

    _setGlobalCss: (css: string) => void;
    _setGlobalJs: (js: string) => void;

    _setFlowEdges: (edge: Record<string, FlowEdge>) => void;
    _setData: (data: Record<string, unknown>) => void;

    _setComponentPolicy: (componentId: string, policy: ComponentPolicy) => void;

    // Stylesheets (project-level)
    _upsertStylesheet: (sheet: Stylesheet) => void;
    _toggleStylesheet: (id: string, enabled: boolean) => void;
    _removeStylesheet: (id: string) => void;
}

export interface FragmentSlice {
    _setFragments: (fragments: Fragment[]) => void;
    _addFragment: (fragment: Fragment) => void;
    _removeFragment: (fragmentId: string) => void;
    _setOverlays: (overlays: string[]) => void;
    _pushOverlay: (overlayId: string) => void;
    _popOverlay: () => void;
}

export interface HistorySlice {
    _setHistory: (history: { past: Project[]; future: Project[] }) => void;
    _undo: () => void;
    _redo: () => void;
    _clearHistory: () => void;
}

export interface NodeSlice {
    _setNodes: (nodes: Record<NodeId, Node>) => void;

    _createNode: (node: Node) => void;
    _deleteNodeCascade: (id: NodeId) => void;

    _patchNode: (id: NodeId, patch: Partial<Node>) => void;
    _bulkPatchNodes: (patches: Array<{ id: NodeId; patch: Partial<Node> }>) => void;

    _updateNodeProps: (id: NodeId, props: Record<string, unknown>) => void;
    _updateNodeStyles: (id: NodeId, styles: CSSDict, viewport?: Viewport) => void;

    _setNodeChildren: (id: NodeId, children: NodeId[]) => void;
    _reorderChild: (parentId: NodeId, fromIndex: number, toIndex: number) => void;
    _moveNode: (nodeId: NodeId, newParentId: NodeId, newIndex: number) => void;

    _toggleNodeVisibility: (id: NodeId) => void;
    _toggleNodeLock: (id: NodeId) => void;
}

export interface PageSlice {
    _setPages: (pages: Page[]) => void;
    _setRootId: (rootId: NodeId) => void;

    _addPage: (page: Page) => void;
    _removePage: (pageId: string) => void;
    _updatePageMeta: (pageId: string, patch: Partial<Page>) => void;
    _duplicatePageFromRoot: (sourceRootId: NodeId, nextPage: Page, clonedNodes: Record<NodeId, Node>) => void;
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
    _setLeftWidthPx: (px: number) => void;

    _setLastActivePageId: (pageId: string | null) => void;
    _setLastActiveFragmentId: (fragmentId: string | null) => void;
    _setInspectorForceTagPolicy: (force: boolean) => void;
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