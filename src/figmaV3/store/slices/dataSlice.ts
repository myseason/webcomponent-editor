import { StateCreator } from 'zustand';
import { EditorStoreState } from '../types';

import { Asset, FlowEdge, ComponentPolicy, CSSDict } from '../../core/types';
import { genId, setByPath } from '../utils';
import { getDefinition } from '../../core/registry';
import { deepMerge } from '../../runtime/deepMerge';


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

export const createDataSlice: StateCreator<EditorStoreState, [], [], DataSlice> = (set, get, _api) => ({
    addAsset: (asset) => {
        const newId = genId('asset');
        get().update(s => {
            if (!s.project.assets) s.project.assets = [];
            s.project.assets.push({ ...asset, id: newId });
        }, true);
        return newId;
    },
    removeAsset: (assetId) => {
        get().update(s => {
            if (s.project.assets) {
                s.project.assets = s.project.assets.filter(a => a.id !== assetId);
            }
        }, true);
    },
    updateGlobalCss: (css) => { get().update(s => { s.project.globalCss = css; }, true); },
    updateGlobalJs: (js) => { get().update(s => { s.project.globalJs = js; }, true); },
    addFlowEdge: (edge) => get().update(s => {
        const id = genId('edge');
        s.flowEdges[id] = { ...edge, id };
    }, true),
    updateFlowEdge: (edgeId, patch) => get().update(s => {
        if (!s.flowEdges[edgeId]) return;
        s.flowEdges[edgeId] = { ...s.flowEdges[edgeId]!, ...patch };
    }, true),
    removeFlowEdge: (edgeId) => get().update(s => {
        const next = { ...s.flowEdges };
        delete next[edgeId];
        s.flowEdges = next;
    }, true),
    getEffectiveDecl: (nodeId) => {
        const s = get();
        const node = s.project.nodes[nodeId];
        if (!node) return null;

        const el = node.styles?.element ?? {};
        const base = s.ui.canvas.baseViewport;
        const active = s.ui.canvas.activeViewport;
        const mode = s.ui.canvas.vpMode[active];

        const baseDecl = (el as any)[base] ?? {};
        if (mode === 'Independent' && active !== base) {
            const ov = (el as any)[active] ?? {};
            return { ...baseDecl, ...ov };
        }
        return { ...baseDecl };
    },
    setData: (path, value) => get().update((s) => { s.data = setByPath(s.data ?? {}, path, value); }, true),
    setSetting: (key, value) => get().update((s) => { s.settings = { ...(s.settings ?? {}), [key]: value }; }, true),
    updateComponentPolicy: (componentId, patch) => get().update(s => {
        if (!s.project.policies) s.project.policies = {};
        if (!s.project.policies.components) s.project.policies.components = {};
        const existing = s.project.policies.components[componentId] ?? {
            version: '1.1', component: componentId, tag: getDefinition(componentId)?.capabilities?.defaultTag ?? 'div'
        };
        s.project.policies.components[componentId] = deepMerge(existing, patch);
    }, true),
});