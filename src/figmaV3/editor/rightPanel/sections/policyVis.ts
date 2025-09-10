'use client';

import {useCallback, useMemo} from 'react';
import {getDefinition} from '../../../core/registry';
import type {NodeId} from '../../../core/types';
import type {ComponentInspectorPolicyV2, InspectorModePolicy} from '../../../policy/types.local';
import {RightDomain, useRightControllerFactory} from '../../../controllers/right/RightControllerFactory';

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
    return expertMode ? { allowAllInExpert: true } : { allowAllInExpert: true };
}

/** 모드별 허용 스펙 구성 */
function buildAllowSpec(policy: ComponentInspectorPolicyV2 | undefined, expertMode: boolean): AllowSpec {
    const modes = policy?.modes ?? {};
    const basic = modes.basic ?? defaultsForMode(false);
    const expert = modes.expert ?? defaultsForMode(true);

    const modePol = expertMode ? expert : basic;

    const allowAll =
        expertMode
            ? modePol.allowAllInExpert !== false
            : modePol.allowProps === undefined && modePol.allowStyles === undefined;

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
            if (defTitle === 'Image' && selTag !== 'img') {
                if (key === 'src' || key === 'alt') return false;
            }
            return true;
        },
        [defTitle, selTag]
    );
}

/** Prop 표시 여부 훅 */
export function usePropVisibility(nodeId: NodeId, defId: string) {
    const { reader, writer } = useRightControllerFactory(RightDomain.Policy);
    const R = reader; const W = writer;

    const project = R.getProject();
    const ui = R.getUI();
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
            if (RESERVED_PROP_KEYS.has(key)) return false;
            if (!tagOk(key)) return false;

            if (allowSpec.allowAllProps) {
                if (allowSpec.denyProps.has(key)) return false;
                return true;
            }

            if (allowSpec.allowProps.size > 0) {
                return allowSpec.allowProps.has(key);
            }

            return true;
        },
        [allowSpec, tagOk]
    );

    return { isVisibleProp, selectedTag };
}

/** Style 표시 여부 훅 */
export function useStyleVisibility(nodeId: NodeId, defId: string) {
    const { reader, writer } = useRightControllerFactory(RightDomain.Policy);
    const R = reader; const W = writer;

    const project = R.getProject();
    const ui = R.getUI();
    const def = getDefinition(defId);

    const compPol = getComponentPolicyV2(project, def?.title);
    const allowSpec = useMemo(() => buildAllowSpec(compPol, !!ui.expertMode), [compPol, ui.expertMode]);

    const matchesAllow = useCallback(
        (key: string) => {
            if (allowSpec.allowAllStyles) {
                if (allowSpec.denyStyles.has(key)) return false;
                return true;
            }
            if (allowSpec.allowStyles.has('*')) {
                if (allowSpec.denyStyles.has(key)) return false;
                return true;
            }
            if (allowSpec.allowStyles.size > 0) {
                if (allowSpec.denyStyles.has(key)) return false;
                return allowSpec.allowStyles.has(key);
            }
            return true;
        },
        [allowSpec]
    );

    const isVisibleStyleKey = useCallback((key: string) => matchesAllow(key), [matchesAllow]);

    return { isVisibleStyleKey };
}