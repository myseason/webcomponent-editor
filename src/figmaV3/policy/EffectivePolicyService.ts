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
//import { GLOBAL_TAG_POLICIY } from '../policy/globalTagPolicy';
import { GLOBAL_STYLE_POLICY } from '../policy/globalStylePolicy';
import { deepMerge } from '../runtime/deepMerge';
import { normalizeStyleKey } from './PolicyKeys';

// -------------------------------------------------------
// Build effective policies (global + project override)
// -------------------------------------------------------
export function buildEffectivePolicies(
  overrides?: ProjectSettingsPoliciesOverride
): EffectivePolicies {
  return {
    //tag: deepMerge({},, overrides?.tag ?? {}) as Record<string, TagPolicy>,
      tag: {} as Record<string, TagPolicy>,
    style: deepMerge({}, GLOBAL_STYLE_POLICY, overrides?.style ?? {}) as StylePolicy,
    components: deepMerge({}, {}, overrides?.components ?? {}) as Record<string, ComponentPolicy>,
  };
}

// -------------------------------------------------------
// Resolve tag / tagPolicy for node
// -------------------------------------------------------
export function getEffectiveTag(node: Node, def?: ComponentDefinition): string {
  const p = (node.props ?? {}) as Record<string, unknown>;
  const d = def ?? getDefinition(node.componentId);
  return (p?.__tag as string) || d?.capabilities?.defaultTag || 'div';
}

export function getTagPolicy(policies: EffectivePolicies, tag: string): TagPolicy | undefined {
  return policies.tag[tag];
}

/** Node별로 합쳐진 정책/부가정보 반환 */
export function getEffectivePoliciesForNode(
  project: Project,
  nodeId: NodeId | null
) {
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
/*
// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
function collectTagStyleKeys(tagPolicy?: TagPolicy): Set<string> {
  const set = new Set<string>();
  const groups = tagPolicy?.styles?.groups;
  if (groups) {
    Object.values(groups).forEach((arr) => arr.forEach((k) => set.add(normalizeStyleKey(k))));
  }
  // 명시적으로 allow 지정된 키가 있으면 그것도 포함
  tagPolicy?.styles?.allow?.forEach((k) => set.add(normalizeStyleKey(k)));
  return set;
}

export type AllowedStyleOptions = {

  expertMode?: boolean;

  force?: boolean;
};

// -------------------------------------------------------
// 메인: 허용 스타일 키 계산
// -------------------------------------------------------
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
      stylePolicy.allow.forEach((k) => allowed.add(normalizeStyleKey(k)));
    }
  }

  // 3) 전역/태그 deny 일괄 적용
  stylePolicy.deny?.forEach((k) => allowed.delete(normalizeStyleKey(k)));
  tagPolicy?.styles?.deny?.forEach((k) => allowed.delete(normalizeStyleKey(k)));

  // 4) 컴포넌트 정책(controls.visible === false) 적용
  //    단, force=true면 무시(=강제 공개)
  if (!force && componentPolicy?.inspector?.controls) {
    for (const [rawKey, ctl] of Object.entries(componentPolicy.inspector.controls)) {
      if (ctl?.visible === false) {
        allowed.delete(normalizeStyleKey(rawKey)); // 'styles:width'와 'width' 모두 대응
      }
    }
  }

  return allowed;
}
*/

/**
 * Phase 2에서 Inspector 교체 시 사용될 추천 API
 * - 그룹 대표 키 중 1개라도 허용이면 그룹 노출
 * - members 목록은 UI가 세부 컨트롤을 구성/정렬할 때 사용
 *
 * NOTE: 실제 UI 노출 판단은 "허용키 집합(allowed) ∩ 그룹 대표키/멤버"의 결과를 조합해 구현
 */
export function isGroupAllowed(
  allowed: Set<string>,
  normalizedRepresentativeKeys: string[]
): boolean {
  for (const k of normalizedRepresentativeKeys) {
    if (allowed.has(normalizeStyleKey(k))) return true;
  }
  return false;
}