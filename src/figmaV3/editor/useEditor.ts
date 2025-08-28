'use client';

import { useSyncExternalStore } from 'react';
import { editorStore, type EditorStoreState } from '../store/editStore';

export function useEditor(): EditorStoreState {
    const state = useSyncExternalStore(
        editorStore.subscribe,
        editorStore.getState,
        editorStore.getState
    );
    return state;
}