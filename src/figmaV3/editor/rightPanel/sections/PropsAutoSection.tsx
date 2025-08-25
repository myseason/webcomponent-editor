'use client';
/**
 * PropsAutoSection
 * - ComponentDefinition.propsSchema 또는 프로젝트 스키마 오버라이드(state.project.schemaOverrides[defId])를 기반으로
 *   노드 props 편집 UI를 생성합니다.
 * - "조건식 프리셋" + WhenBuilder를 통합하여 각 프로퍼티의 표시 여부를 노드 인스턴스 단위로 제어합니다.
 *
 * 표시 규칙(우선순위):
 *   1) 노드 오버라이드: node.props.__propVisibility[key]?.whenExpr
 *   2) 스키마 when (동등)
 *   3) 스키마 whenExpr (문자열 표현식)
 *
 * 규약:
 * - 훅은 최상위에서만 호출
 * - any 금지
 * - 얕은 복사 update/updateNodeProps 사용
 */

import React from 'react';

import { SchemaEditor } from './SchemaEditor';
import { getDefinition } from '../../../core/registry';
import { useEditor } from '../../useEditor';
import type {
    PropSchemaEntry,
    NodeId,
    NodePropsWithMeta,
} from '../../../core/types';
import { evalWhenExpr } from '../../../runtime/expr';
import { WhenBuilder } from '../../common/WhenBuilder';

/** 텍스트 입력 */
function TextField({
                       label, value, placeholder, onChange,
                   }: {
    label: string; value: string; placeholder?: string; onChange: (v: string) => void;
}) {
    return (
        <label className="flex items-center gap-2 text-xs">
            <span className="w-24">{label}</span>
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
                         label, options, value, onChange,
                     }: {
    label: string;
    options: { label: string; value: unknown }[];
    value: unknown;
    onChange: (v: unknown) => void;
}) {
    return (
        <label className="flex items-center gap-2 text-xs">
            <span className="w-24">{label}</span>
            <select
                className="flex-1 border rounded px-2 py-1"
                value={String(value ?? '')}
                onChange={(e) => onChange(e.target.value)}
            >
                {options.map((o, i) => (
                    <option key={`${o.label}-${i}`} value={String(o.value)}>{o.label}</option>
                ))}
            </select>
        </label>
    );
}

/** 문자열을 안전하게 따옴표로 감쌈 */
function quoteString(s: string): string {
    return `'${s
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '\\t')}'`;
}

