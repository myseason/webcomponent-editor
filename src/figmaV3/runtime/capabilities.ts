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
    NodeId, ComponentPolicy,
} from '../core/types';
import { getDefinition } from '../core/registry';
import { GLOBAL_TAG_POLICIES } from '../policy/globalTagPolicy';
import { GLOBAL_STYLE_POLICY } from '../policy/globalStylePolicy';
import { deepMerge } from './deepMerge';

// ... (buildEffectivePolicies, getEffectiveTag, getTagPolicy, getEffectivePoliciesForNode 함수는 변경 없음)
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

export function getEffectiveTag(node: Node, def?: ComponentDefinition): string {
    const p = node.props as Record<string, unknown>;
    const d = def ?? getDefinition(node.componentId);
    return (p?.__tag as string) || d?.capabilities?.defaultTag || 'div';
}

export function getTagPolicy(policies: EffectivePolicies, tag: string): TagPolicy | undefined {
    return policies.tag[tag];
}

export function getEffectivePoliciesForNode(project: Project, nodeId: NodeId | null) {
    if (!nodeId) return null;
    const node = project.nodes[nodeId];
    if (!node) return null;
    const def = getDefinition(node.componentId);
    if (!def) return null;

    const effectivePolicies = buildEffectivePolicies(project.policies);
    const tag = getEffectiveTag(node, def);
    const tagPolicy = getTagPolicy(effectivePolicies, tag);
    const componentPolicy = effectivePolicies.components?.[def.id];

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

    // ✅ [수정] 전문가 모드일 경우, TagPolicy에 정의된 모든 스타일 키를 반환하도록 로직 변경
    // 이렇게 함으로써 Box와 같은 기본 컨테이너가 모든 스타일 옵션을 가질 수 있도록 보장합니다.
    if (expertMode) {
        const allKeys = new Set<string>();
        if (tagPolicy?.styles?.groups) {
            Object.values(tagPolicy.styles.groups).forEach(groupKeys => {
                groupKeys.forEach(key => allKeys.add(key));
            });
        }
        // TagPolicy에 allow가 '*'로 되어 있다면 모든 키를 허용해야 하지만,
        // 현재 구조에서는 groups를 사용하는 것이 더 명시적이므로 groups를 기준으로 합니다.
        // 만약 groups에 없는 키도 허용하려면 이 부분에 추가 로직이 필요합니다.
        if (tagPolicy?.styles?.allow?.includes('*')) {
            // 이 경우, 모든 가능한 CSS 속성을 추가해야 하지만, 현실적으로 어렵습니다.
            // 따라서 groups에 모든 편집 가능한 속성을 정의하는 것이 중요합니다.
        }
        stylePolicy.deny?.forEach(key => allKeys.delete(key));
        tagPolicy?.styles?.deny?.forEach(key => allKeys.delete(key));
        return allKeys;
    }

    // --- 기본 모드 (페이지 빌더) ---
    let allowed = new Set<string>();
    if (stylePolicy.allow?.includes('*')) {
        // TagPolicy에 정의된 모든 키를 기본 허용 목록으로 시작
        if (tagPolicy?.styles?.groups) {
            Object.values(tagPolicy.styles.groups).flat().forEach(key => allowed.add(key));
        }
    } else if (stylePolicy.allow) {
        allowed = new Set(stylePolicy.allow);
    }

    // 전역 deny 적용
    stylePolicy.deny?.forEach(key => allowed.delete(key));

    // 태그별 deny 적용
    tagPolicy?.styles?.deny?.forEach(key => allowed.delete(key));

    // 컴포넌트 정책(visible: false)으로 최종 필터링
    if (componentPolicy?.inspector?.controls) {
        Object.entries(componentPolicy.inspector.controls).forEach(([key, control]) => {
            if (control.visible === false) {
                // key가 'props:propName' 또는 'styles:styleName' 형식이므로 분리
                const [type, name] = key.split(':');
                if (type === 'styles') {
                    allowed.delete(name);
                }
            }
        });
    }

    return allowed;
}