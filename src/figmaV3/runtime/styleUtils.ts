import type { CSSDict } from '../core/types';
import type { CSSProperties } from 'react';

/** 숫자 형태로 다뤄도 안전한 속성 세트(문자열 단위도 허용은 그대로 유지) */
const NUMERIC_PROPS = new Set<string>([
    'opacity', 'zIndex', 'fontWeight', 'lineHeight',
    'flexGrow', 'flexShrink', 'order',
    'gap', 'rowGap', 'columnGap',
    'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
    'top', 'left', 'right', 'bottom',
    'borderWidth', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
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

/** 렌더 직전에 CSSDict → React 인라인 스타일로 정규화 */
export function toReactStyle(src?: CSSDict): CSSProperties {
    const out: Record<string, unknown> = {};
    if (!src) return out as CSSProperties;

    for (const [k, v] of Object.entries(src)) {
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
    const out: CSSDict = {};
    for (const [k, v] of Object.entries(patch)) {
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
export function mergeElementStyles(prev: CSSDict | undefined, patch: CSSDict | undefined): CSSDict {
    return { ...(prev ?? {}), ...(patch ? normalizeStylePatch(patch) : {}) };
}