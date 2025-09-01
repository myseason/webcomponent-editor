'use client';

import { useSyncExternalStore } from 'react';
import { editorStore, type EditorStoreState } from '../store/editStore';

// 임시 사용자 정보 (향후 실제 인증 시스템으로 대체)
const MOCK_USER = {
    isAdmin: true,
};

export function useEditor(): EditorStoreState & { isAdmin: boolean } { // isAdmin 타입 추가
    const state = useSyncExternalStore(
        editorStore.subscribe,
        editorStore.getState,
        editorStore.getState
    );
    return { ...state, isAdmin: MOCK_USER.isAdmin }; // isAdmin 플래그 주입
}