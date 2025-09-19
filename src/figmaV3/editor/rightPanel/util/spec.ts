'use client';

import { Square } from 'lucide-react';
import type { PropertySpec, UISize } from './types';


// 옵션/컨트롤 스펙 팩토리들 (현 StyleInspector.tsx의 헬퍼와 동등)
export const makeChips = (
    opts: Array<string | { value: string; label?: string }>,
    extra?: { placeholder?: string; free?: boolean; size?: UISize }
): PropertySpec => ({
    control: 'chips' as const,
    options: opts.map((o) =>
        typeof o === 'string' ? { value: o } : { value: o.value, label: o.label ? { ko: o.label } : undefined }
    ),
    placeholder: extra?.placeholder,
    ui: {
        size: extra?.size ?? 'xs',
        extraInput: extra?.free
            ? { enabled: true, size: extra?.size ?? 'xs', placeholder: extra?.placeholder }
            : undefined,
    },
});

export const makeIcons = (
    opts: Array<{ value: string; iconKey?: string; label?: string }>,
    size: UISize = 'xs'
): PropertySpec => ({
    control: 'icons' as const,
    options: opts.map((o) => ({
        value: o.value,
        iconKey: o.iconKey ?? o.value,
        label: o.label ? { ko: o.label } : undefined,
    })),
    ui: { size },
});

export const makeSelect = (
    opts: Array<string | { value: string; label?: string }>,
    size: UISize = 'sm'
): PropertySpec => ({
    control: 'select' as const,
    options: opts.map((o) =>
        typeof o === 'string' ? { value: o } : { value: o.value, label: o.label ? { ko: o.label } : undefined }
    ),
    ui: { size },
});

export const makeInput = (
    placeholder?: string,
    inputType: 'text' | 'number' | 'url' | 'time' = 'text',
    size: UISize = 'xs'
): PropertySpec => ({
    control: 'input' as const,
    placeholder,
    ui: { inputType, size },
});

export const makeColor = (placeholder?: string, size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'sm'): PropertySpec => ({
    control: 'color' as const,
    placeholder,
    ui: { size },
});

export const makeRatio = (
    placeholder?: string,
    presets?: Array<{ value: string; label?: string }>,
    size: UISize = 'xs'
): PropertySpec => ({
    control: 'ratio' as const,
    presets: presets?.map((p) => ({ value: p.value, label: p.label })),
    placeholder,
    ui: { size },
});

/*
export const GROUP_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    Border: Square,
};
*/