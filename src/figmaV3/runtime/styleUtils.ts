import type { CSSDict } from '../core/types';
import type { CSSProperties } from 'react';

/** 숫자 형태로 다뤄도 안전한 속성 세트(문자열 단위도 허용은 그대로 유지) */
const NUMERIC_PROPS = new Set<string>([
    'opacity',
    'zIndex',
    'fontWeight',
    'lineHeight',
    'flexGrow',
    'flexShrink',
    'order',
    'gap',
    'rowGap',
    'columnGap',
    'width',
    'height',
    'minWidth',
    'minHeight',
    'maxWidth',
    'maxHeight',
    'top',
    'left',
    'right',
    'bottom',
    'borderWidth',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'outlineWidth',
]);

/** kebab-case → camelCase */
export function kebabToCamel(key: string): string {
    return key.includes('-') ? key.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) : key;
}

/** "12" | "-3.5" → true */
export function isNumericString(s: string): boolean {
    return /^-?\d+(\.\d+)?$/.test(s.trim());
}

/**
 * 공용 길이 보정 유틸
 * - 단위 없는 단일 토큰: number 로 캐스팅(px로 해석)
 * - 단위 포함/다중 토큰(shorthand): string 유지
 * - 빈 문자열/undefined: undefined 반환(스타일 제거 용도)
 */
export function coerceLen(raw: string | number | undefined): string | number | undefined {
    if (raw === '' || raw === undefined) return undefined;
    if (typeof raw === 'number') return raw;
    const s = String(raw).trim();
    if (!s) return undefined;
    if (/\s/.test(s)) return s; // "8px 16px"
    if (/[a-z%]+$/i.test(s)) return s; // "8px", "1rem", "50%"
    const n = Number(s);
    return Number.isFinite(n) ? n : s; // "8" -> 8 (number)
}

/** ----------------------------------------------------------------
 *  Shorthand ↔ Longhand 혼용 방지 (특히 border)
 *  ---------------------------------------------------------------- */

type AnyStyle = Record<string, any>;

/** "border" 축약을 longhand로 분해하거나, longhand가 있으면 축약을 제거 */
export function normalizeBorderShorthand(style: AnyStyle): AnyStyle {
    if (!style) return style;
    const s: AnyStyle = { ...style };

    const hasBorderShorthand = s.border != null;
    const hasAnyLonghand =
        s.borderWidth != null || s.borderStyle != null || s.borderColor != null;

    if (!hasBorderShorthand) return s;

    // longhand가 이미 있다면 축약 제거 (React 경고 방지)
    if (hasAnyLonghand) {
        delete s.border;
        return s;
    }

    // 축약만 있다면 분해
    const v = String(s.border).trim();
    delete s.border;

    // 대충이라도 width / style / color를 추정
    const tokens = v.split(/\s+/);
    let width: any;
    let styleTok: any;
    let color: any;

    for (const tok of tokens) {
        if (/^\d+(\.\d+)?(px|em|rem|vh|vw|%)?$/.test(tok)) {
            width = /px$/.test(tok) ? parseFloat(tok) : isNaN(+tok) ? tok : +tok;
            continue;
        }
        if (
            /^(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)$/i.test(tok)
        ) {
            styleTok = tok;
            continue;
        }
        color = tok;
    }

    if (width != null) s.borderWidth = width;
    if (styleTok != null) s.borderStyle = styleTok;
    if (color != null) s.borderColor = color;

    // 기본값 보강(선택)
    if (s.borderWidth == null) s.borderWidth = 1;
    if (s.borderStyle == null) s.borderStyle = 'solid';
    if (s.borderColor == null) s.borderColor = 'transparent';

    return s;
}

/** 앞으로 확장 가능: padding/margin/background/outline 등도 동일 원리 적용 */
export function normalizeNoShorthandConflicts(style: AnyStyle): AnyStyle {
    let out = { ...style };
    out = normalizeBorderShorthand(out);
    return out;
}

/** --------------------------------------------------------------
 *  CSSDict → React 인라인 스타일 (렌더 직전)
 *  -------------------------------------------------------------- */
export function toReactStyle(src?: CSSDict): CSSProperties {
    const out: Record<string, unknown> = {};
    if (!src) return out as CSSProperties;

    // ⚠️ 렌더 직전 1차 방어: 축약/혼용 정규화
    const safe = normalizeNoShorthandConflicts(src as AnyStyle);

    for (const [k, v] of Object.entries(safe)) {
        if (v === undefined || v === null) continue;
        const camel = kebabToCamel(k);
        let val: unknown = v;

        if (typeof v === 'string') {
            const s = v.trim();
            // 순수 숫자 문자열은 number로 캐스팅(px), 단위가 붙어있으면 그대로
            if (isNumericString(s) && (NUMERIC_PROPS.has(camel) || !/[a-z%]/i.test(s))) {
                val = Number(s);
            } else {
                val = s;
            }
        }
        out[camel] = val;
    }

    return out as CSSProperties;
}

/** 저장 전에 패치를 정규화(camelCase + number 캐스팅) */
export function normalizeStylePatch(patch?: CSSDict): CSSDict {
    if (!patch) return {};
    // 저장 시에도 축약/혼용을 제거
    const safe = normalizeNoShorthandConflicts(patch as AnyStyle);
    const out: CSSDict = {};

    for (const [k, v] of Object.entries(safe)) {
        if (v === undefined || v === null) continue;
        const camel = kebabToCamel(k);

        if (typeof v === 'string') {
            const s = v.trim();
            if (isNumericString(s) && (NUMERIC_PROPS.has(camel) || !/[a-z%]/i.test(s))) {
                out[camel] = Number(s);
            } else {
                out[camel] = s;
            }
        } else {
            out[camel] = v as number;
        }
    }
    return out;
}

/** 얕은 병합 유틸(저장 시 사용) */
export function mergeElementStyles(
    prev: CSSDict | undefined,
    patch: CSSDict | undefined
): CSSDict {
    return {
        ...(prev ?? {}),
        ...(patch ? normalizeStylePatch(patch) : {}),
    };
}