import { EditorCore } from '../EditorCore';
import type { ComponentPolicy, StylePolicy as CoreStylePolicy } from '../../core/types';
import { getDefinition } from '../../core/registry';
import { GLOBAL_STYLE_POLICY } from '../../policy/globalStylePolicy';
import { DEFAULT_STYLE_POLICY, StylePolicy } from '../../policy/stylePresets';
import { deepMerge } from '../../runtime/deepMerge';

export function policyDomain() {
    const R = {
        getGlobalStylePolicy: (): CoreStylePolicy => GLOBAL_STYLE_POLICY,
        getDefaultStylePolicy: (): StylePolicy => DEFAULT_STYLE_POLICY,
        getShadowPresets: () => R.getDefaultStylePolicy().shadows.presets,
        getFilterPresets: () => R.getDefaultStylePolicy().filters.presets,
    };

    const W = {
        /**
         * 컴포넌트 개발 모드에서 특정 스타일 컨트롤을 잠급니다 (비노출 처리).
         * @param componentId - 정책을 적용할 컴포넌트의 ID
         * @param controlPath - 잠글 컨트롤의 경로 (예: 'layout.display')
         */
        lockStyleControl(componentId: string, controlPath: string) {
            const state = EditorCore.store.getState();
            const projectPolicies = state.project.policies?.components ?? {};
            const existingPolicy = projectPolicies[componentId];
            const def = getDefinition(componentId);

            const [groupName, controlName] = controlPath.split('.');
            if (!groupName || !controlName) return;

            const lockPolicy = {
                inspector: {
                    [groupName]: {
                        controls: {
                            [controlName]: {
                                visible: false,
                            },
                        },
                    },
                },
            };

            // ✅ ComponentPolicy의 필수 속성을 포함하는 기본 객체와 함께 병합합니다.
            const newPolicy = deepMerge(
                {
                    version: '1.1',
                    component: componentId,
                    tag: def?.capabilities?.defaultTag ?? 'div',
                },
                existingPolicy ?? {},
                lockPolicy
            ) as ComponentPolicy;

            state._setComponentPolicy(componentId, newPolicy);
        },

        updateComponentPolicy(componentId: string, patch: Partial<ComponentPolicy>) {
            const state = EditorCore.store.getState();
            const projectPolicies = state.project.policies?.components ?? {};
            const existingPolicy = projectPolicies[componentId];
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
    };

    return { reader: R, writer: W } as const;
}