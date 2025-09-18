// engine/domains/policy.ts
// - store 접근은 EditorCore.store 내부 메서드로만 수행 (컨트롤러는 호출 금지)
// - 기존 패턴 유지: reader / writer 쌍 반환

import { EditorCore } from '../EditorCore';
import type { NodeId, ComponentPolicy, StyleGroupKey } from '../../core/types';
import { getDefinition } from '../../core/registry';
import { deepMerge } from '../../runtime/deepMerge';
import { isControlVisibleForNode, getAllowedStyleKeysForNode } from '../../runtime/capabilities';
import { KEY_TO_STYLEGROUP, normalizeControlPathToKey } from '../../policy/StyleGroupKeys';

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

export function policyDomain() {
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
            return getAllowedStyleKeysForNode(state.project as any, nodeId, { expertMode: state.ui?.expertMode });
        },

        isControlVisible(nodeId: NodeId, controlPath: string): boolean {
            const state = EditorCore.store.getState();
            return isControlVisibleForNode(state.project as any, state.ui as any, nodeId, controlPath as any);
        },

        getAllowedStyleKeysByGroup(nodeId: NodeId, groupKey: StyleGroupKey): Set<string> {
            const state = EditorCore.store.getState();
            const keys = Object.keys(KEY_TO_STYLEGROUP).filter(k => KEY_TO_STYLEGROUP[k] === groupKey);
            const visible = keys.filter(k => isControlVisibleForNode(state.project as any, state.ui as any, nodeId, `styles:${k}` as any));
            return new Set(visible);
        },

        isStyleGroupVisible(nodeId: NodeId, groupKey: StyleGroupKey): boolean {
            return this.getAllowedStyleKeysByGroup(nodeId, groupKey).size > 0;
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
    } as const;

    return { reader, writer } as const;
}