'use client';

import { useRef, useSyncExternalStore } from 'react';
import { EditorEngine } from '@/figmaV3/engine/EditorEngine';

/**
 * Controller 내부 전용 정밀 구독 유틸.
 * - getSnapshot은 항상 "동일 참조"를 반환 (ref 캐시)
 * - 스냅샷 갱신은 subscribe 경로(상태 변경 시)에만 수행
 */
export type Equals<T> = (a: T, b: T) => boolean;

export function createReader<TSlice>(
    pickSlice: (root: ReturnType<typeof EditorEngine.getState>) => TSlice
) {
    function getSlice(): TSlice {
        return pickSlice(EditorEngine.getState());
    }

    function useSelect<R>(selector: (s: TSlice) => R, equals?: Equals<R>) {
        const eq = equals ?? Object.is;

        // 초기 스냅샷을 먼저 계산하여 ref를 값으로 초기화
        const initial = selector(getSlice());
        const snapRef = useRef<R>(initial);

        // 상태 변경 시에만 스냅샷을 갱신하고 구독자에게 통지
        const subscribe = (onStoreChange: () => void) => {
            const unsubscribe = EditorEngine.subscribe(() => {
                const next = selector(getSlice());
                const curr = snapRef.current;
                if (!eq(curr, next)) {
                    snapRef.current = next;
                    onStoreChange();
                }
            });
            return () => {
                if (typeof unsubscribe === 'function') unsubscribe();
            };
        };

        // 항상 캐시된 동일 참조를 반환
        const getSnapshot = () => snapRef.current;

        // SSR fallback도 동일 참조 반환
        const getServerSnapshot = getSnapshot;

        return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    }

    return { get: getSlice, useSelect };
}