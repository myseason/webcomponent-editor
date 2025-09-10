import { StateCreator } from 'zustand';
import { EditorStoreState, FragmentSlice } from '../types';

// --- SELECTORS ---
export const selectFragments = (s: EditorStoreState) => s.project.fragments;
export const selectFragmentById = (id: string) => (s: EditorStoreState) => s.project.fragments.find((f) => f.id === id);
export const selectOverlays = (s: EditorStoreState) => s.ui.overlays;

// --- SLICE ---
export const createFragmentSlice: StateCreator<EditorStoreState, [], [], FragmentSlice> = (set, get) => ({
    _setFragments: (fragments) => get().update((s) => { s.project.fragments = fragments; }, true),

    _addFragment: (fragment) => get().update((s) => {
        s.project.fragments.push(fragment);
    }, true),

    _removeFragment: (fragmentId) => get().update((s) => {
        s.project.fragments = s.project.fragments.filter((f) => f.id !== fragmentId);
    }, true),

    _setOverlays: (overlays) => get().update((s) => { s.ui.overlays = overlays; }, false),

    _pushOverlay: (overlayId) => get().update((s) => {
        s.ui.overlays = [...(s.ui.overlays ?? []), overlayId];
    }, false),

    _popOverlay: () => get().update((s) => {
        if (!s.ui.overlays || s.ui.overlays.length === 0) return;
        s.ui.overlays = s.ui.overlays.slice(0, -1);
    }, false),
});