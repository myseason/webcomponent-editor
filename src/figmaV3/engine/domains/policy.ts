import { EditorCore } from '../EditorCore';
import type { ComponentPolicy, StylePolicy as CoreStylePolicy } from '../../core/types';
import { getDefinition } from '../../core/registry';
import { GLOBAL_STYLE_POLICY } from '../../policy/globalStylePolicy';
import { deepMerge } from '../../runtime/deepMerge';
import { StylePolicyService } from '../../domain/policies/StylePolicyService';

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
        inspector: { controls: {} },
        defaults: {},
        runtime: {},
        savePolicy: {},
    } as ComponentPolicy;
}

export function policyDomain() {
    const R = {
        /** SSOT 반환 */
        getGlobalStylePolicy: (): CoreStylePolicy => GLOBAL_STYLE_POLICY,

        /** 노드 기준 유효 정책 (Style + Tag [+ Component]) */
        getEffectivePolicyForNode(nodeId: string): CoreStylePolicy {
            const state = EditorCore.store.getState();
            const node = state.project.nodes[nodeId];
            if (!node) throw new Error(`[policyDomain] node(${String(nodeId)}) not found`);
            return StylePolicyService.computeEffectivePolicy(state, node);
        },

        /** 특정 컨트롤 가시성 */
        getControlVisibilityForNode(nodeId: string, controlPath: string): boolean {
            const eff = R.getEffectivePolicyForNode(nodeId);
            return StylePolicyService.getControlVisibility(eff, controlPath);
        },
    } as const;

    const W = {
        /** 기존 API 유지 */
        updateComponentPolicy(componentId: string, patch: Partial<ComponentPolicy>) {
            const state = EditorCore.store.getState();
            const projectPolicies = state.project.policies?.components ?? {};
            const existingPolicy = projectPolicies[componentId];
            const def = getDefinition(componentId);

            const newPolicy = deepMerge(
                { version: '1.1', component: componentId, tag: def?.capabilities?.defaultTag ?? 'div' },
                existingPolicy ?? {},
                patch
            ) as ComponentPolicy;

            state._setComponentPolicy(componentId, newPolicy);
        },

        /** 잠금(비노출) 오버라이드 업서트 — flat controls 맵 사용 */
        upsertComponentControlVisibility(componentId: string, controlKey: string, visible: boolean) {
            const state = EditorCore.store.getState();
            const key = normalizeKey(controlKey);
            if (!key) {
                console.warn('[policyDomain] invalid controlKey:', controlKey);
                return;
            }
            const all = state.project.policies?.components ?? {};
            const curr = all[componentId] ?? ensureComponentPolicyBase(componentId);

            const next: ComponentPolicy = {
                ...curr,
                inspector: {
                    ...(curr.inspector ?? { controls: {} }),
                    controls: {
                        ...(curr.inspector?.controls ?? {}),
                        [`${key.group}.${key.control}`]: { visible }, // 저장은 "group.control" key로 평탄화
                    },
                },
            };

            state._setComponentPolicy(componentId, next);
        },
    } as const;

    return { reader: R, writer: W } as const;
}