'use client';

import { useRef, useSyncExternalStore } from 'react';
import { EditorEngine } from '../../engine/EditorEngine';

type Snap = {
    data: Record<string, unknown>;
    token: string;
};

function computeSnap(): Snap {
    const s = EditorEngine.getState() as any;
    const data = (s?.data ?? {}) as Record<string, unknown>;
    // 비교 비용 최소화를 위해 key 수 + 버전만 섞어서 토큰 생성
    const token = `${Object.keys(data).length}|${s?.__version__ ?? ''}`;
    return { data, token };
}

export function useDataController() {
    const ref = useRef<Snap>(computeSnap());

    const subscribe = (onChange: () => void) => {
        const unsub = EditorEngine.subscribe(() => {
            const next = computeSnap();
            if (next.token !== ref.current.token) {
                ref.current = next;
                onChange();
            }
        });
        return () => { if (typeof unsub === 'function') unsub(); };
    };

    const getSnapshot = () => ref.current;
    const { data } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    const getGlobalData = () => data;
    const getGlobalKeys = () => Object.keys(data ?? {});

    // 필요 시 확장: setData(path, value) 등
    return { getGlobalData, getGlobalKeys };
}