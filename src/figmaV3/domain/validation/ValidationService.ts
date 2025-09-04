'use client';

import { visibilityService } from '../policy/VisibilityService';

export type ValidateContext = {
    project: any;
    target?: { def?: any; node?: any } | null;
};

/**
 * ValidationService
 * - 정책/스키마/컨벤션 기반의 경량 검증기
 * - 지금은 최소 규칙만: tag 허용, prop 허용, style 허용 여부
 * - 확장: 값 타입/범위, 데이터바인딩 유효성, 고급 상호의존 규칙 등
 */
export class ValidationService {
    validateTag(tag: string, ctx: ValidateContext) {
        const def = ctx.target?.def;
        const allowed: string[] = (def as any)?.capabilities?.allowedTags ?? ['div'];
        if (!allowed.includes(tag)) {
            return { ok: false as const, reason: `Tag "${tag}" is not allowed for component.`, code: 'TAG_DENY' };
        }
        return { ok: true as const };
    }

    validatePropsPatch(patch: Record<string, unknown>, ctx: ValidateContext) {
        const v = visibilityService.build({ def: ctx.target?.def, node: ctx.target?.node });
        const keys = Object.keys(patch ?? {});
        for (const k of keys) {
            if (k === '__tag' || k === '__tagAttrs') continue; // 별도 경로에서 검증
            const vis = v.visibleProp(k);
            if (!vis) return { ok: false as const, reason: `Prop "${k}" is not allowed.`, code: 'PROP_DENY' };
        }
        return { ok: true as const };
    }

    validateStylesPatch(patch: Record<string, unknown>, ctx: ValidateContext) {
        const v = visibilityService.build({ def: ctx.target?.def, node: ctx.target?.node });
        const keys = Object.keys(patch ?? {});
        for (const k of keys) {
            const vis = v.visibleStyle(k);
            if (!vis) return { ok: false as const, reason: `Style "${k}" is not allowed.`, code: 'STYLE_DENY' };
        }
        return { ok: true as const };
    }
}

export const validationService = new ValidationService();