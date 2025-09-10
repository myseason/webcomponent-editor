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

    // 단일 edge를 id 기준으로 upsert (Record<string, FlowEdge> 구조에 맞춤)
    _upsertFlowEdge: (id: string, edge: FlowEdge) =>
        get().update((s) => {
            const map = s.flowEdges ?? {};
            s.flowEdges = { ...map, [id]: edge };
        }, true),

    // 단일 edge를 id 기준으로 제거
    _removeFlowEdge: (id: string) =>
        get().update((s) => {
            const map = s.flowEdges ?? {};
            if (!(id in map)) return; // 변화 없으면 no-op
            const { [id]: _removed, ...rest } = map;
            s.flowEdges = rest;
        }, true),

}) as DataSlice & {
    _upsertFlowEdge?: (id: string, edge: FlowEdge) => void;
    _removeFlowEdge?: (id: string) => void;
};
