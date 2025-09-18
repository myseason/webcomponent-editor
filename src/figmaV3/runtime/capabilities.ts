// - 순수 함수. 어떤 store도 접근하지 않음.
// - 정책 우선순위: TagPolicy → GlobalStylePolicy → (페이지-기본일 때만) ComponentPolicy
import type {ProjectLike, UIStateLike, StyleGroupKey, StyleKey, TagName} from '../core/types';
import { GLOBAL_TAG_POLICY } from '../policy/globalTagPolicy';
import { GLOBAL_STYLE_POLICY } from '../policy/globalStylePolicy';
import { KEY_TO_STYLEGROUP } from '../policy/StyleGroupKeys';

// 'styles:group.key' | 'styles:key' | 'key' → 'key'
function normalizeControlPathToKey(path: string): StyleKey | null {
    if (!path) return null;
    const norm = path.replace(/:/g, '.');
    const parts = norm.split('.');
    if (parts[0] === 'styles') {
        if (parts.length === 2) return parts[1];
        if (parts.length >= 3) return parts.slice(2).join('.');
        return null;
    }
    return path;
}

function isTagName(x: string): x is TagName {
    // SSOT: GLOBAL_TAG_POLICY.allowedTags를 신뢰해 런타임 가드
    return (GLOBAL_TAG_POLICY.allowedTags as string[]).includes(x);
}

function getNode(project: ProjectLike, nodeId: string) {
    return project?.nodes?.[nodeId] ?? null;
}

function getTag(project: ProjectLike, nodeId: string): TagName {
    const n = getNode(project, nodeId);
    const raw = (n?.props?.__tag as string) ?? GLOBAL_TAG_POLICY.defaultTag ?? 'div';
    return isTagName(raw) ? raw : 'div';
}

function tagAllowsGroup(tag: TagName, group: StyleGroupKey): boolean {
    const map = GLOBAL_TAG_POLICY.allowedSectionsByTag;
    // TS7053 방지: tag는 이제 TagName
    const arr = map[tag];
    return Array.isArray(arr) ? arr.includes(group) : false;
}

function styleAllowedByGlobal(tag: TagName, key: string): boolean {
    // deny 우선
    if (GLOBAL_STYLE_POLICY.deny?.includes(key)) return false;
    if (GLOBAL_STYLE_POLICY.byTag?.[tag]?.deny?.includes(key)) return false;

    if (GLOBAL_STYLE_POLICY.allow?.includes(key)) return true;
    if (GLOBAL_STYLE_POLICY.byTag?.[tag]?.allow?.includes(key)) return true;

    return false;
}

function componentPolicyHidden(project: ProjectLike, nodeId: string, key: string, group: StyleGroupKey, ui: UIStateLike): boolean {
    const isPageBasic = ui?.mode === 'page' && !ui?.expertMode;
    if (!isPageBasic) return false; // 페이지-고급/컴포넌트 모드는 CP 무시

    const n = getNode(project, nodeId);
    const compId = n?.componentId;
    if (!compId) return false;
    const cp = project?.policies?.components?.[compId];
    if (!cp?.inspector) return false;

    const gvis = cp.inspector[group]?.visible;
    if (gvis === false) return true; // 그룹 숨김 시 전부 숨김

    const cvis = cp.inspector[group]?.controls?.[key]?.visible;
    if (cvis === false) return true;

    return false;
}

export function getAllowedStyleKeysForNode(
    project: ProjectLike,
    nodeId: string,
    opts?: { expertMode?: boolean }
): Set<string> {
    const tag = getTag(project, nodeId);
    const keys = Object.keys(KEY_TO_STYLEGROUP);
    // ui.expertMode만 넘어온 경우를 고려해 내부 ui 작성
    const ui: UIStateLike = { mode: 'page', expertMode: !!opts?.expertMode };

    const allowed: string[] = [];
    for (const key of keys) {
        const group = KEY_TO_STYLEGROUP[key] as StyleGroupKey;

        if (!tagAllowsGroup(tag, group)) continue;
        if (!styleAllowedByGlobal(tag, key)) continue;
        if (componentPolicyHidden(project, nodeId, key, group, ui)) continue;

        allowed.push(key);
    }
    return new Set(allowed);
}

export function isControlVisibleForNode(
    project: ProjectLike,
    ui: UIStateLike,
    nodeId: string,
    controlPath: string
): boolean {
    const key = normalizeControlPathToKey(controlPath);
    if (!key) return false;

    const tag = getTag(project, nodeId);
    const group = KEY_TO_STYLEGROUP[key] as StyleGroupKey | undefined;
    if (!group) return false;

    if (!tagAllowsGroup(tag, group)) return false;
    if (!styleAllowedByGlobal(tag, key)) return false;
    if (componentPolicyHidden(project, nodeId, key, group, ui)) return false;

    return true;
}