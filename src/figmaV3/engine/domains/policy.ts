import { EditorCore } from '../EditorCore';
import type { NodeId } from '../../core/types';
import { getDefinition } from '../../core/registry';
import { GLOBAL_STYLE_POLICY } from '../../policy/globalStylePolicy';
import { deepMerge } from '../../runtime/deepMerge';
import type { ComponentPolicy, StylePolicy as CoreStylePolicy } from '../../core/types';
import { DEFAULT_STYLE_PRESETS, StylePresets } from '../../policy/stylePresets';

// 정책 계산은 서비스로 위임(전역/태그/컴포넌트 병합 로직의 단일화)
import { StylePolicyService } from '../../domain/policies/StylePolicyService';

/**
 * controlKey 정규화
 * - 콜론/점 혼재를 대비하여 일괄 점(.) 표기로 변환
 *   예) "styles:layout.display" | "styles:layout:display" -> "styles.layout.display"
 */
function normalizeKey(k: string): { group: string; control: string } | null {
    const path = k.replace(/:/g, '.');
    const parts = path.split('.');
    if (parts.length < 2) return null;
    const group = parts[0];
    const control = parts.slice(1).join('.');
    if (!group || !control) return null;
    return { group, control };
}

/**
 * 컴포넌트 정책 기본 골격 보장
 */
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
    // === Reader: 읽기 전용 ===
    const R = {
        getGlobalStylePolicy: (): CoreStylePolicy => GLOBAL_STYLE_POLICY,   // SSOT
        getStylePresets: (): StylePresets => DEFAULT_STYLE_PRESETS,         // 프리셋
        getShadowPresets: () => R.getStylePresets().shadows.presets,
        getFilterPresets: () => R.getStylePresets().filters.presets,

        /**
         * 노드 기준 Effective Policy (Style + Tag [+ Component(페이지 모드/비전문가)])
         */
        getEffectivePolicyForNode(nodeId: NodeId): CoreStylePolicy {
            const state = EditorCore.store.getState();
            const node = state.project.nodes[nodeId];
            if (!node) {
                throw new Error(`[policyDomain] node(${String(nodeId)}) not found`);
            }
            return StylePolicyService.computeEffectivePolicy(state, node);
        },

        /**
         * 특정 컨트롤 가시성 조회
         * @param controlPath 예) "layout.display", "typography.fontSize", "props.__tag"
         */
        getControlVisibilityForNode(nodeId: NodeId, controlPath: string): boolean {
            const effective = R.getEffectivePolicyForNode(nodeId);
            return StylePolicyService.getControlVisibility(effective, controlPath);
        },
    } as const;

    // === Writer: 쓰기(업서트) ===
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

        /**
         * PermissionLock에서 사용하는 가벼운 API
         * - 특정 컨트롤의 visible을 오버라이드(업서트)한다.
         * - controlKey는 콜론/점 혼용을 허용하고, 내부적으로 점 표기로 통일 저장
         *
         * @param componentId 대상 컴포넌트 ID (정의 ID)
         * @param controlKey  예) "styles:layout.display" | "styles.layout.display"
         * @param visible     true/false
         */
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
                    ...(curr.inspector ?? { groups: {}, controls: {} }),
                    controls: {
                        ...(curr.inspector?.controls ?? {}),
                        [key.control]: {
                            // 단순 visible만 관리(추후 reason/lockedBy 등 확장 가능)
                            visible,
                        },
                    },
                },
            };

            state._setComponentPolicy(componentId, next);
        },
    } as const;

    return { reader: R, writer: W } as const;
}