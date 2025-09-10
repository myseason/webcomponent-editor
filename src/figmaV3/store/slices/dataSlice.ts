import { StateCreator } from 'zustand';
import { EditorStoreState, DataSlice } from '../types';
import { deepMerge } from '../../runtime/deepMerge';
import type {FlowEdge, Stylesheet} from '../../core/types';

// --- SELECTORS ---
export const selectData = (s: EditorStoreState) => s.data;
export const selectFlowEdges = (s: EditorStoreState) => s.flowEdges;
export const selectAssets = (s: EditorStoreState) => s.project.assets ?? [];
export const selectStylesheets = (s: EditorStoreState) => s.project.stylesheets ?? [];

// --- SLICE ---
export const createDataSlice: StateCreator<EditorStoreState, [], [], DataSlice> = (set, get) => ({
    _setAssets: (assets) => get().update((s) => { s.project.assets = assets; }, true),

    _upsertAsset: (asset) => get().update((s) => {
        const list = s.project.assets ?? [];
        const idx = list.findIndex((a) => a.id === asset.id);
        if (idx >= 0) list[idx] = asset; else list.push(asset);
        s.project.assets = [...list];
    }, true),

    _removeAsset: (assetId) => get().update((s) => {
        s.project.assets = (s.project.assets ?? []).filter((a) => a.id !== assetId);
    }, true),

    _setGlobalCss: (css) => get().update((s) => { s.project.globalCss = css; }, true),
    _setGlobalJs: (js) => get().update((s) => { s.project.globalJs = js; }, true),

    _setFlowEdges: (edges: Record<string, FlowEdge>) =>
        get().update((s) => {
            s.flowEdges = edges;
        }, true),

    _setData: (data) => get().update((s) => { s.data = data; }, true),

    _setComponentPolicy: (componentId, policy) => get().update((s) => {
        if (!s.project.policies) s.project.policies = {};
        if (!s.project.policies.components) s.project.policies.components = {};
        const existing = s.project.policies.components[componentId] ?? {};
        s.project.policies.components[componentId] = deepMerge(existing, policy);
    }, true),

    _upsertStylesheet: (sheet: Stylesheet) => get().update((s) => {
        const list = s.project.stylesheets ?? [];
        const idx = list.findIndex((x) => x.id === sheet.id);
        if (idx >= 0) list[idx] = { ...list[idx], ...sheet }; else list.push(sheet);
        s.project.stylesheets = [...list];
    }, true),

    _toggleStylesheet: (id: string, enabled: boolean) => get().update((s) => {
        const list = s.project.stylesheets ?? [];
        s.project.stylesheets = list.map((x) => (x.id === id ? { ...x, enabled } : x));
    }, true),

    _removeStylesheet: (id: string) => get().update((s) => {
        s.project.stylesheets = (s.project.stylesheets ?? []).filter((x) => x.id !== id);
    }, true),
}) as DataSlice & {
    upsertFlowEdge?: (id: string, edge: FlowEdge) => void;
    removeFlowEdge?: (id: string) => void;
};

// 별도 헬퍼를 prototype에 추가해도 되지만, 보통은 store 레벨에서 확장합니다.
export const attachFlowEdgeHelpers = (store: { getState: () => EditorStoreState }) => {
    const st = store.getState() as EditorStoreState & {
        upsertFlowEdge?: (id: string, edge: FlowEdge) => void;
        removeFlowEdge?: (id: string) => void;
    };

    st.upsertFlowEdge = (id, edge) => {
        const edges = selectFlowEdges(st);
        st._setFlowEdges({ ...edges, [id]: edge });
    };

    st.removeFlowEdge = (id) => {
        const edges = selectFlowEdges(st);
        const { [id]: _, ...next } = edges;
        st._setFlowEdges(next);
    };
};