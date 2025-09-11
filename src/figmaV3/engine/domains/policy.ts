
import { deepMerge } from '../../runtime/deepMerge';

import { EditorCore } from '../EditorCore';
import type { ComponentPolicy, TagPolicy, StylePolicy } from '../../core/types';
import { getDefinition } from '../../core/registry';
import { GLOBAL_STYLE_POLICY } from '../../policy/globalStylePolicy';
import { DEFAULT_STYLE_POLICY } from '../../policy/stylePresets';
import { GLOBAL_TAG_POLICIES } from '@/figmaV3/policy/globalTagPolicy';

export function policyDomain() {
    const R = {
        //getGlobalStylePolicy: (): typeof GLOBAL_STYLE_POLICY => GLOBAL_STYLE_POLICY,
        //getDefaultStylePolicy: (): StylePolicy => DEFAULT_STYLE_POLICY,
        //getShadowPresets: () => R.getDefaultStylePolicy().shadows.presets,
        //getFilterPresets: () => R.getDefaultStylePolicy().filters.presets,

        // [ADD] Default + Global + ProjectOverride → Effective StylePolicy
        getEffectiveStylePolicy(): StylePolicy {
            const s = EditorCore.store.getState();
            const projectOverride = (s.project.policies?.style ?? {}) as Partial<StylePolicy>;
            return deepMerge({}, DEFAULT_STYLE_POLICY, GLOBAL_STYLE_POLICY, projectOverride) as StylePolicy;
        },

        // [ADD] Global + ProjectOverride → Effective TagPolicy
        getEffectiveTagPolicy(tag: string): TagPolicy | undefined {
            const s = EditorCore.store.getState();
            const base = (GLOBAL_TAG_POLICIES as Record<string, TagPolicy | undefined>)[tag];
            const proj = (s.project.policies?.tag?.[tag] ?? s.project.tagPolicies?.[tag]) as Partial<TagPolicy> | undefined;
            if (!base && !proj) return undefined;
            return deepMerge({}, base ?? {}, proj ?? {}) as TagPolicy;
        },

        // [ADD] Definition + Project.components[defId] → Effective ComponentPolicy
        getEffectiveComponentPolicy(defId: string): ComponentPolicy | undefined {
            const s = EditorCore.store.getState();
            const def = getDefinition(defId);
            const proj = s.project.policies?.components?.[defId] as Partial<ComponentPolicy> | undefined;
            if (!def && !proj) return undefined;
            const seed: ComponentPolicy = {
                version: '1.1',
                component: defId,
                tag: def?.capabilities?.defaultTag ?? 'div',
                inspector: {},
                defaults: {},
                runtime: {},
                savePolicy: {},
            };
            return deepMerge({}, seed, proj ?? {}) as ComponentPolicy;
        },

        // [ADD] (선택) Inspector 초기화 등에 쓰는 스냅샷
        getEffectivePolicies(): { style: StylePolicy; tag: Record<string, TagPolicy> } {
            const style = R.getEffectiveStylePolicy();
            const tag: Record<string, TagPolicy> = {};
            for (const k of Object.keys(GLOBAL_TAG_POLICIES)) {
                const eff = R.getEffectiveTagPolicy(k);
                if (eff) tag[k] = eff;
            }
            return { style, tag };
        },
    };

    const W = {
        /**
         * 프로젝트별 컴포넌트 정책을 업데이트(병합)합니다.
         * @param componentId - 정책을 적용할 컴포넌트의 ID (e.g., 'Button')
         * @param patch - 변경할 정책 내용
         */
        updateComponentPolicy(componentId: string, patch: Partial<ComponentPolicy>) {
            const state = EditorCore.store.getState();
            const currentPolicies = state.project.policies?.components ?? {};
            const existingPolicy = currentPolicies[componentId];
            const def = getDefinition(componentId);

            // deepMerge의 결과물이 ComponentPolicy 타입임을 명시적으로 단언합니다.
            const newPolicy = deepMerge(
                {
                    version: '1.1',
                    component: componentId,
                    tag: def?.capabilities?.defaultTag ?? 'div',
                },
                existingPolicy ?? {},
                patch
            ) as ComponentPolicy; // ✅ 타입 단언 추가로 오류 해결

            // 타입이 보장된 newPolicy 객체를 setter에 전달합니다.
            state._setComponentPolicy(componentId, newPolicy);
        },
    };

    return { reader: R, writer: W } as const;
}