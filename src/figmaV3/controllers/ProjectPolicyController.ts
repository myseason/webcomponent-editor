'use client';

import * as React from 'react';
import { useEngine } from '../engine/Engine';
import { policyProvider } from '../domain/policy/PolicyProvider';

export interface ProjectPolicyReader {
    get(): Record<string, unknown>;
}
export interface ProjectPolicyWriter {
    override(patch: Record<string, unknown>): void;
}
export interface ProjectPolicyController {
    reader(): ProjectPolicyReader;
    writer(): ProjectPolicyWriter;
}

export function useProjectPolicyController(): ProjectPolicyController {
    const eng = useEngine();

    const reader = React.useMemo<ProjectPolicyReader>(() => ({
        get() {
            // v1.4 PolicyProvider는 getPolicies()로 번들 반환
            return policyProvider.getPolicies() as unknown as Record<string, unknown>;
        },
    }), []);

    const writer = React.useMemo<ProjectPolicyWriter>(() => ({
        override(patch) {
            // v1.4는 setOverrides 사용 (TS2724 fix)
            policyProvider.setOverrides(patch as any);
            eng.notify('프로젝트 정책이 갱신되었습니다.');
        },
    }), [eng]);

    return React.useMemo(() => ({ reader: () => reader, writer: () => writer }), [reader, writer]);
}