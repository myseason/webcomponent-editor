'use client';
/**
 * PropsAutoSection
 * - ComponentDefinition.propsSchema 기반으로 노드 props 편집 UI를 생성합니다.
 * - "조건식 프리셋" + WhenBuilder를 통합하여
 *    각 프로퍼티의 표시 여부를 노드 인스턴스 단위로 제어할 수 있습니다.
 *
 * 동작 규칙
 * - 표시 여부 판단 순서:
 *   (1) 노드 오버라이드: node.props.__propVisibility[key]?.whenExpr → 있으면 우선
 *   (2) 스키마 when (동등비교)
 *   (3) (선택) 스키마 whenExpr (있다면)
 *
 * - 상태 접근: useEditor() (최상위 훅만)
 * - any 금지
 * - 스토어 갱신: updateNodeProps()/update() (얕은 복사)
 */

import React from 'react';
import { getDefinition } from '../../../core/registry';
import { useEditor } from '../../useEditor';
import type {
    PropSchemaEntry,
    NodeId,
    NodePropsWithMeta,
} from '../../../core/types';
import { evalWhenExpr } from '../../../runtime/expr';
import { WhenBuilder } from '../../common/WhenBuilder';

/** 텍스트 입력 컴포넌트 */
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
            <span className="w-20">{label}</span>
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

/** 셀렉트 입력 컴포넌트 */
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
            <span className="w-20">{label}</span>
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

/** 문자열을 안전하게 따옴표로 감쌈 */
function quoteString(s: string): string {
    return `'${s
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '\\t')}'`;
}

