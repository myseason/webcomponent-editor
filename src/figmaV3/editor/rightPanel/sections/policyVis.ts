'use client';

import type { EditorMode, Node, StylePolicy } from '@/figmaV3/core/types';
import { StylePolicyService } from '@/figmaV3/domain/policies/StylePolicyService';

/**
 * 노드 기준 최종 정책 계산
 * (기존 시그니처 호환 유지)
 */
export function getEffectivePolicy(
    node: Node,
    mode: EditorMode,
    expertMode: boolean,
    componentPolicyIgnored?: unknown // 호환 자리 (더이상 직접 사용하지 않음)
): StylePolicy {
    // policyVis.ts는 더이상 상태를 직접 모르므로, 호출부에서 EditorStoreState를 가진
    // 컨텍스트를 통해 StylePolicyService.computeEffectivePolicy가 호출되는 형태가 일반적입니다.
    // 현 파일은 기존 API 유지/호환을 위해 "계산된 결과"를 인자로 받는 패턴으로 쓰이던 곳이 있으므로,
    // 실제 사용처에서는 service를 통해 주입하도록 권장합니다.
    // 단독 함수가 필요한 기존 사용처를 위해 아래 래퍼를 둡니다.
    // => 실제 구현은 각 섹션/인스펙터에서 Service를 통해 state를 넘겨 호출하는 쪽으로 점진 이관하세요.
    console.warn(
        '[policyVis] getEffectivePolicy가 직접 상태를 모르므로, 호출부에서 StylePolicyService.computeEffectivePolicy(state, node)를 사용해 주세요.'
    );
    // 호출부 호환을 위해 최소 반환: 컴파일 목적으로는 group/controls 체크 함수와 합쳐 쓰입니다.
    // 외부에서 실제 effectivePolicy를 만들어 넘기는 패턴으로 전환을 권장합니다.
    return {} as unknown as StylePolicy;
}

/**
 * 그룹 가시성 판단
 */
export function getGroupVisibility(effectivePolicy: StylePolicy, groupName: keyof StylePolicy): boolean {
    return StylePolicyService.getGroupVisibility(effectivePolicy, groupName);
}

/**
 * 컨트롤 가시성 판단
 */
export function getControlVisibility(effectivePolicy: StylePolicy, controlPath: string): boolean {
    return StylePolicyService.getControlVisibility(effectivePolicy, controlPath);
}