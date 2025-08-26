'use client';

import React from 'react';
import type { InspectorFilter, TagPolicy, TagPolicyMap, CSSDict } from '../../../../core/types';
import { filterStyleKeysByTemplateAndTag } from '../../../../runtime/capabilities';

export const Section: React.FC<{
    title: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}> = ({ title, open, onToggle, children }) => (
    <div className="border-t border-neutral-200 pt-3 mt-3">
        <button type="button" className="w-full text-left text-[12px] uppercase tracking-wide text-neutral-500 mb-2 flex items-center gap-2" onClick={onToggle}>
            <span className="inline-block w-3">{open ? '▾' : '▸'}</span><span>{title}</span>
        </button>
        {open && <div className="space-y-2">{children}</div>}
    </div>
);

export const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="text-[12px] text-neutral-600">{children}</div>
);

export const DisabledHint: React.FC<{ reason: 'template' | 'tag' }> = ({ reason }) => (
    <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-neutral-500">
    {reason === 'tag' ? '⛔ TagPolicy' : '▣ Template'}
  </span>
);

export const MiniInput: React.FC<{
    value: string | number | undefined; onChange: (v: string) => void; placeholder?: string;
}> = ({ value, onChange, placeholder }) => (
    <input className="w-full px-2 py-1 border rounded text-[12px]"
           value={value === undefined ? '' : String(value)}
           onChange={(e) => onChange(e.target.value)}
           placeholder={placeholder} />
);

export const NumberInput: React.FC<{
    value: number | undefined;
    onChange: (v: number) => void;
    step?: number;
    min?: number;
    max?: number;
    className?: string; // ➕ 추가
}> = ({ value, onChange, step = 1, min, max, className }) => (
    <input
        type="number"
        step={step}
        min={min}
        max={max}
        // grid col-span을 직접 줄 수 있게 className 전달 가능
        className={['w-full px-2 py-1 border rounded text-[12px]', className].filter(Boolean).join(' ')}
        value={typeof value === 'number' && Number.isFinite(value) ? value : ''}
        onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isNaN(n)) return onChange(NaN);
            let v = n;
            if (typeof min === 'number') v = Math.max(min, v);
            if (typeof max === 'number') v = Math.min(max, v);
            onChange(v);
        }}
    />
);

export const MiniSelect: React.FC<{
    value: string | undefined; options: string[]; onChange: (v: string) => void;
}> = ({ value, options, onChange }) => (
    <select className="w-full px-2 py-1 border rounded text-[12px]"
            value={value === undefined ? '' : value}
            onChange={(e) => onChange(e.target.value)}>
        {value === undefined && <option value="">(unset)</option>}
        {options.map((op) => <option key={op} value={op}>{op}</option>)}
    </select>
);

export const ChipBtn: React.FC<{
    active?: boolean; disabled?: boolean; title: string; onClick: () => void; children: React.ReactNode;
}> = ({ active, disabled, title, onClick, children }) => (
    <button type="button" title={title} onClick={onClick} disabled={disabled}
            className={[
                'text-[11px] px-2 py-1 rounded border',
                active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-50',
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}>
        {children}
    </button>
);

/** 아이콘 버튼(아이콘 자리에 children) */
export const IconBtn: React.FC<{
    active?: boolean; title: string; onClick: () => void; children: React.ReactNode; disabled?: boolean;
}> = ({ active, title, onClick, children, disabled }) => (
    <button type="button" title={title} onClick={onClick} disabled={disabled}
            className={[
                'p-1.5 rounded border',
                active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-50',
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}>
        {children}
    </button>
);

/** 컬러 피커 + 텍스트 동기화 */
export const ColorField: React.FC<{ value: string | undefined; onChange: (v: string) => void; }> = ({ value, onChange }) => {
    const isHex = typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
    const safeHex = isHex ? (value as string) : '#000000';
    return (
        <div className="flex items-center gap-2">
            <input type="color" className="w-8 h-8 border rounded" value={safeHex} onChange={(e) => onChange(e.target.value)} />
            <MiniInput value={value} onChange={onChange} placeholder="#ffffff or rgba(...)" />
        </div>
    );
};

export type DisallowReason = 'template' | 'tag' | null;

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