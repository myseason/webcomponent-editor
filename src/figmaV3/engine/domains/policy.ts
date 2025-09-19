import { EditorCore } from '../EditorCore';
import type {
    NodeId,
    ComponentPolicy,
    StyleGroupKey,
    TagName,
    Project,
} from '../../core/types';
import { getDefinition } from '../../core/registry';
import { deepMerge } from '../../runtime/deepMerge';
import {
    isControlVisibleForNode,
    getAllowedStyleKeysForNode,
} from '../../runtime/capabilities';
import {
    KEY_TO_STYLEGROUP,
    normalizeControlPathToKey,
} from '../../policy/StyleGroupKeys';
import { GLOBAL_TAG_POLICY } from '../../policy/globalTagPolicy';

/** ComponentPolicy 기본 베이스 보장 */
function ensureComponentPolicyBase(componentId: string): ComponentPolicy {
    const def = getDefinition(componentId);
    return {
        version: '1.1',
        component: componentId,
        tag: def?.capabilities?.defaultTag ?? 'div',
        inspector: {},
        defaults: {},
        runtime: {},
        savePolicy: {},
    } as ComponentPolicy;
}

// 🔧 보강: 어떤 iterable도 string[]로
function toStringArray(v: unknown): string[] {
    if (!v) return [];
    if (Array.isArray(v)) return v.map(String);
    if (typeof v === 'string') return [v];
    try {
        if ((v as any)[Symbol.iterator]) return Array.from(v as Iterable<any>).map(String);
    } catch {}
    return [];
}

// 🔧 보강: propsSchema 내부 select.options → string[] 로 변환
function optionsToStringArray(options: any[]): string[] {
    return (options ?? [])
        .map(op =>
            typeof op === 'string'
                ? op
                : String(op?.value ?? op?.label ?? '')
        )
        .filter(Boolean);
}

/**
 * propsSchema(키: '__tag' | 'as' | 'tag') > definition.capabilities > global policy
 * Box(컨테이너) 외에는 'div' 제외. 항상 string[] 반환.
 */
function computeSelectableTagsForNode(project: Project, nodeId: NodeId): TagName[] {
    const node: any = project?.nodes?.[nodeId];
    if (!node)
        return ['span']; // 안전 폴백

    const def = getDefinition(node.componentId);
    const compId = def?.id ?? node.componentId;
    const isBox = (compId ?? '').toLowerCase() === 'box';

    // 1) propsSchema 우선 (키 후보: '__tag' | 'as' | 'tag' | 'Tag')
    const schema = (def as any)?.propsSchema as any[] | undefined;
    const schemaTag = schema?.find(
        f =>
            f?.key &&
            ['__tag', 'as', 'tag', 'Tag'].includes(String(f.key)) &&
            (f?.type === 'select' || f?.control === 'select') &&
            Array.isArray(f?.options) &&
            f.options.length > 0
    );
    if (schemaTag) {
        const fromSchema = optionsToStringArray(schemaTag.options);
        const filtered = isBox ? fromSchema : fromSchema.filter(t => t !== 'div');
        const final = (filtered.length ? filtered : (isBox ? ['div'] : ['span'])) as TagName[];
        return final;
    }

    // 2) Definition.capabilities
    const fromDef = toStringArray((def as any)?.capabilities?.allowedTags);
    const defDefault = String((def as any)?.capabilities?.defaultTag ?? '');

    let candidates = fromDef.length > 0 ? fromDef : (defDefault ? [defDefault] : []);

    // 3) 글로벌 폴백
    if (candidates.length === 0) {
        const globalAllowed = toStringArray(GLOBAL_TAG_POLICY?.allowedTags);
        candidates = globalAllowed.length ? globalAllowed : ['span'];
    }

    // 4) Box 외에는 div 제외
    if (!isBox)
        candidates = candidates.filter(t => t !== 'div');

    // 5) (스키마 없을 때만) 글로벌 허용 교차
    const allowedSet = new Set(toStringArray(GLOBAL_TAG_POLICY?.allowedTags));
    const result = allowedSet.size ? candidates.filter(t => allowedSet.has(t)) : candidates;

    return (result.length ? result : (isBox ? ['div'] : ['span'])) as TagName[];
}

