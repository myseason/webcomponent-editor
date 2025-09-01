/**
 * ✨ [Policy Engine v1.1]
 * 태그/스타일/컴포넌트 정책을 기반으로 특정 노드의 허용 능력(capabilities)을 계산합니다.
 * Inspector는 이 파일의 유틸리티를 사용하여 동적으로 UI를 렌더링합니다.
 */
import {
    Project,
    Node,
    ComponentDefinition,
    EffectivePolicies,
    ProjectSettingsPoliciesOverride,
    TagPolicy,
    StylePolicy,
    NodeId, ComponentPolicy, // ✨ [추가]
} from '../core/types';
import { getDefinition } from '../core/registry';
import { GLOBAL_TAG_POLICIES } from '../policy/globalTagPolicy';
import { GLOBAL_STYLE_POLICY } from '../policy/globalStylePolicy';
import { deepMerge } from './deepMerge';

// HTML void 요소(자식 불가)
const VOID_TAGS = new Set(['img','input','br','hr','meta','link','source','track','area','param','col','base','wbr']);

/**
 * 기본 정책과 프로젝트 오버라이드를 병합하여 최종 유효 정책 객체를 생성합니다.
 * @param overrides 프로젝트에 저장된 사용자 정의 정책
 * @returns 최종적으로 적용될 EffectivePolicies 객체
 */
export function buildEffectivePolicies(
    overrides?: ProjectSettingsPoliciesOverride
): EffectivePolicies {
    const effective: EffectivePolicies = {
        tag: deepMerge({}, GLOBAL_TAG_POLICIES, overrides?.tag ?? {}) as Record<string, TagPolicy>,
        style: deepMerge({}, GLOBAL_STYLE_POLICY, overrides?.style ?? {}) as StylePolicy,
        components: deepMerge({}, {}, overrides?.components ?? {}) as Record<string, ComponentPolicy>,
    };
    return effective;
}

/**
 * 노드의 실제 렌더링 태그를 결정합니다: props.__tag -> component.defaultTag -> 'div'
 */
export function getEffectiveTag(node: Node, def?: ComponentDefinition): string {
    const p = node.props as Record<string, unknown>;
    const d = def ?? getDefinition(node.componentId);
    return (p?.__tag as string) || d?.capabilities?.defaultTag || 'div';
}

/**
 * 특정 태그에 대한 유효한 TagPolicy를 반환합니다.
 */
export function getTagPolicy(policies: EffectivePolicies, tag: string): TagPolicy | undefined {
    return policies.tag[tag];
}


/**
 * 특정 노드에 대한 모든 정책(Tag, Style, Component)이 적용된 최종 정책 객체를 반환합니다.
 * Inspector에서 가장 많이 사용될 핵심 헬퍼 함수입니다.
 * @param project 전체 프로젝트 객체
 * @param nodeId 대상 노드 ID
 * @returns 해당 노드에 적용될 모든 정책 정보
 */
export function getEffectivePoliciesForNode(project: Project, nodeId: NodeId | null) { // ✨ [수정] nodeId가 null일 수 있음을 명시
    // ✨ [추가] nodeId 유효성 검사
    if (!nodeId) return null;

    const node = project.nodes[nodeId];
    if (!node) return null;

    const def = getDefinition(node.componentId);
    if (!def) return null;

    const effectivePolicies = buildEffectivePolicies(project.policies);
    const tag = getEffectiveTag(node, def);
    const tagPolicy = getTagPolicy(effectivePolicies, tag);
    const componentPolicy = effectivePolicies.components?.[def.title];

    return {
        node,
        def,
        tag,
        effectivePolicies,
        tagPolicy,
        stylePolicy: effectivePolicies.style,
        componentPolicy,
    };
}


/**
 * 특정 노드의 Inspector에 표시될 수 있는 모든 스타일 키 목록을 반환합니다.
 * @param project 전체 프로젝트 객체
 * @param nodeId 대상 노드 ID
 * @param expertMode 전문가 모드 활성화 여부
 * @returns 허용된 스타일 키 Set
 */
export function getAllowedStyleKeysForNode(project: Project, nodeId: NodeId, expertMode: boolean): Set<string> {
    const policyInfo = getEffectivePoliciesForNode(project, nodeId);
    if (!policyInfo) return new Set();

    const { tagPolicy, stylePolicy, componentPolicy } = policyInfo;

    let allowed = new Set<string>();

    if (stylePolicy.allow?.includes('*')) {
        const allKnownKeys = Object.values(tagPolicy?.styles?.groups ?? {}).flat();
        allowed = new Set(allKnownKeys);
    } else if (stylePolicy.allow) {
        allowed = new Set(stylePolicy.allow);
    }

    stylePolicy.deny?.forEach(key => allowed.delete(key));

    const tagStylePolicy = tagPolicy?.styles;
    if (tagStylePolicy) {
        if (tagStylePolicy.allow && !tagStylePolicy.allow.includes('*')) {
            const tagAllowed = new Set(tagStylePolicy.allow);
            allowed.forEach(key => {
                if (!tagAllowed.has(key)) {
                    allowed.delete(key);
                }
            });
        }
        tagStylePolicy.deny?.forEach(key => allowed.delete(key));
    }

    const isPageBuildMode = true;
    if (isPageBuildMode && !expertMode && componentPolicy?.inspector?.controls) {
        Object.entries(componentPolicy.inspector.controls).forEach(([key, control]) => {
            if (control.visible === false) {
                allowed.delete(key);
            }
        });
    }

    return allowed;
}