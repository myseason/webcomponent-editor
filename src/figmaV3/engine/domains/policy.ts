import { EditorCore } from '../EditorCore';
import type { NodeId } from '../../core/types';
import { getDefinition } from '../../core/registry';
import { deepMerge } from '../../runtime/deepMerge';
import type { ComponentPolicy } from '../../core/types';

import {
    getAllowedStyleKeysForNode,
    isControlVisibleForNode,
    buildOverlayFromComponentPolicy,
} from '../../runtime/capabilities';

function normalizeKey(k: string): { group: string; control: string } | null {
    const path = k.replace(/:/g, '.');
    const parts = path.split('.');
    if (parts.length < 2) return null;
    const group = parts[0];
    const control = parts.slice(1).join('.');
    if (!group || !control) return null;
    return { group, control };
}

function ensureComponentPolicyBase(componentId: string): ComponentPolicy {
    const def = getDefinition(componentId);
    return {
        version: '1.1',
        component: componentId,
        tag: def?.capabilities?.defaultTag ?? 'div',
        inspector: { groups: {}, controls: {} },
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
            const project = EditorCore.store.getState().project;
            const ui = EditorCore.store.getState().ui;
            return getAllowedStyleKeysForNode(project, nodeId, {
                expertMode: ui?.expertMode,
                withSizeAlias: true,
            });
        },
        isControlVisible(nodeId: NodeId, controlPath: string): boolean {
            const project = EditorCore.store.getState().project;
            const ui = EditorCore.store.getState().ui;
            const comp = reader.getComponentPolicyForNode(nodeId);
            const overlay = buildOverlayFromComponentPolicy(comp);
            return isControlVisibleForNode(project, ui, nodeId, controlPath as any, {
                componentOverlay: overlay,
            });
        },
    } as const;

    const writer = {
        updateComponentPolicy(componentId: string, patch: Partial<ComponentPolicy>) {
            const state = EditorCore.store.getState();
            const currentPolicies = state.project.policies?.components ?? {};
            const existingPolicy = currentPolicies[componentId];
            const def = getDefinition(componentId);

            const newPolicy = deepMerge(
                {
                    version: '1.1',
                    component: componentId,
                    tag: def?.capabilities?.defaultTag ?? 'div',
                },
                existingPolicy ?? {},
                patch
            ) as ComponentPolicy;

            state._setComponentPolicy(componentId, newPolicy);
        },

        upsertComponentControlVisibility(componentId: string, controlKey: string, visible: boolean) {
            const state = EditorCore.store.getState();

            const key = normalizeKey(controlKey);
            if (!key) {
                console.warn('[policyDomain] invalid controlKey:', controlKey);
                return;
            }
            const flatKey = `${key.group}.${key.control}`;

            const all = state.project.policies?.components ?? {};
            const curr = all[componentId] ?? ensureComponentPolicyBase(componentId);

            const next: ComponentPolicy = {
                ...curr,
                inspector: {
                    ...(curr.inspector ?? { groups: {}, controls: {} }),
                    controls: {
                        ...(curr.inspector?.controls ?? {}),
                        [flatKey]: { visible },
                    },
                },
            };

            state._setComponentPolicy(componentId, next);
        },
    } as const;

    return { reader, writer } as const;
}