export function PropsAutoSection({ nodeId, defId }: { nodeId: NodeId; defId: string }) {
    // 훅(최상위)
    const state = useEditor();
    const node = state.project.nodes[nodeId];
    const defBase = getDefinition(defId);

    // 프로젝트 스키마 오버라이드가 있으면 우선 사용
    const override = state.project.schemaOverrides?.[defId];
    const entries = (override ?? defBase?.propsSchema ?? []) as Array<PropSchemaEntry<Record<string, unknown>>>;

    const values = node.props as Record<string, unknown>;
    const withMeta = node.props as NodePropsWithMeta;

    // 표시 여부
    const shouldShow = (entry: PropSchemaEntry<Record<string, unknown>>): boolean => {
        const key = entry.key as string;

        // 1. 노드 오버라이드
        const expr = withMeta.__propVisibility?.[key]?.whenExpr;
        if (expr && expr.trim()) {
            const ok = evalWhenExpr(expr, { data: state.data, node, project: state.project });
            if (!ok) return false;
        }

        // 2. 스키마 when(동등)
        if ('when' in entry && entry.when) {
            const ok = Object.entries(entry.when).every(([k, v]) => values[k] === v);
            if (!ok) return false;
        }

        // 3. 스키마 whenExpr
        if (entry.whenExpr && entry.whenExpr.trim()) {
            const ok = evalWhenExpr(entry.whenExpr, { data: state.data, node, project: state.project });
            if (!ok) return false;
        }
        return true;
    };

    // 값 갱신
    const onChange = (key: string, value: unknown) => {
        state.updateNodeProps(nodeId, { [key]: value });
    };

    // 가시성 오버라이드 읽기/쓰기
    const readWhen = (key: string): string => withMeta.__propVisibility?.[key]?.whenExpr ?? '';
    const writeWhen = (key: string, expr: string) => {
        const trimmed = expr.trim();
        state.update((s) => {
            const props = s.project.nodes[nodeId].props as NodePropsWithMeta;
            const cur = props.__propVisibility ?? {};
            const next = { ...cur };
            if (!trimmed) {
                if (next[key]) {
                    const { [key]: _omit, ...rest } = next;
                    props.__propVisibility = rest;
                }
            } else {
                next[key] = { whenExpr: trimmed };
                props.__propVisibility = next;
            }
        });
    };

    /** 인라인 프리셋 UI */
    function ConditionPresetRow({ propKey }: { propKey: string }) {
        const [open, setOpen] = React.useState<boolean>(false);
        const current = readWhen(propKey);

        // builder-like 인라인 컨트롤
        const [dataPath, setDataPath] = React.useState<string>('user.role');
        const [boolVal, setBoolVal] = React.useState<'true'|'false'>('true');
        const [textVal, setTextVal] = React.useState<string>('');
        const [propEqualsVal, setPropEqualsVal] = React.useState<string>('');
        const [notNullPath, setNotNullPath] = React.useState<string>('user.id');

        // 미리보기를 위해 WhenBuilder와 동일 표현을 사용
        const apply = (expr: string) => writeWhen(propKey, expr);

        return (
            <div className="ml-[96px] -mt-1 mb-2">
                <button
                    className={`text-[11px] border rounded px-2 py-0.5 ${open ? 'bg-gray-100' : ''}`}
                    onClick={() => setOpen((v) => !v)}
                    title="이 프로퍼티의 표시 조건을 구성합니다"
                >
                    조건(when)
                </button>

                {open && (
                    <div className="mt-2 border rounded p-2 space-y-3">
                        {/* 프리셋 그리드 */}
                        <div className="grid grid-cols-12 gap-2 text-[11px]">
                            {/* data.path == true/false */}
                            <div className="col-span-12 md:col-span-6 border rounded p-2 space-y-2">
                                <div className="font-semibold text-gray-600">data.path == true/false</div>
                                <div className="flex items-center gap-2">
                                    <input
                                        className="flex-1 border rounded px-2 py-1"
                                        placeholder="data 경로 (예: user.isAdmin)"
                                        value={dataPath}
                                        onChange={(e) => setDataPath(e.target.value)}
                                    />
                                    <select
                                        className="border rounded px-2 py-1"
                                        value={boolVal}
                                        onChange={(e) => setBoolVal(e.target.value as 'true'|'false')}
                                    >
                                        <option value="true">true</option>
                                        <option value="false">false</option>
                                    </select>
                                    <button
                                        className="border rounded px-2 py-1"
                                        onClick={() => apply(`data.${dataPath.trim()} == ${boolVal}`)}
                                    >
                                        적용
                                    </button>
                                </div>
                            </div>

                            {/* data.path == 'text' */}
                            <div className="col-span-12 md:col-span-6 border rounded p-2 space-y-2">
                                <div className="font-semibold text-gray-600">data.path == 'text'</div>
                                <div className="flex items-center gap-2">
                                    <input
                                        className="flex-1 border rounded px-2 py-1"
                                        placeholder="data 경로 (예: user.role)"
                                        value={dataPath}
                                        onChange={(e) => setDataPath(e.target.value)}
                                    />
                                    <input
                                        className="flex-1 border rounded px-2 py-1"
                                        placeholder="text 값"
                                        value={textVal}
                                        onChange={(e) => setTextVal(e.target.value)}
                                    />
                                    <button
                                        className="border rounded px-2 py-1"
                                        onClick={() => apply(`data.${dataPath.trim()} == ${quoteString(textVal)}`)}
                                    >
                                        적용
                                    </button>
                                </div>
                            </div>

                            {/* node.props.propKey == 'text' */}
                            <div className="col-span-12 md:col-span-6 border rounded p-2 space-y-2">
                                <div className="font-semibold text-gray-600">node.props.{propKey} == 'text'</div>
                                <div className="flex items-center gap-2">
                                    <input
                                        className="flex-1 border rounded px-2 py-1"
                                        placeholder="text 값"
                                        value={propEqualsVal}
                                        onChange={(e) => setPropEqualsVal(e.target.value)}
                                    />
                                    <button
                                        className="border rounded px-2 py-1"
                                        onClick={() => apply(`node.props.${propKey} == ${quoteString(propEqualsVal)}`)}
                                    >
                                        적용
                                    </button>
                                </div>
                            </div>

                            {/* data.path != null */}
                            <div className="col-span-12 md:col-span-6 border rounded p-2 space-y-2">
                                <div className="font-semibold text-gray-600">data.path != null</div>
                                <div className="flex items-center gap-2">
                                    <input
                                        className="flex-1 border rounded px-2 py-1"
                                        placeholder="data 경로 (예: user.id)"
                                        value={notNullPath}
                                        onChange={(e) => setNotNullPath(e.target.value)}
                                    />
                                    <button
                                        className="border rounded px-2 py-1"
                                        onClick={() => apply(`data.${notNullPath.trim()} != null`)}
                                    >
                                        적용
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 고급: WhenBuilder (현재 값 유지/편집) */}
                        <WhenBuilder
                            value={current}
                            onChange={(expr) => apply(expr)}
                            previewNodeId={nodeId}
                            className="border rounded p-2 text-[11px]"
                        />
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-500">Props</div>

            {entries.filter(shouldShow).map((e) => {
                const k = e.key as string;

                return (
                    <div key={k} className="space-y-1">
                        {e.type === 'text' && (
                            <TextField
                                label={e.label ?? String(e.key)}
                                value={String(values[e.key] ?? '')}
                                placeholder={e.placeholder ?? ''}
                                onChange={(v) => onChange(k, v)}
                            />
                        )}

                        {e.type === 'select' && (
                            <SelectField
                                label={e.label ?? String(e.key)}
                                options={e.options}
                                value={values[e.key]}
                                onChange={(v) => onChange(k, v)}
                            />
                        )}

                        {/* 조건식 프리셋 + WhenBuilder 토글 */}
                        <ConditionPresetRow propKey={k} />
                    </div>
                );
            })}
            {/* SchemaEditor */}
            <div className="mt-4">
                <details>
                    <summary className="text-xs font-semibold text-gray-500 cursor-pointer">
                        Schema (project override)
                    </summary>
                    <div className="mt-2">
                        <SchemaEditor nodeId={nodeId} />
                    </div>
                </details>
            </div>
        </div>
    );
}