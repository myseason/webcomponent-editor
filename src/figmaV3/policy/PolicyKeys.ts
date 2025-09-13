
// 단일 출처의 키 정규화/비교/그룹 매핑 유틸
// - styles:width / width → width 로 통일
// - props:title / title  → title 로 통일

export type NormalizedStyleKey = string & { __brand?: 'NormalizedStyleKey' };

export function normalizeStyleKey(raw: string): NormalizedStyleKey {
    const i = raw.indexOf(':');
    return (i >= 0 ? raw.slice(i + 1) : raw) as NormalizedStyleKey;
}

export function isStyleKeyEqual(a: string, b: string): boolean {
    return normalizeStyleKey(a) === normalizeStyleKey(b);
}

/**
 * 스타일 그룹과 대표 키/멤버 키 매핑
 * - 현재 Inspector UI 그룹 기준(layout/spacing/typography/position/border/background/effects/custom)
 * - 실제 표시 여부 계산은 EffectivePolicyService.getAllowedStyleKeys() 결과와 교집합으로 판단
 * - Phase 1에서는 "참고 테이블"로 제공하고, Phase 2에서 StylesSection이 이를 사용하도록 치환
 */
export const STYLE_GROUP_MAP: Record<
    | 'layout'
    | 'spacing'
    | 'typography'
    | 'position'
    | 'border'
    | 'background'
    | 'effects'
    | 'custom',
    {
        /** 그룹 대표 키(들). 하나라도 허용되면 그룹 표시 후보 */
        representatives: NormalizedStyleKey[];
        /** 그룹에 속하는 상세 키(선택) */
        members: NormalizedStyleKey[];
    }
> = {
    layout: {
        representatives: ['display', 'flexDirection', 'gridTemplateColumns'] as NormalizedStyleKey[],
        members: [
            'display', 'overflow', 'visibility','gap','gridGap',
            //'flexDirection', 'flexWrap', 'justifyContent', 'alignItems', 'alignContent', 'gap',
            //'gridTemplateColumns', 'gridTemplateRows', 'gridAutoFlow', 'gridGap',
            //'width', 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight',
            'width_height',
        ] as NormalizedStyleKey[],
    },
    spacing: {
        representatives: ['margin', 'padding'] as NormalizedStyleKey[],
        members: [
            'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
            'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
        ] as NormalizedStyleKey[],
    },
    typography: {
        representatives: ['fontSize', 'fontWeight'] as NormalizedStyleKey[],
        members: [
            'fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'lineHeight',
            'textAlign', 'textDecoration', 'textTransform', 'whiteSpace',
            'color',
        ] as NormalizedStyleKey[],
    },
    position: {
        representatives: ['position'] as NormalizedStyleKey[],
        members: [
            'position', 'top', 'right', 'bottom', 'left', 'zIndex',
        ] as NormalizedStyleKey[],
    },
    border: {
        representatives: ['border'] as NormalizedStyleKey[],
        members: [
            'border', 'borderWidth', 'borderStyle', 'borderColor', 'borderRadius',
            'outline', 'outlineWidth', 'outlineStyle', 'outlineColor',
        ] as NormalizedStyleKey[],
    },
    background: {
        representatives: ['background'] as NormalizedStyleKey[],
        members: [
            'background', 'backgroundColor', 'backgroundImage', 'backgroundSize',
            'backgroundRepeat', 'backgroundPosition',
        ] as NormalizedStyleKey[],
    },
    effects: {
        representatives: ['boxShadow', 'filter', 'opacity'] as NormalizedStyleKey[],
        members: [
            'boxShadow', 'opacity', 'filter', 'backdropFilter',
        ] as NormalizedStyleKey[],
    },
    custom: {
        representatives: ['custom'] as NormalizedStyleKey[],
        members: [] as NormalizedStyleKey[],
    },
};