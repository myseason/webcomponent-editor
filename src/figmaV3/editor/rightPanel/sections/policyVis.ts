'use client';

/**
 * 목표
 * - useEditor() 의존 제거
 * - 순수 함수(buildVisibility)와 훅(usePolicyVisibility)을 분리
 * - 기존 v2 정책을 그대로 반영하되, 호출자는 controller/섹션에서 넘겨준 값 사용
 */

import { GLOBAL_TAG_POLICIES } from '../../../policy/globalTagPolicy';
import { GLOBAL_STYLE_POLICY } from '../../../policy/globalStylePolicy';
import type { InspectorTarget } from '../../../controllers/InspectorController';
import { useInspectorController } from '../../../controllers/InspectorController';

export type PolicyCtx = {
    ui: { expertMode?: boolean };
    project: any;
    def?: { title?: string; capabilities?: { defaultTag?: string } };
    node: any;
};

export type VisibilityCheck = {
    visibleProp: (k: string) => boolean;
    visibleStyle: (k: string) => boolean;
    selectedTag: string;
};

// 예: Image 컴포넌트인데 tag가 img가 아닐 때 src/alt 비노출
const tagInvalid = (defTitle?: string, tag?: string, key?: string) =>
    defTitle === 'Image' && tag !== 'img' && (key === 'src' || key === 'alt');

export function buildVisibility(ctx: PolicyCtx): VisibilityCheck {
    const tag = ctx.node?.props?.__tag ?? ctx.def?.capabilities?.defaultTag ?? 'div';
    const tagPol = (GLOBAL_TAG_POLICIES as any)[tag] ?? {};
    const denyGlobal = new Set((GLOBAL_STYLE_POLICY as any).deny ?? []);

    const visibleProp = (key: string) => {
        if (tagInvalid(ctx.def?.title, tag, key)) return false;
        if (tagPol?.attributes?.deny?.includes?.(key)) return false;
        const allow = tagPol?.attributes?.allow;
        if (allow && !allow.includes('*') && !allow.includes(key)) return false;
        // (모드/컴포넌트별 세부 룰은 필요 시 확장)
        return true;
    };

    const visibleStyle = (key: string) => {
        if (denyGlobal.has(key)) return false;
        if (tagPol?.styles?.deny?.includes?.(key)) return false;
        const allow = tagPol?.styles?.allow;
        if (allow && !allow.includes('*') && !allow.includes(key)) return false;
        return true;
    };

    return { visibleProp, visibleStyle, selectedTag: tag };
}

/** 훅 래퍼: 컨트롤러에서 target/ui/project를 받아 순수 함수 호출 */
export function usePolicyVisibility(target: InspectorTarget) {
    const ctl = useInspectorController();
    if (!target) return null;
    return buildVisibility({
        ui: { expertMode: ctl.expertMode },
        project: ctl.project,
        def: target.def,
        node: target.node,
    });
}