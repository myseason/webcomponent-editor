'use client';

/**
 * 컨트롤러 패키지에서 제공하는 얇은 구독 훅.
 * - Controller는 React-비종속(훅 없음) 원칙을 지키고,
 * - View는 이 훅으로 EditorEngine 변경을 구독하여 리렌더만 유도합니다.
 *
 * 사용법:
 *   const R = pagesFacade.reader();
 *   useControllerTick(() => R.token()); // 또는 () => pagesFacade.reader().facadeToken()
 */
import * as React from 'react';
import { EditorEngine } from '../../engine/EditorEngine';

// tokenResolver는 매 렌더마다 최신 토큰 문자열을 돌려주는 함수여야 합니다.
export function useControllerTick(tokenResolver: () => string) {
    const [, force] = React.useState(0);

    React.useEffect(() => {
        // 엔진 변경을 구독 → 리렌더
        return EditorEngine.subscribe(() => force((n) => n + 1));
    }, []);

    // 토큰 변화에도 리렌더 유도 (선택/목록 변경 등)
    const token = tokenResolver();
    React.useEffect(() => {
        // no-op: token이 바뀌면 위 force가 다시 호출되어 리렌더됩니다.
    }, [token]);
}