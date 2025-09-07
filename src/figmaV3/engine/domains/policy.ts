'use client';

import { GLOBAL_STYLE_POLICY } from '../../policy/globalStylePolicy';
import { DEFAULT_STYLE_POLICY, StylePolicy } from '../../policy/stylePresets';

export function policyDomain() {
    const R = {
        getStylePolicy(): StylePolicy {
            return DEFAULT_STYLE_POLICY;
        },
        getShadowPresets() {
            return DEFAULT_STYLE_POLICY.shadows;
        },
        getFilterPresets() {
            return DEFAULT_STYLE_POLICY.filters;
        },
        getGradientPolicy() {
            return DEFAULT_STYLE_POLICY.gradient;
        },
        getColorPalette() {
            return DEFAULT_STYLE_POLICY.colors?.palette ?? [];
        },
        getFontFamilies() {
            return DEFAULT_STYLE_POLICY.typography?.fontFamilies ?? [];
        },
    };

    const W = {
        // 정책은 일반적으로 정적이지만, 향후 프로젝트 정책 병합이 필요하면 여기서 store patch로 반영
        setColorPalette(palette: string[]) {
            if (!DEFAULT_STYLE_POLICY.colors) (GLOBAL_STYLE_POLICY as any).colors = {};
            (DEFAULT_STYLE_POLICY.colors as any).palette = [...palette];
        },
        setFontFamilies(fonts: string[]) {
            if (!DEFAULT_STYLE_POLICY.typography) (DEFAULT_STYLE_POLICY as any).typography = {} as any;
            (DEFAULT_STYLE_POLICY.typography as any).fontFamilies = [...fonts];
        },
        updateComponentPolicy(_componentId: string, _patch: Partial<any>) {
            // 필요 시 프로젝트 단위로 저장/병합하도록 확장
            // 현재는 no-op (Controllers에서 호출 경로만 보장)
        },
    };

    return { reader: R, writer: W } as const;
}