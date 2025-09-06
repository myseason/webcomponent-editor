'use client';

import { useMemo } from 'react';
import { EditorEngine } from '../../engine/EditorEngine';

/**
 * 프로젝트 정책(스타일/태그/가시성 등)의 Provider 레벨 접근
 * - 기존 API/시그니처 보존
 * - 내부 구현만 EditorEngine 파사드 기반
 */
export interface ProjectPolicyReader {
    /** 정책 객체 구독 없이 즉시 조회 */
    getPolicy(): any;
    /** 정책 스냅샷 토큰 (UI에서 변경 추적에 사용) */
    token(): string;
}

export interface ProjectPolicyWriter {
    /** 전체 교체 */
    setPolicy(next: any): void;
    /** 얕은 병합 */
    patchPolicy(patch: Record<string, unknown>): void;
    /** 중첩 병합(옵션) */
    deepMergePolicy(patch: Record<string, unknown>): void;
}

export interface ProjectPolicyController {
    reader(): ProjectPolicyReader;
    writer(): ProjectPolicyWriter;
}

function buildReader(): ProjectPolicyReader {
    return {
        getPolicy() {
            return (EditorEngine.getState().project as any).policy;
        },
        token() {
            const p = (EditorEngine.getState().project as any).policy ?? {};
            // 간단 토큰: 버전/모듈개수/키해시 등 필요 시 확장
            const keys = Object.keys(p);
            return `policy::${keys.length}`;
        },
    };
}

function shallowMerge<T extends object>(dst: T, src: Partial<T>) {
    Object.assign(dst, src);
}

function deepMerge(dst: any, src: any) {
    for (const k of Object.keys(src)) {
        const sv = src[k];
        const dv = dst[k];
        if (sv && typeof sv === 'object' && !Array.isArray(sv)) {
            if (!dv || typeof dv !== 'object' || Array.isArray(dv)) dst[k] = {};
            deepMerge(dst[k], sv);
        } else {
            dst[k] = sv;
        }
    }
}

function buildWriter(): ProjectPolicyWriter {
    return {
        setPolicy(next) {
            EditorEngine.update((draft) => {
                (draft.project as any).policy = next;
            }, true);
        },
        patchPolicy(patch) {
            EditorEngine.update((draft) => {
                const cur = ((draft.project as any).policy ??= {});
                shallowMerge(cur, patch);
            }, true);
        },
        deepMergePolicy(patch) {
            EditorEngine.update((draft) => {
                const cur = ((draft.project as any).policy ??= {});
                deepMerge(cur, patch);
            }, true);
        },
    };
}

export function useProjectPolicyController(): ProjectPolicyController {
    const reader = useMemo(() => buildReader(), []);
    const writer = useMemo(() => buildWriter(), []);
    return useMemo(() => ({ reader: () => reader, writer: () => writer }), [reader, writer]);
}