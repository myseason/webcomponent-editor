import { StateCreator } from 'zustand';
import { EditorStoreState } from '../types';

export interface HistorySlice {
    undo: () => void;
    redo: () => void;
}

export const createHistorySlice: StateCreator<EditorStoreState, [], [], HistorySlice> = (set, get, _api) => ({
    undo: () => {
        const current = get();
        if (current.history.past.length === 0) return;
        const prev = current.history.past[current.history.past.length - 1];
        const future = [current.project, ...current.history.future];
        const past = current.history.past.slice(0, -1);
        const nextSelected = prev.nodes[current.ui.selectedId ?? ''] ? current.ui.selectedId : prev.rootId;
        set({
            ...current,
            project: prev,
            ui: { ...current.ui, selectedId: nextSelected },
            history: { past, future }
        });
    },
    redo: () => {
        const current = get();
        if (current.history.future.length === 0) return;
        const next = current.history.future[0];
        const future = current.history.future.slice(1);
        const past = [...current.history.past, current.project];
        const nextSelected = next.nodes[current.ui.selectedId ?? ''] ? current.ui.selectedId : next.rootId;
        set({
            ...current,
            project: next,
            ui: { ...current.ui, selectedId: nextSelected },
            history: { past, future }
        });
    },
});