export function policyDomain() {

    console.debug('[policyDomain] installed/loaded');

    const reader = {
        getComponentPolicy(componentId: string) {
            const state = EditorCore.store.getState();
            return state.project?.policies?.components?.[componentId];
        },

        getComponentPolicyForNode(nodeId: NodeId) {
            const state = EditorCore.store.getState();
            const node: any = state.project?.nodes?.[nodeId];
            const compId = node?.componentId;
            return compId ? state.project?.policies?.components?.[compId] : undefined;
        },

        getAllowedKeys(nodeId: NodeId): Set<string> {
            const state = EditorCore.store.getState();
            const keys = getAllowedStyleKeysForNode(
                state.project as any,
                nodeId,
                { expertMode: state.ui?.expertMode }
            );
            // string[] / Set<string> 모두 대응
            return Array.isArray(keys) ? new Set(keys) : (keys ?? new Set<string>());
        },

        isControlVisible(nodeId: NodeId, controlPath: string): boolean {
            const state = EditorCore.store.getState();
            return isControlVisibleForNode(
                state.project as any,
                state.ui as any,
                nodeId,
                controlPath as any
            );
        },

        getAllowedStyleKeysByGroup(nodeId: NodeId, groupKey: StyleGroupKey): Set<string> {
            const state = EditorCore.store.getState();
            const keys = Object.keys(KEY_TO_STYLEGROUP).filter(
                (k) => KEY_TO_STYLEGROUP[k] === groupKey
            );
            const visible = keys.filter((k) =>
                isControlVisibleForNode(
                    state.project as any,
                    state.ui as any,
                    nodeId,
                    `styles:${k}` as any
                )
            );
            return new Set(visible);
        },

        isStyleGroupVisible(nodeId: NodeId, groupKey: StyleGroupKey): boolean {
            return this.getAllowedStyleKeysByGroup(nodeId, groupKey).size > 0;
        },

        /** 선택 가능한 태그( propsSchema 우선 → TagPolicy fallback → Box 외 div 제외 ) */
        getSelectableTagsForNode(nodeId: NodeId): TagName[] {

            console.log('policy.getSelectableTagsForNode : ', nodeId);
            const state = EditorCore.store.getState();
            const project = state.project;
            return computeSelectableTagsForNode(project, nodeId);
        },
    } as const;

    const writer = {
        updateComponentPolicy(componentId: string, patch: Partial<ComponentPolicy>) {
            const state = EditorCore.store.getState();
            const currentPolicies = state.project.policies?.components ?? {};
            const existingPolicy = currentPolicies[componentId];
            const def = getDefinition(componentId);

            const next = deepMerge(
                {
                    version: '1.1',
                    component: componentId,
                    tag: def?.capabilities?.defaultTag ?? 'div',
                },
                existingPolicy ?? {},
                patch
            ) as ComponentPolicy;

            state._setComponentPolicy(componentId, next);
        },

        upsertComponentControlVisibility(componentId: string, controlPath: string, visible: boolean) {
            const state = EditorCore.store.getState();

            const flatKey = normalizeControlPathToKey(controlPath);
            if (!flatKey) {
                console.warn('[policyDomain] invalid controlPath:', controlPath);
                return;
            }

            const groupKey = KEY_TO_STYLEGROUP[flatKey] as StyleGroupKey | undefined;
            if (!groupKey) {
                console.warn('[policyDomain] unknown style key (no group mapping):', flatKey);
                return;
            }

            const all = state.project.policies?.components ?? {};
            const curr = all[componentId] ?? ensureComponentPolicyBase(componentId);
            const currGroup = (curr.inspector ?? {})[groupKey] ?? {};

            const next: ComponentPolicy = {
                ...curr,
                inspector: {
                    ...(curr.inspector ?? {}),
                    [groupKey]: {
                        ...currGroup,
                        controls: {
                            ...(currGroup as any).controls ?? {},
                            [flatKey]: { visible },
                        },
                    },
                },
            };

            state._setComponentPolicy(componentId, next);
        },

        upsertComponentGroupVisibility(componentId: string, groupKey: StyleGroupKey, visible: boolean) {
            const state = EditorCore.store.getState();

            const all = state.project.policies?.components ?? {};
            const curr = all[componentId] ?? ensureComponentPolicyBase(componentId);

            const next: ComponentPolicy = {
                ...curr,
                inspector: {
                    ...(curr.inspector ?? {}),
                    [groupKey]: {
                        ...((curr.inspector ?? {})[groupKey] ?? {}),
                        visible,
                    },
                },
            };

            state._setComponentPolicy(componentId, next);
        },

        /** alias: setStyleGroupVisibility (기존 호출자 호환용) */
        setStyleGroupVisibility(componentId: string, groupKey: StyleGroupKey, visible: boolean) {
            this.upsertComponentGroupVisibility(componentId, groupKey, visible);
        },
    } as const;

    return { reader, writer } as const;
}