// src/figmaV3/store/slices/fragmentSlice.ts

import { StateCreator } from 'zustand';
import { EditorStoreState, FragmentSlice } from '../types';

// --- SELECTORS ---
export const selectFragments = (s: EditorStoreState) => s.project.fragments;
export const selectFragmentById = (id: string) => (s: EditorStoreState) => s.project.fragments.find(f => f.id === id);
export const selectOverlays = (s: EditorStoreState) => s.ui.overlays;

// --- SLICE ---
export const createFragmentSlice: StateCreator<EditorStoreState, [], [], FragmentSlice> = (set, get) => ({
    _setFragments: (fragments) => get().update(s => { s.project.fragments = fragments; }, true),
    _setOverlays: (overlays) => get().update(s => { s.ui.overlays = overlays; }, false),
});