'use client';
/**
 * Vanilla Zustand(store/editStore.ts)을 React에서 구독하기 위한 훅.
 * - useSyncExternalStore로 SSR/CSR 일관성 보장
 * - 반환값: 상태 + 액션(= EditorStoreState)
 */
import { useSyncExternalStore } from 'react';
import { editorStore } from '../store/editStore';
import type { EditorStoreState } from '../store/editStore';

export function useEditor(): EditorStoreState {
    const subscribe = editorStore.subscribe;
    const getSnapshot = editorStore.getState;
    const getServerSnapshot = getSnapshot;
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}