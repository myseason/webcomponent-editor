import { StateCreator } from 'zustand';
import { EditorStoreState, HistorySlice } from '../types';
import { Project } from '../../core/types';

// --- SELECTORS ---
export const selectHistory = (s: EditorStoreState) => s.history;
export const selectCanUndo = (s: EditorStoreState) => s.history.past.length > 0;
export const selectCanRedo = (s: EditorStoreState) => s.history.future.length > 0;

// --- SLICE ---
export const createHistorySlice: StateCreator<EditorStoreState, [], [], HistorySlice> = (set, get) => ({
    _setHistory: (history) => set({ history }),

    _undo: () => {
        const s = get();
        const { past, future } = s.history;
        if (past.length === 0) return;

        const currentProject = s.project;
        const prev = past[past.length - 1];
        set({
            project: prev,
            history: { past: past.slice(0, -1), future: [currentProject, ...future] },
        });
    },

    _redo: () => {
        const s = get();
        const { past, future } = s.history;
        if (future.length === 0) return;

        const currentProject = s.project;
        const next = future[0];
        set({
            project: next,
            history: { past: [...past, currentProject], future: future.slice(1) },
        });
    },

    _clearHistory: () => set({ history: { past: [], future: [] } }),
});