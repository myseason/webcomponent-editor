import { StateCreator } from 'zustand';
import { EditorStoreState } from '../types';
import { Fragment } from '../../core/types';
import { genId, buildNodeWithDefaults, collectSubtreeIds, cloneSubtree } from '../utils';

export interface FragmentSlice {
    openFragment: (fragmentId?: string) => void;
    closeFragment: (fragmentId?: string) => void;
    addFragment: (name?: string) => string;
    removeFragment: (fragmentId: string) => void;
    updateFragment: (fragmentId: string, patch: Partial<Omit<Fragment, 'id' | 'rootId'>>) => void;
    publishComponent: () => void;
}

export const createFragmentSlice: StateCreator<EditorStoreState, [], [], FragmentSlice> = (set, get, _api) => ({
    openFragment: (fragmentId) => get().update((s) => {
        const next = [...(s.ui.overlays ?? [])];
        if (fragmentId) next.push(fragmentId);
        s.ui.overlays = next;
    }, false),
    closeFragment: (fragmentId) => get().update((s) => {
        const prev = s.ui.overlays ?? [];
        if (!prev.length) return;
        s.ui.overlays = fragmentId ? prev.filter(id => id !== fragmentId) : prev.slice(0, -1);
    }, false),
    addFragment: (name) => {
        const newId = genId('comp');
        const rootId = genId('node');
        get().update(s => {
            s.project.nodes[rootId] = buildNodeWithDefaults('box', rootId);
            const newFragment = { id: newId, name: name ?? `Component ${s.project.fragments.length + 1}`, rootId, isPublic: false };
            s.project.fragments = [...s.project.fragments, newFragment];
            if (s.ui.mode === 'Page') {
                const currentPage = s.project.pages.find(p => p.rootId === s.project.rootId);
                s.ui.panels.left.lastActivePageId = currentPage?.id ?? null;
            }
            s.ui.mode = 'Component';
            s.ui.editingFragmentId = newId;
            s.ui.panels.left.lastActiveFragmentId = newId;
            s.ui.selectedId = rootId;
        }, true);
        return newId;
    },
    removeFragment: (fragmentId) => get().update(s => {
        const frag = s.project.fragments.find(f => f.id === fragmentId);
        if (!frag) return;
        const toDel = collectSubtreeIds(s.project.nodes, frag.rootId);
        const nextNodes = { ...s.project.nodes };
        toDel.forEach(id => delete nextNodes[id]);
        s.project.nodes = nextNodes;
        s.project.fragments = s.project.fragments.filter(f => f.id !== fragmentId);
        if (s.ui.editingFragmentId === fragmentId) {
            const nextFragment = s.project.fragments[0];
            s.ui.editingFragmentId = nextFragment?.id ?? null;
            s.ui.selectedId = nextFragment?.rootId ?? null;
        }
    }, true),
    updateFragment: (fragmentId, patch) => get().update(s => {
        s.project.fragments = s.project.fragments.map(f =>
            f.id === fragmentId ? { ...f, ...patch } : f
        );
    }, true),
    publishComponent: () => get().update(s => {
        const fragId = s.ui.editingFragmentId;
        if (!fragId) return;
        const fragments = s.project.fragments.map(f =>
            f.id === fragId ? { ...f, isPublic: true } : f
        );
        s.project.fragments = fragments;
    }, true),
});