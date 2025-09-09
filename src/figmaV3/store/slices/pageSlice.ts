// src/figmaV3/store/slices/pageSlice.ts

import { StateCreator } from 'zustand';
import { EditorStoreState, PageSlice } from '../types';

// --- SELECTORS ---
export const selectPages = (s: EditorStoreState) => s.project.pages;
export const selectCurrentRootId = (s: EditorStoreState) => s.project.rootId;
export const selectPageById = (id: string) => (s: EditorStoreState) => s.project.pages.find(p => p.id === id);

// --- SLICE ---
export const createPageSlice: StateCreator<EditorStoreState, [], [], PageSlice> = (set, get) => ({
    _setPages: (pages) => get().update(s => { s.project.pages = pages; }, true),
    _setRootId: (rootId) => get().update(s => { s.project.rootId = rootId; }, false),
});