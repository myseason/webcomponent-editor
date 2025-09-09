import { EditorEngineCore } from '../EditorEngineCore';
import type { ComponentPolicy } from '../../core/types';
import { getDefinition } from '../../core/registry';
import { GLOBAL_STYLE_POLICY } from '../../policy/globalStylePolicy';
import { DEFAULT_STYLE_POLICY, StylePolicy } from '../../policy/stylePresets';
import { deepMerge } from '../../runtime/deepMerge';

export function policyDomain() {
    const R = {
        getGlobalStylePolicy: (): typeof GLOBAL_STYLE_POLICY => GLOBAL_STYLE_POLICY,
        getDefaultStylePolicy: (): StylePolicy => DEFAULT_STYLE_POLICY,
        getShadowPresets: () => R.getDefaultStylePolicy().shadows.presets,
        getFilterPresets: () => R.getDefaultStylePolicy().filters.presets,
    };

    const W = {
        /**
         * 프로젝트별 컴포넌트 정책을 업데이트(병합)합니다.
         * @param componentId - 정책을 적용할 컴포넌트의 ID (e.g., 'Button')
         * @param patch - 변경할 정책 내용
         */
        updateComponentPolicy(componentId: string, patch: Partial<ComponentPolicy>) {
            const state = EditorEngineCore.store.getState();
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