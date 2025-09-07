'use client';

import type { AnyFn } from './types'; // ← 위 1) 파일 또는 동일 타입을 직접 선언해도 됨

type WrapConfig = {
    /** key: writer에서 감쌀 메서드 이름 */
    wrap?: Record<string, (orig: AnyFn) => AnyFn>;
};

/**
 * makeSmartController
 * - 기본: useEngine이 준 reader / writer를 그대로 패스스루
 * - wrap에 명시된 키만 "원본 함수(orig)를 감싼 새 함수"로 교체
 * - wrap에서 지정하지 않은 모든 메서드는 유지 (절대 사라지지 않음)
 */
export function makeSmartController<
    R extends Record<string, any>,
    W extends Record<string, any>
>(
    _name: string,
    baseReader: R,
    baseWriter: W,
    cfg?: WrapConfig
): { reader: R; writer: W } {
    // 1) reader는 완전 패스스루
    const reader = baseReader;

    // 2) writer는 얕은 복사 후 필요한 키만 교체
    const writer: any = { ...baseWriter };

    if (cfg?.wrap) {
        for (const key of Object.keys(cfg.wrap)) {
            const wrap = cfg.wrap[key];
            const target: unknown =
                (baseWriter as any)[key] ?? (baseReader as any)[key];

            if (typeof target !== 'function') {
                if (process.env.NODE_ENV !== 'production') {
                    console.warn(
                        `[makeSmartController] skip wrapping "${key}" — original not found.`
                    );
                }
                continue;
            }

            // target을 AnyFn으로 단언, wrap 결과도 AnyFn
            const wrapped: AnyFn = wrap(target as AnyFn);
            writer[key] = wrapped;
        }
    }

    return { reader, writer };
}