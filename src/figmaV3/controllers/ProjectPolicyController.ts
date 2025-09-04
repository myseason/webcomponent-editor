'use client';

import * as React from 'react';
import { policyProvider, type PolicyBundle } from '../domain/policy/PolicyProvider';
import { useEditor } from '../editor/useEditor';

/**
 * UI를 바꾸지 않으면서, 프로젝트 설정 변경을 정책에 반영하기 위한 가벼운 포트.
 * - 현재 프로젝트 설정에서 정책 관련 값을 읽어와 Provider Overrides로 주입/갱신합니다.
 * - 구체적인 프로젝트 설정 저장 로직은 기존 useEditor(update) 경로를 그대로 사용합니다.
 */
export function useProjectPolicyController() {
    const { project, update, setNotification } = useEditor();

    // 현재 오버라이드 조회
    const getOverrides = React.useCallback(() => {
        return policyProvider.getPolicies(); // base+override merge 결과 (참조용)
    }, []);

    // 프로젝트 설정 내 "정책 섹션"을 Provider override로 반영
    const setOverrides = React.useCallback((overrides: Partial<PolicyBundle>) => {
        policyProvider.setOverrides(overrides);
        setNotification?.('정책이 적용되었습니다.');
    }, [setNotification]);

    /**
     * 예시: 프로젝트 설정 저장 + 정책 동시에 반영
     * - ProjectStylesheets.tsx 같은 패널에서 onChange 시 호출
     */
    const saveProjectPolicy = React.useCallback((mutator: (draft: any) => void, overrides?: Partial<PolicyBundle>) => {
        update((s) => {
            if (!s.project) return;
            // 프로젝트에 정책 설정을 저장 (구조는 실제 프로젝트 구조에 맞게 조정)
            mutator(s.project);
        });
        if (overrides) policyProvider.setOverrides(overrides);
        setNotification?.('프로젝트 정책이 저장/적용되었습니다.');
    }, [update, setNotification]);

    return { project, getOverrides, setOverrides, saveProjectPolicy };
}