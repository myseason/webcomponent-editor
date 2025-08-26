/**
 * 태그/스타일/허용태그 능력 모델 유틸
 * - 전문가 모드여도 TagPolicy/컴포넌트 capability는 항상 적용
 * - 템플릿 InspectorFilter는 전문가 모드에서 무시(표시 UX 전용)
 */
import type {
    Project,
    Node,
    TagPolicyMap,
    TagPolicy,
    InspectorFilter,
    BaseDefTagWhitelist,
    ComponentDefinition,
} from '../core/types';

// HTML void 요소(자식 불가)
const VOID_TAGS = new Set(['img','input','br','hr','meta','link','source','track','area','param','col','base','wbr']);

// MDN 요약 기반 기본 태그 정책(필요 시 지속 확장)
export const DEFAULT_TAG_POLICIES: TagPolicyMap = {
    div:    { allowedAttributes: [], styles: {} , isVoid: false },
    section:{ allowedAttributes: [], styles: {} , isVoid: false },
    span:   { allowedAttributes: [], styles: {} , isVoid: false },
    button: { allowedAttributes: ['type','disabled','name','value'], styles: {}, isVoid: false },
    a:      { allowedAttributes: ['href','target','rel','download','referrerpolicy'], styles: {}, isVoid: false },
    img:    { allowedAttributes: ['src','alt','srcset','sizes','loading','decoding','referrerpolicy'], styles: {}, isVoid: true  },
    input:  { allowedAttributes: ['type','name','value','placeholder','disabled','readonly','checked','min','max','step'], styles: {}, isVoid: true  },
};

// 베이스 컴포넌트 → 허용 태그 화이트리스트(필요 시 확장)
export const DEFAULT_BASEDEF_TAG_WHITELIST: BaseDefTagWhitelist = {
    box: ['div','section','span'],
    button: ['button','a','div'],
    image: ['img','div'],
    text: ['span','div','section'],
};

export function isContainerTag(tag: string, policy?: TagPolicy): boolean {
    const p = policy ?? DEFAULT_TAG_POLICIES[tag];
    return p ? !p.isVoid : true;
}

export function getTagPolicy(tag: string, projectOverride?: TagPolicyMap): TagPolicy | undefined {
    return (projectOverride && projectOverride[tag]) ?? DEFAULT_TAG_POLICIES[tag];
}

export function filterStyleKeysByTag(
    tag: string,
    keys: string[],
    projectOverride?: TagPolicyMap
): string[] {
    const p = getTagPolicy(tag, projectOverride);
    if (!p || !p.styles) return keys;
    const deny = new Set(p.styles.deny ?? []);
    const allow = p.styles.allow ? new Set(p.styles.allow) : null;
    return keys.filter((k) => (allow ? allow.has(k) : true) && !deny.has(k));
}

/**
 * 템플릿 필터(전문가 모드면 무시) → 태그 정책(항상 적용)의 순서로 키를 필터링
 */
export function filterStyleKeysByTemplateAndTag(
    keys: string[],
    templateFilter: InspectorFilter | undefined,
    tag: string,
    projectOverride?: TagPolicyMap,
    expertMode?: boolean
): string[] {
    let cur = keys;
    if (!expertMode && templateFilter?.styles) {
        const { allow, deny } = templateFilter.styles;
        if (allow) {
            const a = new Set(allow);
            cur = cur.filter((k) => a.has(k));
        }
        if (deny) {
            const d = new Set(deny);
            cur = cur.filter((k) => !d.has(k));
        }
    }
    cur = filterStyleKeysByTag(tag, cur, projectOverride);
    return cur;
}

export function isTagAllowedForBase(defId: string, tag: string, whitelistOverride?: BaseDefTagWhitelist): boolean {
    const wl = (whitelistOverride && whitelistOverride[defId]) ?? DEFAULT_BASEDEF_TAG_WHITELIST[defId];
    if (!wl) return true;
    return wl.includes(tag);
}

export function getAllowedTagsForBase(defId: string, whitelistOverride?: BaseDefTagWhitelist): string[] {
    const wl = (whitelistOverride && whitelistOverride[defId]) ?? DEFAULT_BASEDEF_TAG_WHITELIST[defId];
    return wl ?? ['div'];
}

/** 노드의 실제 렌더 태그: __tag → defaultTag → 'div' */
export function effectiveTag(node: Node, def?: ComponentDefinition): string {
    const p = node.props as Record<string, unknown>;
    const t = (p?.__tag as string) || def?.capabilities?.defaultTag || 'div';
    return t;
}


// 전역(글로벌) 속성은 항상 허용: id, class, data-*, aria-*
const GLOBAL_ALWAYS_ALLOWED = new Set(['id', 'class', 'className']);

/** data-/aria- 는 항상 허용 */
export function isDataOrAriaAttr(key: string): boolean {
    return key.startsWith('data-') || key.startsWith('aria-');
}

/** TagPolicy 기반 허용 여부(없으면 관대하게 true) */
export function isAttrAllowedByPolicy(
    project: Project | undefined,
    tag: string,
    key: string,
): boolean {
    // ✅ 전역 속성 우선 허용
    if (GLOBAL_ALWAYS_ALLOWED.has(key)) return true;
    if (isDataOrAriaAttr(key)) return true;

    if (!project?.tagPolicies) return true;
    const pol: TagPolicy | undefined = project.tagPolicies[tag];
    if (!pol?.allowedAttributes) return true;

    return pol.allowedAttributes.includes(key);
}

/** 렌더 직전 속성 정리(Phase1: 허용 외는 무시만 함) */
export function sanitizeAttrsForTag(
    project: Project | undefined,
    tag: string,
    attrs: Record<string, unknown>,
): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(attrs)) {
        if (typeof v !== 'string') continue; // 문자열만 허용(SSR 안전)
        if (isAttrAllowedByPolicy(project, tag, k)) out[k] = v;
    }
    return out;
}