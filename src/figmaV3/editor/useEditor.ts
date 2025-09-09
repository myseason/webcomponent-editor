'use client';

import { useSyncExternalStore } from 'react';
import { editorStore } from '../store/editorStore';
import type { EditorStoreState } from '../store/types';

// 임시 사용자 정보 (향후 실제 인증 시스템으로 대체)
const MOCK_USER = {
    isAdmin: true,
};

/**
 * @deprecated
 * 통짜 상태 구독 훅은 과도한 리렌더를 유발할 수 있습니다.
 * 신규 코드는 각 도메인 Controller의 reader()/writer()를 사용해 주세요.
 * (예: usePagesController().reader().currentPageId())
 * 최종 단계에서 제거 대상이며, 호환 기간 동안만 유지됩니다.
 */
export function useEditor(): EditorStoreState & { isAdmin: boolean } { // isAdmin 타입 추가
    const state = useSyncExternalStore(
        editorStore.subscribe,
        editorStore.getState,
        editorStore.getState
    );
    return { ...state, isAdmin: MOCK_USER.isAdmin }; // isAdmin 플래그 주입
}