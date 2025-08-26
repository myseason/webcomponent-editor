'use client';

import React from 'react';
import type {
    InspectorFilter,
    TagPolicy,
    TagPolicyMap,
    CSSDict,
} from '../../../../core/types';
import {
    filterStyleKeysByTemplateAndTag,
} from '../../../../runtime/capabilities';

/* ────────────────────────────────────────────────────
 * 공통 레이아웃 컴포넌트
 * ──────────────────────────────────────────────────── */

export const Section: React.FC<{
    title: string;
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}> = ({ title, open, onToggle, children }) => (
    <section className="mt-3">
        <div
            className="flex items-center justify-between text-xs font-semibold text-neutral-700 cursor-pointer select-none"
            onClick={onToggle}
        >
            <span>{open ? '▾' : '▸'} {title}</span>
        </div>
        {open && <div className="mt-1">{children}</div>}
    </section>
);

export const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="text-xs text-neutral-600 w-24 select-none">{children}</span>
);

export const DisabledHint: React.FC<{ reason: 'template' | 'tag' }> = ({ reason }) => (
    <span
        className="text-[10px] px-1 py-0.5 rounded border border-neutral-200 text-neutral-500"
        title={reason === 'tag' ? 'TagPolicy에 의해 제한' : 'Template 필터에 의해 제한'}
    >
    {reason === 'tag' ? '⛔ TagPolicy' : '▣ Template'}
  </span>
);

/* ────────────────────────────────────────────────────
 * 폼 위젯
 * ──────────────────────────────────────────────────── */

export const MiniInput: React.FC<{
    value: string | number | undefined;
    onChange: (v: string) => void;  // 입력 원문을 부모가 적절히 파싱/보정(coerceLen 등)
    placeholder?: string;
    disabled?: boolean;
    title?: string;
    className?: string;
}> = ({ value, onChange, placeholder, disabled, title, className }) => (
    <input
        type="text"
        value={value === undefined ? '' : String(value)}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        title={title}
        className={
            `border rounded px-2 py-1 text-sm w-28 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ` +
            (className ?? '')
        }
    />
);

export const NumberInput: React.FC<{
    value: number | undefined;
    onChange: (v: number) => void;
    step?: number;
    min?: number;
    max?: number;
    className?: string; // 확장
    disabled?: boolean;
    title?: string;
}> = ({ value, onChange, step = 1, min, max, className, disabled, title }) => (
    <input
        type="number"
        step={step}
        value={Number.isFinite(value ?? NaN) ? (value as number) : 0}
        onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isNaN(n)) return onChange(NaN);
            let v = n;
            if (typeof min === 'number') v = Math.max(min, v);
            if (typeof max === 'number') v = Math.min(max, v);
            onChange(v);
        }}
        disabled={disabled}
        title={title}
        className={`border rounded px-2 py-1 text-sm w-24 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className ?? ''}`}
    />
);

export const MiniSelect: React.FC<{
    value: string | undefined;
    options: string[];
    onChange: (v: string) => void;
    disabled?: boolean;
    title?: string;
    className?: string;
}> = ({ value, options, onChange, disabled, title, className }) => (
    <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        title={title}
        className={`border rounded px-2 py-1 text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className ?? ''}`}
    >
        {value === undefined && <option value="">{'(unset)'}</option>}
        {options.map((op) => (
            <option key={op} value={op}>
                {op}
            </option>
        ))}
    </select>
);

export const ChipBtn: React.FC<{
    active?: boolean;
    disabled?: boolean;
    title: string;
    onClick: () => void;
    children: React.ReactNode;
}> = ({ active, disabled, title, onClick, children }) => (
    <button
        type="button"
        title={title}
        onClick={onClick}
        disabled={disabled}
        className={[
            'px-2 py-0.5 text-xs rounded border',
            active ? 'bg-neutral-800 text-white border-neutral-900' : 'hover:bg-neutral-50 border-neutral-200',
            disabled ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
    >
        {children}
    </button>
);

/** 아이콘 버튼(아이콘 자리에 children) */
export const IconBtn: React.FC<{
    active?: boolean;
    title: string;
    onClick: () => void;
    children: React.ReactNode;
    disabled?: boolean;
}> = ({ active, title, onClick, children, disabled }) => (
    <button
        type="button"
        title={title}
        onClick={onClick}
        disabled={disabled}
        className={[
            'h-7 w-7 inline-flex items-center justify-center rounded border',
            active ? 'bg-neutral-800 text-white border-neutral-900' : 'hover:bg-neutral-50 border-neutral-200',
            disabled ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
    >
        {children}
    </button>
);

/** 컬러 피커 + 텍스트 동기화 */
export const ColorField: React.FC<{
    value: string | undefined;
    onChange: (v: string) => void;
    disabled?: boolean;
    title?: string;
}> = ({ value, onChange, disabled, title }) => {
    const isHex =
        typeof value === 'string' &&
        /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
    const safeHex = isHex ? (value as string) : '#000000';
    return (
        <div className="flex items-center gap-2">
            <input
                type="color"
                value={safeHex}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                title={title}
            />
            <input
                type="text"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder="#000000"
                disabled={disabled}
                title={title}
                className={`border rounded px-2 py-1 text-sm w-28 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
        </div>
    );
};

/* ────────────────────────────────────────────────────
 * 허용/제한 판단 유틸
 * ──────────────────────────────────────────────────── */

export type DisallowReason = 'template' | 'tag' | null;

/**
 * 템플릿(Filter) → 태그 정책 순으로 keys 필터링하여 허용 set 반환
 * - 전문가 모드(expert=true)면 템플릿 필터는 무시(표시 UX 전용)
 */
export function useAllowed(
    keys: string[],
    tf: InspectorFilter | undefined,
    tag: string,
    map: TagPolicyMap | undefined,
    expert: boolean
): Set<string> {
    const deps = React.useMemo(() => keys.join(','), [keys]);
    return React.useMemo(
        () => new Set(filterStyleKeysByTemplateAndTag([...keys], tf, tag, map, expert)),
        [deps, tf, tag, map, expert]
    );
}

/** 단일 키에 대해 제한 사유 계산(배지용) */
export function reasonForKey(
    key: string,
    tagPolicy: TagPolicy | undefined,
    tf: InspectorFilter | undefined,
    expert: boolean
): DisallowReason {
    if (tagPolicy?.styles?.allow && !tagPolicy.styles.allow.includes(key)) return 'tag';
    if (tagPolicy?.styles?.deny && tagPolicy.styles.deny.includes(key)) return 'tag';
    if (!expert && tf?.styles) {
        if (tf.styles.allow && !tf.styles.allow.includes(key)) return 'template';
        if (tf.styles.deny && tf.styles.deny.includes(key)) return 'template';
    }
    return null;
}