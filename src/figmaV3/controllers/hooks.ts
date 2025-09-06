'use client';

// ⚠️ 최소침습/호환 유지용 훅 허브
// - Inspector.tsx 가 기대하는 useInspectorViewModel 을 안정적으로 제공
// - 엔진/셀렉터 의존을 제거해 타입 충돌 방지
// - UI/UX/데이터 흐름 변경 없음

import { useMemo } from 'react';
import { useEditor } from '../editor/useEditor';
import type { NodeId } from '../core/types';

export type InspectorVM = {
    target: null | { nodeId: NodeId; componentId: string | null };
};

/**
 * useInspectorViewModel
 * - 기존 코드 호환을 위한 최소 뷰모델 훅
 * - 엔진/셀렉터 의존 없이 useEditor 만으로 계산
 * - UI/UX/마크업 변경 없음
 */
export function useInspectorViewModel(): InspectorVM {
    const state = useEditor();

    // 기존 로직: 선택 노드 기준으로 componentId 확인
    const nodeId: NodeId | null = (state.ui?.selectedId as NodeId | undefined) ?? null;
    const componentId: string | null =
        nodeId ? ((state.project?.nodes?.[nodeId]?.componentId as string | undefined) ?? null) : null;

    return useMemo<InspectorVM>(() => {
        if (!nodeId) return { target: null };
        return { target: { nodeId, componentId } };
    }, [nodeId, componentId]);
}

// ─────────────────────────────────────────────────────────────────────────────
// 향후 점진 리팩토링 가이드
// - 이 파일은 "호환 허브" 역할만 수행합니다.
// - 컨트롤러 기반 뷰모델 훅으로 이전 시, 아래처럼 alias 제공 후
//   컴포넌트에서 import 교체하는 순서로 제거하세요.
//
// import { useInspectorController } from './InspectorController';
// export const useInspectorViewModel = useInspectorController; // 호환 alias
//
// 그 후, 해당 파일은 제거 대상입니다.
// ─────────────────────────────────────────────────────────────────────────────