// src/figmaV3/store/types.ts

import type {
    EditorState, Project, NodeId, Node, FlowEdge, CSSDict, Viewport,
    ViewportMode, EditorMode, ProjectHubTab, Asset, Page, Fragment, ComponentPolicy
} from '../core/types';

// --- Slice Action Types ---

export interface DataSlice {
    addAsset: (asset: Omit<Asset, 'id'>) => string;
    removeAsset: (assetId: string) => void;
    updateGlobalCss: (css: string) => void;
    updateGlobalJs: (js: string) => void;
    addFlowEdge: (edge: FlowEdge) => void;
    updateFlowEdge: (edgeId: string, patch: Partial<FlowEdge>) => void;
    removeFlowEdge: (edgeId: string) => void;
    getEffectiveDecl: (nodeId: string) => CSSDict | null;
    setData: (path: string, value: unknown) => void;
    setSetting: (key: string, value: unknown) => void;
    updateComponentPolicy: (componentId: string, patch: Partial<ComponentPolicy>) => void;
}

export interface FragmentSlice {
    openFragment: (fragmentId?: string) => void;
    closeFragment: (fragmentId?: string) => void;
    addFragment: (name?: string) => string;
    removeFragment: (fragmentId: string) => void;
    updateFragment: (fragmentId: string, patch: Partial<Omit<Fragment, 'id' | 'rootId'>>) => void;
    publishComponent: () => void;
}

export interface HistorySlice {
    undo: () => void;
    redo: () => void;
}

export interface NodeSlice {
    addByDef: (defId: string, parentId?: NodeId) => NodeId;
    addByDefAt: (defId: string, parentId: NodeId, index: number) => void;
    patchNode: (id: NodeId, patch: Partial<Node>) => void;
    updateNodeProps: (id: NodeId, props: Record<string, unknown>) => void;
    updateNodeStyles: (id: NodeId, styles: CSSDict, viewport?: Viewport) => void;
    moveNode: (nodeId: NodeId, newParentId: NodeId, newIndex: number) => void;
    removeNodeCascade: (nodeId: NodeId) => void;
    toggleNodeVisibility: (nodeId: NodeId) => void;
    toggleNodeLock: (nodeId: NodeId) => void;
    saveNodeAsComponent: (nodeId: NodeId, name: string, description: string, isPublic: boolean) => void;
    insertComponent: (fragmentId: string, parentId?: NodeId) => void;
    hydrateDefaults: () => void;
}

export interface PageSlice {
    selectPage: (pageId: string) => void;
    addPage: (name?: string) => string;
    removePage: (pageId: string) => void;
    duplicatePage: (pageId: string) => void;
}

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


// --- Main Store Type ---
export type EditorStoreState = EditorState &
    DataSlice &
    FragmentSlice &
    HistorySlice &
    NodeSlice &
    PageSlice &
    UiSlice & {
    update: (fn: (draft: EditorState) => void, recordHistory?: boolean) => void;
};