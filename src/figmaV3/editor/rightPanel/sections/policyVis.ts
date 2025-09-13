'use client';

import { getDefinition } from '@/figmaV3/core/registry';
import type { EditorMode, Node, StylePolicy, ComponentPolicy } from '@/figmaV3/core/types';
import { deepMerge } from '@/figmaV3/runtime/deepMerge';
import { GLOBAL_STYLE_POLICY } from '@/figmaV3/policy/globalStylePolicy';
import { GLOBAL_TAG_POLICIES } from '@/figmaV3/policy/globalTagPolicy';

// StylePolicy의 각 그룹이 가질 수 있는 최소한의 형태를 정의합니다.
type PolicyGroup = {
    visible?: boolean;
    controls?: Record<string, { visible?: boolean }>;
};

/**
 * 여러 정책을 병합하여 특정 노드에 대한 최종 "유효 정책" 객체를 계산합니다.
 * @param node - 대상 노드
 * @param mode - 현재 에디터 모드 ('Page' 또는 'Component')
 * @param expertMode - 고급 모드 활성화 여부
 * @param componentPolicy - 프로젝트에 저장된 컴포넌트 정책
 * @returns 최종적으로 계산된 StylePolicy 객체
 */
export function getEffectivePolicy(
    node: Node,
    mode: EditorMode,
    expertMode: boolean,
    componentPolicy?: ComponentPolicy
): StylePolicy {
    const def = getDefinition(node.componentId);

    const tag = def?.capabilities?.defaultTag ?? 'div';
    const tagPolicy = GLOBAL_TAG_POLICIES[tag] ?? {};

    // 기본 정책 = 전역 스타일 정책 + 태그 정책
    const basePolicy = deepMerge(GLOBAL_STYLE_POLICY, tagPolicy);

    // 고급 모드에서는 ComponentPolicy를 무시하고 기본 정책만 사용합니다.
    if (expertMode) {
        return basePolicy;
    }

    // 페이지 모드에서는 ComponentPolicy를 추가로 병합하여 필터링합니다.
    if (mode === 'Page' && componentPolicy) {
        return deepMerge(basePolicy, componentPolicy.inspector ?? {});
    }

    // 컴포넌트 모드에서는 기본 정책만 사용합니다. (잠금 UI를 표시하기 위함)
    return basePolicy;
}

/**
 * 계산된 유효 정책을 바탕으로 특정 그룹의 표시 여부를 결정합니다.
 * @param effectivePolicy - getEffectivePolicy로 계산된 최종 정책
 * @param groupName - 검사할 그룹 이름 (예: 'layout')
 * @returns 그룹이 표시되어야 하는지 여부
 */
export function getGroupVisibility(effectivePolicy: StylePolicy, groupName: keyof StylePolicy): boolean {
    const groupPolicy = effectivePolicy[groupName] as PolicyGroup | undefined;

    if (!groupPolicy || groupPolicy.visible === false) {
        return false;
    }

    // 그룹 내 컨트롤 중 하나라도 보이면 그룹을 표시합니다.
    if (!groupPolicy.controls) return false; // 컨트롤이 없는 그룹은 숨김
    for (const key in groupPolicy.controls) {
        if (getControlVisibility(effectivePolicy, `${groupName}.${key}`)) {
            return true;
        }
    }

    return false;
}

/**
 * 계산된 유효 정책을 바탕으로 특정 컨트롤의 표시 여부를 결정합니다.
 * @param effectivePolicy - getEffectivePolicy로 계산된 최종 정책
 * @param controlPath - 검사할 컨트롤의 경로 (예: 'layout.display')
 * @returns 컨트롤이 표시되어야 하는지 여부
 */
export function getControlVisibility(effectivePolicy: StylePolicy, controlPath: string): boolean {
    const [groupName, controlName] = controlPath.split('.') as [keyof StylePolicy, string];
    if (!groupName || !controlName) return false;

    const groupPolicy = effectivePolicy[groupName] as PolicyGroup | undefined;
    if (!groupPolicy || groupPolicy.visible === false) return false;

    const controlPolicy = groupPolicy.controls?.[controlName];
    return controlPolicy?.visible !== false;
}