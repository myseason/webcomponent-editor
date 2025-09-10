'use client';

import type { AnyFn } from '../types';

export function withAfter<T extends AnyFn>(after: (ret: ReturnType<T>) => void) {
    return (orig: T): T => ((...args: Parameters<T>) => {
        const r = orig(...args);
        try { after(r); } catch { /* noop */ }
        return r;
    }) as T;
}

export const withLog =
    (name: string) =>
        (orig: AnyFn): AnyFn =>
            (...args: any[]) => {
                // 필요하면 디버그 로깅
                //if (process.env.NODE_ENV !== 'production') {
                    // eslint-disable-next-line no-console
                    console.debug(`[${name}]`, ...args);
                //}
                return orig(...args);
    };

export const withCommand =
    (
        name: string,
        factory: (...args: any[]) => { undo(): void; redo(): void },
        push: (cmd: { undo(): void; redo(): void }) => void
    ) =>
        (orig: AnyFn): AnyFn =>
            (...args: any[]) => {
                const cmd = factory(...args);
                push(cmd);
                // 필요하면 here에 try/catch 등 부가 로직
                return orig(...args);
    };