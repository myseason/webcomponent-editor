/**
 * ✨ Policy Engine (v1.2)
 * - TagPolicy / StylePolicy / ComponentPolicy를 병합해 노드의 허용 능력(capabilities)을 산출
 * - Inspector 및 스타일 그룹 컴포넌트에서 공통 사용
 */

import {
    Project,
    Node,
    NodeId,
    ComponentDefinition,
    EffectivePolicies,
    ProjectSettingsPoliciesOverride,
    TagPolicy,
    StylePolicy,
    ComponentPolicy,
} from '../core/types';
import { getDefinition } from '../core/registry';
import { GLOBAL_TAG_POLICIES } from '../policy/globalTagPolicy';
import { GLOBAL_STYLE_POLICY } from '../policy/globalStylePolicy';
import { deepMerge } from './deepMerge';

/* -------------------------------------------------------
 * Build effective policies (global + project override)
 * ----------------------------------------------------- */
export function buildEffectivePolicies(
    overrides?: ProjectSettingsPoliciesOverride
): EffectivePolicies {
    return {
        tag: deepMerge({}, GLOBAL_TAG_POLICIES, overrides?.tag ?? {}) as Record<string, TagPolicy>,
        style: deepMerge({}, GLOBAL_STYLE_POLICY, overrides?.style ?? {}) as StylePolicy,
        components: deepMerge({}, {}, overrides?.components ?? {}) as Record<string, ComponentPolicy>,
    };
}

/* -------------------------------------------------------
 * Utility: resolve tag / tagPolicy for node
 * ----------------------------------------------------- */
export function getEffectiveTag(node: Node, def?: ComponentDefinition): string {
    const p = node.props as Record<string, unknown>;
    const d = def ?? getDefinition(node.componentId);
    return (p?.__tag as string) || d?.capabilities?.defaultTag || 'div';
}

export function getTagPolicy(policies: EffectivePolicies, tag: string): TagPolicy | undefined {
    return policies.tag[tag];
}

/** Node별로 합쳐진 정책/부가정보 반환 */
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

/* -------------------------------------------------------
 * Helpers
 * ----------------------------------------------------- */
const norm = (key: string) => {
    // 'styles:width' | 'props:title' → 'width' | 'title'
    const idx = key.indexOf(':');
    return idx >= 0 ? key.slice(idx + 1) : key;
};

const collectTagStyleKeys = (tagPolicy?: TagPolicy): Set<string> => {
    const set = new Set<string>();
    const groups = tagPolicy?.styles?.groups;
    if (groups) {
        Object.values(groups).forEach((arr) => arr.forEach((k) => set.add(k)));
    }
    // 명시적으로 allow 지정된 키가 있으면 그것도 포함
    tagPolicy?.styles?.allow?.forEach((k) => set.add(k));
    return set;
};

export type AllowedStyleOptions = {
    /** 기존 expertMode 의미 유지(광범위 허용) */
    expertMode?: boolean;
    /**
     * Page 모드에서 “TagPolicy 강제 공개” 토글에 해당
     * - true면 ComponentPolicy.inspector.controls.visible === false를 무시
     */
    force?: boolean;
};

/* -------------------------------------------------------
 * 메인: 허용 스타일 키 계산
 * ----------------------------------------------------- */
export function getAllowedStyleKeysForNode(
    project: Project,
    nodeId: NodeId,
    opts?: AllowedStyleOptions
): Set<string> {
    const policyInfo = getEffectivePoliciesForNode(project, nodeId);
    if (!policyInfo) return new Set<string>();

    const { tagPolicy, stylePolicy, componentPolicy } = policyInfo;
    const expertMode = !!opts?.expertMode;
    const force = !!opts?.force;

    // 1) 기본 후보: TagPolicy 그룹/allow 기반
    let allowed = collectTagStyleKeys(tagPolicy);

    // 2) expertMode면 태그 정책 기반으로 광범위 허용(deny는 계속 적용)
    if (expertMode) {
        // 이미 collectTagStyleKeys로 충분히 수집됨
    } else {
        // non-expert 모드에서도 전역 style.allow가 명시되어 있다면 포함
        if (stylePolicy.allow?.length) {
            stylePolicy.allow.forEach((k) => allowed.add(k));
        }
    }

    // 3) 전역/태그 deny 일괄 적용
    stylePolicy.deny?.forEach((k) => allowed.delete(k));
    tagPolicy?.styles?.deny?.forEach((k) => allowed.delete(k));

    // 4) 컴포넌트 정책(controls.visible === false) 적용
    //    단, force=true면 무시(=강제 공개)
    if (!force && componentPolicy?.inspector?.controls) {
        for (const [k, ctl] of Object.entries(componentPolicy.inspector.controls)) {
            if (ctl?.visible === false) {
                allowed.delete(norm(k)); // 'styles:width'와 'width' 모두 대응
            }
        }
    }
    return allowed;
}