export function PropsAutoSection({ nodeId, defId }: { nodeId: NodeId; defId: string }) {
    // 1) 훅은 최상위에서 호출
    const state = useEditor();
    const node = state.project.nodes[nodeId];
    const def = getDefinition(defId);

    const entries = (def?.propsSchema ?? []) as Array<PropSchemaEntry<Record<string, unknown>>>;
    const values = node.props as Record<string, unknown>;
    const withMeta = node.props as NodePropsWithMeta;

    // 2) 표시 여부 판단기
    const shouldShow = (entry: PropSchemaEntry<Record<string, unknown>>): boolean => {
        const key = entry.key as string;

        // (1) 노드 오버라이드 whenExpr 우선
        const expr = withMeta.__propVisibility?.[key]?.whenExpr;
        if (expr && expr.trim()) {
            const ok = evalWhenExpr(expr, {
                data: state.data,
                node,
                project: state.project,
            });
            if (!ok) return false;
        }

        // (2) 스키마 when(동등비교)
        if ('when' in entry && entry.when) {
            const ok = Object.entries(entry.when).every(
                ([k, v]: [string, unknown]) => values[k] === v,
            );
            if (!ok) return false;
        }

        // (3) (선택) 스키마 whenExpr — types.ts에 선언되어 있다면 적용
        const maybeExpr = (entry as unknown as { whenExpr?: string }).whenExpr;
        if (maybeExpr && maybeExpr.trim()) {
            const ok = evalWhenExpr(maybeExpr, {
                data: state.data,
                node,
                project: state.project,
            });
            if (!ok) return false;
        }

        return true;
    };

    // 3) 값 갱신
    const onChange = (key: string, value: unknown) => {
        state.updateNodeProps(nodeId, { [key]: value });
    };

    // 4) prop 가시성 오버라이드 읽기/쓰기를 도와주는 유틸
    const readWhen = (key: string): string => {
        return withMeta.__propVisibility?.[key]?.whenExpr ?? '';
    };

    const writeWhen = (key: string, expr: string) => {
        const trimmed = expr.trim();
        state.update((s) => {
            const cur = (s.project.nodes[nodeId].props as NodePropsWithMeta).__propVisibility ?? {};
            const next = { ...cur };
            if (!trimmed) {
                // 빈 문자열이면 해당 키 제거
                if (next[key]) {
                    const { [key]: _omit, ...rest } = next;
                    (s.project.nodes[nodeId].props as NodePropsWithMeta).__propVisibility = rest;
                }
            } else {
                next[key] = { whenExpr: trimmed };
                (s.project.nodes[nodeId].props as NodePropsWithMeta).__propVisibility = next;
            }
        });
    };

    // 5) 특정 프로퍼티의 "조건식 프리셋" UI
    function ConditionPresetRow({ propKey }: { propKey: string }) {
        const [open, setOpen] = React.useState<boolean>(false);
        const current = readWhen(propKey);

        const apply = (expr: string) => writeWhen(propKey, expr);

        const onPresetDataBool = () => {
            const path = prompt("data 경로를 입력하세요 (예: user.isAdmin)") ?? '';
            if (!path.trim()) return;
            const val = confirm('값을 true로 설정할까요? 확인=true / 취소=false') ? 'true' : 'false';
            apply(`data.${path.trim()} == ${val}`);
        };

        const onPresetDataEquals = () => {
            const path = prompt("data 경로를 입력하세요 (예: user.role)") ?? '';
            if (!path.trim()) return;
            const val = prompt("문자열 값(따옴표 없이)") ?? '';
            apply(`data.${path.trim()} == ${quoteString(val)}`);
        };

        const onPresetPropEquals = () => {
            const val = prompt(`node.props.${propKey}와 비교할 문자열 값(따옴표 없이)`) ?? '';
            apply(`node.props.${propKey} == ${quoteString(val)}`);
        };

        const onPresetNotNull = () => {
            const path = prompt("data 경로를 입력하세요 (예: user.id)") ?? '';
            if (!path.trim()) return;
            apply(`data.${path.trim()} != null`);
        };

        return (
            <div className="ml-[80px] -mt-1 mb-2">
                <button
                    className={`text-[11px] border rounded px-2 py-0.5 ${open ? 'bg-gray-100' : ''}`}
                    onClick={() => setOpen((v) => !v)}
                    title="이 프로퍼티의 표시 조건을 구성합니다"
                >
                    조건(when)
                </button>
                {open && (
                    <div className="mt-2 border rounded p-2 space-y-2">
                        {/* 프리셋 버튼들 */}
                        <div className="flex flex-wrap gap-2">
                            <button className="text-[11px] border rounded px-2 py-0.5" onClick={onPresetDataBool}>
                                data.path == true/false
                            </button>
                            <button className="text-[11px] border rounded px-2 py-0.5" onClick={onPresetDataEquals}>
                                data.path == 'text'
                            </button>
                            <button className="text-[11px] border rounded px-2 py-0.5" onClick={onPresetPropEquals}>
                                node.props.{propKey} == 'text'
                            </button>
                            <button className="text-[11px] border rounded px-2 py-0.5" onClick={onPresetNotNull}>
                                data.path != null
                            </button>
                            <button
                                className="text-[11px] border rounded px-2 py-0.5 text-red-600"
                                onClick={() => apply('')}
                                title="이 프로퍼티의 조건을 제거합니다"
                            >
                                조건 지우기
                            </button>
                        </div>

                        {/* 고급: WhenBuilder로 자유 편집 */}
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

    // 6) 렌더
    return (
        <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-500">Props</div>

            {entries.filter(shouldShow).map((e: PropSchemaEntry<Record<string, unknown>>) => {
                const k = e.key as string;

                return (
                    <div key={k} className="space-y-1">
                        {e.type === 'text' && (
                            <TextField
                                label={e.label ?? String(e.key)}
                                value={String(values[e.key] ?? '')}
                                placeholder={e.placeholder ?? ''}
                                onChange={(v: string) => onChange(k, v)}
                            />
                        )}

                        {e.type === 'select' && (
                            <SelectField
                                label={e.label ?? String(e.key)}
                                options={e.options}
                                value={values[e.key]}
                                onChange={(v: unknown) => onChange(k, v)}
                            />
                        )}

                        {/* 조건식 프리셋 + WhenBuilder 토글 영역 */}
                        <ConditionPresetRow propKey={k} />
                    </div>
                );
            })}
        </div>
    );
}