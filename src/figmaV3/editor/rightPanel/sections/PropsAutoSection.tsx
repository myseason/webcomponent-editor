'use client';
/**
 * PropsAutoSection
 * - ComponentDefinition.propsSchema 기반 자동 폼 생성
 * - 지원: text / select
 * - 조건: (a) entry.when (객체 동등)  (b) entry.whenExpr (문자열 표현식)
 * - 훅 규칙: 최상위에서만 호출
 */
import React from 'react';
import { getDefinition } from '../../../core/registry';
import { useEditor } from '../../useEditor';
import type { PropSchemaEntry, NodeId } from '../../../core/types';
import { evalWhenExpr } from '../../../runtime/expr';

export function PropsAutoSection({ nodeId, defId }: { nodeId: NodeId; defId: string }) {
    const state = useEditor();
    const node = state.project.nodes[nodeId];
    const def = getDefinition(defId);

    const entries = (def?.propsSchema ?? []) as Array<PropSchemaEntry<Record<string, unknown>>>;
    const values = node.props as Record<string, unknown>;

    const shouldShow = (entry: PropSchemaEntry<Record<string, unknown>>): boolean => {
        // 1) when(객체 동등) 우선
        if ('when' in entry && entry.when) {
            const ok = Object.entries(entry.when).every(
                ([k, v]: [string, unknown]) => values[k] === v,
            );
            if (!ok) return false;
        }
        // 2) whenExpr(문자열) — data/node/project 컨텍스트로 평가
        const expr = (entry as { whenExpr?: string }).whenExpr;
        if (expr && expr.trim().length > 0) {
            const ok = evalWhenExpr(expr, {
                data: state.data,
                node,
                project: state.project,
            });
            if (!ok) return false;
        }
        return true;
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

/** 셀렉트 입력 */
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
                {options.map((o: { label: string; value: unknown }, i: number) => (
                    <option key={`${o.label}-${i}`} value={String(o.value)}>
                        {o.label}
                    </option>
                ))}
            </select>
        </label>
    );
}