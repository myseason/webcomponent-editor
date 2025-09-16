'use client';

import type { LocaleLabel, Option, PropertySpec, WhenExpr } from './InspectorStyle';

export type Context = { isContainer?: boolean; parentDisplay?: string | number | boolean };

export const toLabel = (lbl?: LocaleLabel, fallback?: string) => lbl?.ko ?? lbl?.en ?? fallback ?? '';

export function normalizeColor(v?: string) {
    if (!v) return '#000000';
    if (v.startsWith('#')) return v;
    return '#000000';
}

/** extraInput.width 제거 → 사이즈 힌트만 해석 */
export function freeInputClass(size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | undefined) {
    switch (size) {
        case 'xs': return 'min-w-[64px] w-[96px]';
        case 'sm': return 'min-w-[96px] w-[128px]';
        case 'md': return 'min-w-[120px] w-[160px]';
        case 'lg': return 'w-full';
        case 'xl': return 'w-full';
        default:   return 'min-w-[120px] w-[160px]';
    }
}

/** WhenExpr 평가 */
export const evalWhen = (expr: WhenExpr, ctx: Context, getVal: (k: string) => any): boolean => {
    if ('all' in expr) return expr.all.every((e) => evalWhen(e, ctx, getVal));
    if ('any' in expr) return expr.any.some((e) => evalWhen(e, ctx, getVal));
    if ('not' in expr) return !evalWhen(expr.not, ctx, getVal);
    if ('context' in expr) {
        const cur =
            expr.context === 'isContainer' ? ctx.isContainer :
                expr.context === 'parentDisplay' ? ctx.parentDisplay : undefined;
        if ('in' in expr && expr.in) return expr.in.includes(cur as any);
        if ('is' in expr) return cur === expr.is;
        return Boolean(cur);
    }
    if ('value' in expr) {
        const cur = getVal(expr.value);
        if ('in' in expr && expr.in) return expr.in.includes(cur);
        if ('is' in expr) return cur === expr.is;
        return cur != null && cur !== '';
    }
    return true;
};

/** spec.options 우선, 없으면 presets를 Option[]으로 변환 */
export function getOptions(spec: PropertySpec): Option[] {
    if (spec.options && spec.options.length > 0) {
        return spec.options as Option[];
    }
    if (spec.presets && spec.presets.length > 0) {
        return spec.presets.map((p): Option => ({
            value: p.value,
            label: p.label ? { ko: p.label } : undefined,
            iconKey: (p as any).icon,
            disabled: false,
            description: undefined,
        }));
    }
    return [];
}

/** 기본값 */
export function defaultFromSpec(prop: PropertySpec): string | undefined {
    const opts = getOptions(prop);
    if (prop.control === 'select' && opts.length > 0) return String(opts[0].value);
    if ((prop.control === 'chips' || prop.control === 'icons') && opts.length > 0) return String(opts[0].value);
    return undefined;
}

/** 파일 → 값 변환 (CDN 업로드 실패 시 폴백용) */
export function fileToValue(file: File, mode: 'url()'|'dataURL'|'objectURL', template?: string): Promise<string> {
    return new Promise((resolve) => {
        if (mode === 'dataURL') {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result || ''));
            r.readAsDataURL(file);
            return;
        }
        const src = URL.createObjectURL(file);
        resolve(template ? template.replace('${src}', src) : (mode === 'url()' ? `url(${src})` : src));
    });
}