// src/figmaV3/store/slices/historySlice.ts

import { StateCreator } from 'zustand';
import { EditorStoreState, HistorySlice } from '../types';
import { Project } from '../../core/types';

// --- SELECTORS ---
export const selectHistory = (s: EditorStoreState) => s.history;
export const selectCanUndo = (s: EditorStoreState) => s.history.past.length > 0;
export const selectCanRedo = (s: EditorStoreState) => s.history.future.length > 0;

// --- SLICE ---
export const createHistorySlice: StateCreator<EditorStoreState, [], [], HistorySlice> = (set) => ({
    _setHistory: (history) => set({ history }),
});