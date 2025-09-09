'use client';

import { useRef, useSyncExternalStore } from 'react';
import { EditorCore } from '../../engine/EditorCore';

/**
 * 전역 스토어 변경마다 항상 증가하는 로컬 카운터를 스냅샷으로 사용.
 * - 스토어에 tick/__rev 등이 없어도 안전하게 리렌더를 유도
 * - store.subscribe -> 콜백에서 ref 증가 -> 외부스토어 구독 콜백 호출
 *
 * 특정 화면에서 선택적 리렌더가 필요하면, useEngine에서 selector 기반 리더를 쓰거나(지금 구조는 파사드 고정), 컨트롤러 내부에서 useMemo로 파생값을 캐싱
 */
export function useStoreTick(): number {
    const verRef = useRef(0);

    const subscribe = (cb: () => void) =>
        EditorCore.subscribe(() => {
            verRef.current += 1;
            cb();
        });

    const getSnapshot = () => verRef.current;

    // SSR 스냅샷도 동일 로직 사용 (Next.js RSC 대비)
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}