import { StateCreator } from 'zustand';
import { EditorStoreState, DataSlice } from '../types';
import { deepMerge } from '../../runtime/deepMerge';

// --- SELECTORS ---
export const selectData = (s: EditorStoreState) => s.data;
export const selectFlowEdges = (s: EditorStoreState) => s.flowEdges;
export const selectAssets = (s: EditorStoreState) => s.project.assets ?? [];

// --- SLICE ---
export const createDataSlice: StateCreator<EditorStoreState, [], [], DataSlice> = (set, get) => ({
    _setAssets: (assets) => get().update(s => { s.project.assets = assets; }, true),
    _setGlobalCss: (css) => get().update(s => { s.project.globalCss = css; }, true),
    _setGlobalJs: (js) => get().update(s => { s.project.globalJs = js; }, true),
    _setFlowEdges: (edges) => get().update(s => { s.flowEdges = edges; }, true),
    _setData: (data) => get().update(s => { s.data = data; }, true),
    _setComponentPolicy: (componentId, policy) => get().update(s => {
        if (!s.project.policies) s.project.policies = {};
        if (!s.project.policies.components) s.project.policies.components = {};
        const existing = s.project.policies.components[componentId] ?? {};
        s.project.policies.components[componentId] = deepMerge(existing, policy);
    }, true),
});