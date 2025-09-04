// src/figmaV3/domain/policy/PolicyProvider.ts
'use client';

/**
 * PolicyProvider
 * - tag/style 정책을 외부(프로젝트/플러그인)에서 주입하거나 합성하는 포인트
 * - 기존 GLOBAL_* 정책은 기본값으로 유지
 * - setOverrides()로 런타임 주입 가능 (예: 테넌트별 정책)
 */

export type TagPolicy = {
    version?: string;
    tag?: string;
    attributes?: { allow?: string[]; deny?: string[] };
    styles?: { allow?: string[]; deny?: string[] };
};

export type TagPolicyMap = Record<string, TagPolicy>;
export type StyleGlobalPolicy = { deny?: string[]; allow?: string[] };

export type PolicyBundle = {
    tagPolicies: TagPolicyMap;
    globalStylePolicy: StyleGlobalPolicy;
};

const emptyBundle: PolicyBundle = { tagPolicies: {}, globalStylePolicy: {} };

class PolicyProvider {
    private base: PolicyBundle = emptyBundle;       // GLOBAL_* from code
    private overrides: Partial<PolicyBundle> = {};  // tenant/project overrides

    setBase(bundle: PolicyBundle) {
        this.base = bundle ?? emptyBundle;
    }

    setOverrides(over: Partial<PolicyBundle>) {
        this.overrides = over ?? {};
    }

    getPolicies(): PolicyBundle {
        const tagPolicies = {
            ...(this.base.tagPolicies ?? {}),
            ...(this.overrides.tagPolicies ?? {}),
        };
        const globalStylePolicy = {
            ...(this.base.globalStylePolicy ?? {}),
            ...(this.overrides.globalStylePolicy ?? {}),
        };
        return { tagPolicies, globalStylePolicy };
    }
}

export const policyProvider = new PolicyProvider();