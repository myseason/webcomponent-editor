'use client';
import type { EditorMode, Node, StylePolicy } from '@/figmaV3/core/types';
import { StylePolicyService } from '@/figmaV3/domain/policies/StylePolicyService';

export function getEffectivePolicy(node: Node, _mode: EditorMode, _expertMode: boolean): StylePolicy {
    console.warn('[policyVis] 호출부에서 EditorState가 필요한 구조로 변경되었습니다. useRightController 등으로 state를 가져와 StylePolicyService.computeEffectivePolicy(state, node)를 직접 사용하세요.');
    return {} as unknown as StylePolicy;
}

export function getGroupVisibility(effectivePolicy: StylePolicy, groupName: keyof StylePolicy): boolean {
    return StylePolicyService.getGroupVisibility(effectivePolicy, groupName);
}

export function getControlVisibility(effectivePolicy: StylePolicy, controlPath: string): boolean {
    return StylePolicyService.getControlVisibility(effectivePolicy, controlPath);
}