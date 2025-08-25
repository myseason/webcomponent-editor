'use client';
/**
 * PropsAutoSection
 * - ComponentDefinition.propsSchema 기반 자동 폼 생성
 * - 지원: text / select
 * - when 조건은 단순 동등 비교만 지원(고급 조건식은 안전 파서 도입 후 확장)
 * - 상태 접근: useEditor() → 상태+액션 일원화
 */
import React from 'react';
import { getDefinition } from '../../../core/registry';
import { useEditor } from '../../useEditor';
import type { PropSchemaEntry, NodeId } from '../../../core/types';

export function PropsAutoSection({ nodeId, defId }: { nodeId: NodeId; defId: string }) {
    const state = useEditor();
    const node = state.project.nodes[nodeId];
    const def = getDefinition(defId);

    const entries = (def?.propsSchema ?? []) as Array<
        PropSchemaEntry<Record<string, unknown>>
    >;

    const values = node.props as Record<string, unknown>;

    const shouldShow = (entry: PropSchemaEntry<Record<string, unknown>>): boolean => {
        // when 미지정 → 보여줌
        if (!('when' in entry) || !entry.when) return true;
        // 단순 동등 비교만 우선 적용
        return Object.entries(entry.when).every(
            ([k, v]: [string, unknown]) => values[k] === v,
        );
    };

    const onChange = (key: string, value: unknown) => {
        state.updateNodeProps(nodeId, { [key]: value });
    };

    return (
        <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-500">Props</div>
            {entries.filter(shouldShow).map((e: PropSchemaEntry<Record<string, unknown>>) => {
                if (e.type === 'text') {
                    return (
                        <TextField
                            key={e.key}
                            label={e.label ?? String(e.key)}
                            value={String(values[e.key] ?? '')}
                            placeholder={e.placeholder ?? ''}
                            onChange={(v: string) => onChange(e.key, v)}
                        />
                    );
                }

                if (e.type === 'select') {
                    return (
                        <SelectField
                            key={e.key}
                            label={e.label ?? String(e.key)}
                            options={e.options}
                            value={values[e.key]}
                            onChange={(v: unknown) => onChange(e.key, v)}
                        />
                    );
                }

                return null;
            })}
        </div>
    );
}

/** 텍스트 입력 */
function TextField({
                       label,
                       value,
                       placeholder,
                       onChange,
                   }: {
    label: string;
    value: string;
    placeholder?: string;
    onChange: (v: string) => void;
}) {
    return (
        <label className="flex items-center gap-2 text-xs">
            <span className="w-14">{label}</span>
            <input
                className="flex-1 border rounded px-2 py-1"
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </label>
    );
}

/** 셀렉트 입력 (옵션 값은 string으로 전달됨 — 필요 시 파서 확장 가능) */
function SelectField({
                         label,
                         options,
                         value,
                         onChange,
                     }: {
    label: string;
    options: { label: string; value: unknown }[];
    value: unknown;
    onChange: (v: unknown) => void;
}) {
    return (
        <label className="flex items-center gap-2 text-xs">
            <span className="w-14">{label}</span>
            <select
                className="flex-1 border rounded px-2 py-1"
                value={String(value ?? '')}
                onChange={(e) => onChange(e.target.value)}
            >
                {options.map(
                    (
                        o: { label: string; value: unknown },
                        i: number,
                    ) => (
                        <option key={`${o.label}-${i}`} value={String(o.value)}>
                            {o.label}
                        </option>
                    ),
                )}
            </select>
        </label>
    );
}