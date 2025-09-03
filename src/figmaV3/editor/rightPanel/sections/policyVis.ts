'use client';

import { useMemo, useCallback } from 'react';
import { useEditor } from '../../useEditor';
import { getDefinition } from '../../../core/registry';
import type { NodeId } from '../../../core/types';
import type { ComponentInspectorPolicyV2, InspectorModePolicy } from '../../../policy/types.local';

type AllowSpec = {
    allowAllProps: boolean;
    allowProps: Set<string>;
    denyProps: Set<string>;
    allowAllStyles: boolean;
    allowStyles: Set<string | '*'>;
    denyStyles: Set<string>;
};

export const RESERVED_PROP_KEYS = new Set([
    'as',
    'href',
    'tag',
    '__tag',
    '__tagAttrs',
    'id',
    'name',
    'slotId',
]);

/** 프로젝트에서 컴포넌트 정책(v2)을 읽기 */
function getComponentPolicyV2(project: any, defTitle?: string): ComponentInspectorPolicyV2 | undefined {
    if (!defTitle) return undefined;
    return project?.policies?.components?.[defTitle] as ComponentInspectorPolicyV2 | undefined;
}

/** 기존 동작 보존을 위한 안전 기본값(정책이 없으면 모두 허용) */
function defaultsForMode(expertMode: boolean): InspectorModePolicy {
    // 기본 동작 보존:
    // - basic: 기존처럼 대부분 노출되므로 allowAll처럼 동작
    // - expert: 당연히 모두 노출
    return expertMode
        ? { allowAllInExpert: true }
        : { allowAllInExpert: true }; // 정책 미지정 시 basic에서도 기존 동작 유지(= 거의 모두 보임)
}

/** 모드별 허용 스펙 구성 */
function buildAllowSpec(policy: ComponentInspectorPolicyV2 | undefined, expertMode: boolean): AllowSpec {
    const modes = policy?.modes ?? {};
    const basic = modes.basic ?? defaultsForMode(false);
    const expert = modes.expert ?? defaultsForMode(true);

    const modePol = expertMode ? expert : basic;

    const allowAll =
        expertMode
            ? modePol.allowAllInExpert !== false // undefined/true => 전부 허용
            : // basic에서는 정책 없으면 전부 허용과 유사하게 둬서 회귀 방지
            modePol.allowProps === undefined && modePol.allowStyles === undefined;

    return {
        allowAllProps: allowAll,
        allowProps: new Set(modePol.allowProps ?? []),
        denyProps: new Set(modePol.denyProps ?? []),
        allowAllStyles: allowAll,
        allowStyles: new Set((modePol.allowStyles ?? []) as (string | '*')[]),
        denyStyles: new Set(modePol.denyStyles ?? []),
    };
}

/** 태그 기반 무효 속성 필터 (현 시나리오 유지) */
export function useTagBasedPropFilter(defTitle: string | undefined, selTag: string) {
    return useCallback(
        (key: string) => {
            // 예시: Image인데 img가 아니면 src/alt 숨김
            if (defTitle === 'Image' && selTag !== 'img') {
                if (key === 'src' || key === 'alt') return false;
            }
            // (TODO) globalTagPolicy를 읽어 태그별 합법 attribute만 허용하도록 확장 가능
            return true;
        },
        [defTitle, selTag]
    );
}

/** Prop 표시 여부 훅 */
export function usePropVisibility(nodeId: NodeId, defId: string) {
    const { project, ui } = useEditor();
    const def = getDefinition(defId);
    const node = project.nodes[nodeId];

    // 선택 태그: 명시된 __tag 또는 기본 태그
    const selectedTag: string =
        (node?.props?.__tag as string) ||
        (def as any)?.capabilities?.defaultTag ||
        'div';

    const compPol = getComponentPolicyV2(project, def?.title);
    const allowSpec = useMemo(() => buildAllowSpec(compPol, !!ui.expertMode), [compPol, ui.expertMode]);

    const tagOk = useTagBasedPropFilter(def?.title, selectedTag);

    const isVisibleProp = useCallback(
        (key: string) => {
            // 0) 예약 키는 여기서 렌더하지 않음
            if (RESERVED_PROP_KEYS.has(key)) return false;

            // 1) 태그 기반 불가 항목 제거
            if (!tagOk(key)) return false;

            // 2) 컴포넌트 v2 정책
            //    - allowAllProps: 기본적으로 모두 허용하되 deny는 숨김
            if (allowSpec.allowAllProps) {
                if (allowSpec.denyProps.has(key)) return false;
                return true;
            }

            //    - allow 목록이 지정된 경우 해당 키만 허용
            if (allowSpec.allowProps.size > 0) {
                return allowSpec.allowProps.has(key);
            }

            //    - allow 미지정: 기본 동작 보존 위해 보이게 둠
            return true;
        },
        [allowSpec, tagOk]
    );

    return { isVisibleProp, selectedTag };
}

/** Style 표시 여부 훅 */
export function useStyleVisibility(nodeId: NodeId, defId: string) {
    const { project, ui } = useEditor();
    const def = getDefinition(defId);

    const compPol = getComponentPolicyV2(project, def?.title);
    const allowSpec = useMemo(() => buildAllowSpec(compPol, !!ui.expertMode), [compPol, ui.expertMode]);

    const matchesAllow = useCallback(
        (key: string) => {
            if (allowSpec.allowAllStyles) {
                // 전부 허용하되 deny면 숨김
                if (allowSpec.denyStyles.has(key)) return false;
                return true;
            }
            if (allowSpec.allowStyles.has('*')) {
                // 와일드카드 허용 (deny는 여전히 우선)
                if (allowSpec.denyStyles.has(key)) return false;
                return true;
            }
            if (allowSpec.allowStyles.size > 0) {
                if (allowSpec.denyStyles.has(key)) return false;
                return allowSpec.allowStyles.has(key);
            }
            // allow 미지정: 기본 동작 보존 위해 보이게 둠
            return true;
        },
        [allowSpec]
    );

    const isVisibleStyleKey = useCallback((key: string) => matchesAllow(key), [matchesAllow]);

    return { isVisibleStyleKey };
}