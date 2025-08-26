'use client';

/**
 * PropsAutoSection (심플 버전)
 * - 오직 컴포넌트 고유 속성(propsSchema: text/select)만 편집합니다.
 * - As/바인딩/조건 프리셋/when/whenExpr 모두 제거하여 혼동 최소화.
 * - __tag / __tagAttrs 같은 태그 관련 키는 여기서 다루지 않습니다(=CommonSection 담당).
 */

import * as React from 'react';
import { getDefinition } from '../../../core/registry';
import { useEditor } from '../../useEditor';
import type { PropSchemaEntry, NodeId } from '../../../core/types';

function Row({ children }: { children: React.ReactNode }) {
    return <div className="flex items-center gap-2 px-1 py-0.5">{children}</div>;
}
function Label({ children }: { children: React.ReactNode }) {
    return <div className="text-xs w-28 shrink-0 text-neutral-500 select-none">{children}</div>;
}

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
        <Row>
            <Label>{label}</Label>
            <input
                className="text-[11px] border rounded px-2 py-1 flex-1"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </Row>
    );
}

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
        <Row>
            <Label>{label}</Label>
            <select
                className="text-[11px] border rounded px-2 py-1 flex-1"
                value={String(value ?? '')}
                onChange={(e) => onChange(e.target.value)}
            >
                {options.map((o, i) => (
                    <option key={`${o.label}-${i}`} value={String(o.value)}>
                        {o.label}
                    </option>
                ))}
            </select>
        </Row>
    );
}

export function PropsAutoSection({ nodeId, defId }: { nodeId: NodeId; defId: string }) {
    const state = useEditor();
    const node = state.project.nodes[nodeId];
    const defBase = getDefinition(defId);

    // 프로젝트 스키마 오버라이드 우선
    const override = state.project.schemaOverrides?.[defId];
    const entries = (override ?? defBase?.propsSchema ?? []) as Array<
        PropSchemaEntry<Record<string, unknown>>
    >;

    // 태그 관련 키는 여기서 배제
    const filtered = entries.filter((e) => {
        const k = String(e.key);
        return k !== 'as' && k !== '__tag' && k !== '__tagAttrs';
    });

    const values = node.props as Record<string, unknown>;
    const onChange = (key: string, value: unknown) => {
        state.updateNodeProps(nodeId, { [key]: value });
    };

    return (
        <section className="space-y-2">
            {filtered.length === 0 && (
                <div className="text-[11px] text-neutral-400 px-1">노출할 고유 속성이 없습니다.</div>
            )}

            {filtered.map((e) => {
                const k = e.key as string;
                const val = values[k];

                if (e.type === 'text') {
                    return (
                        <TextField
                            key={k}
                            label={e.label ?? k}
                            value={typeof val === 'string' ? val : ''}
                            placeholder={e.placeholder}
                            onChange={(v) => onChange(k, v)}
                        />
                    );
                }

                if (e.type === 'select') {
                    return (
                        <SelectField
                            key={k}
                            label={e.label ?? k}
                            options={e.options}
                            value={val}
                            onChange={(v) => onChange(k, v)}
                        />
                    );
                }

                return null;
            })}
        </section>
    );
}