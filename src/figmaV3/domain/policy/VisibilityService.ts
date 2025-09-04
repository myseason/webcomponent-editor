'use client';

/**
 * VisibilityService
 * - 태그/스타일 정책을 한곳에서 판단
 * - (변경점) PolicyProvider를 통해 주입된 정책을 우선 사용
 * - 기본값으로 GLOBAL_* 정책을 base로 설정
 */

import { GLOBAL_TAG_POLICIES } from '../../policy/globalTagPolicy';
import { GLOBAL_STYLE_POLICY } from '../../policy/globalStylePolicy';
import { policyProvider, type TagPolicyMap } from './PolicyProvider';

export type VisibilityContext = {
    def?: { title?: string; capabilities?: { defaultTag?: string } };
    node?: { props?: Record<string, unknown> };
};

export type VisibilityCheck = {
    selectedTag: string;
    visibleProp: (key: string) => boolean;
    visibleStyle: (key: string) => boolean;
};

export class VisibilityService {
    constructor() {
        // 기본 base 정책을 Provider에 세팅 (필요 시 앱 부트스트랩에서 1회만 실행해도 OK)
        try {
            policyProvider.setBase({
                tagPolicies: (GLOBAL_TAG_POLICIES as unknown as TagPolicyMap) ?? {},
                globalStylePolicy: (GLOBAL_STYLE_POLICY as any) ?? {},
            });
        } catch {
            /* no-op */
        }
    }

    build(ctx: VisibilityContext): VisibilityCheck {
        const { tagPolicies, globalStylePolicy } = policyProvider.getPolicies();

        const defTitle = ctx.def?.title;
        const tag =
            (ctx.node?.props?.['__tag'] as string | undefined) ??
            ctx.def?.capabilities?.defaultTag ??
            'div';

        const tagPol = (tagPolicies as any)[tag] ?? {};
        const denyGlobal = new Set((globalStylePolicy as any).deny ?? []);

        const tagInvalid = (key?: string) =>
            defTitle === 'Image' && tag !== 'img' && (key === 'src' || key === 'alt');

        const visibleProp = (key: string) => {
            if (tagInvalid(key)) return false;
            if (tagPol?.attributes?.deny?.includes?.(key)) return false;
            const allow = tagPol?.attributes?.allow;
            if (allow && !allow.includes('*') && !allow.includes(key)) return false;
            return true;
        };

        const visibleStyle = (key: string) => {
            if (denyGlobal.has(key)) return false;
            if (tagPol?.styles?.deny?.includes?.(key)) return false;
            const allow = tagPol?.styles?.allow;
            if (allow && !allow.includes('*') && !allow.includes(key)) return false;
            return true;
        };

        return { selectedTag: tag, visibleProp, visibleStyle };
    }
}

export const visibilityService = new VisibilityService();