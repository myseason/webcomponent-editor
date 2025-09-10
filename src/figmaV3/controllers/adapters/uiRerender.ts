let listeners = new Set<() => void>();
let scheduled = false;

export function subscribeRerender(listener: () => void): () => void {
    listeners.add(listener);
    // ✅ cleanup은 반드시 void를 반환하도록 감싸준다.
    return () => {
        listeners.delete(listener);
    };
}

/** Writer 호출 직후에 한 프레임당 한 번만 브로드캐스트 */
export function requestRerenderTick() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
        scheduled = false;
        for (const l of listeners) l();
    });
}

// ─ React 컴포넌트에서 필요한 곳만 옵트인 ─
import { useEffect, useState } from 'react';
export function useRerenderOnWrite() {
    const [, setV] = useState(0);
    useEffect(() => {
        const unsubscribe = subscribeRerender(() => {
            setV(v => (v + 1) & 0xffff);
        });
        return () => {
            unsubscribe(); // ✅ cleanup은 void
        };
    }, []);
}