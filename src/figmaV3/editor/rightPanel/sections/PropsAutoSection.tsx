'use client';

/**
 * PropsAutoSection
 * - ComponentDefinition.propsSchema 또는 프로젝트 오버라이드(state.project.schemaOverrides[defId])를 기반으로
 *   노드 props 편집 UI를 자동 생성합니다.
 * - "조건식 프리셋" + WhenBuilder 로 각 프로퍼티의 표시 여부(가시성)를 제어할 수 있습니다.
 * - ✅ 데이터 바인딩 UX v1:
 *   - 각 필드 옆 "Bind" 버튼으로 {{ data.xxx }}, {{ node.props.key }}, {{ project.pages[0].name }} 등 머스태쉬 바인딩을 간단 적용/해제
 *   - 최근 사용 경로는 settings.recentBindings(string[])에 보관(최대 8개)
 *
 * 규칙:
 * - 훅은 최상위에서만 호출
 * - any 금지
 * - 얕은 복사 update/updateNodeProps 사용
 */

import React from 'react';
import { getDefinition } from '../../../core/registry';
import { useEditor } from '../../useEditor';
import type {
    PropSchemaEntry,
    NodeId,
    NodePropsWithMeta,
    EditorState,
} from '../../../core/types';
import { evalWhenExpr } from '../../../runtime/expr';
import { WhenBuilder } from '../../common/WhenBuilder';

/* ───────────────── UI 소품 ───────────────── */

function Row({ children }: { children: React.ReactNode }) {
    return <div className="flex items-center gap-2 px-1">{children}</div>;
}

function Label({ children }: { children: React.ReactNode }) {
    return (
        <div className="text-xs w-24 shrink-0 text-neutral-500 select-none">
            {children}
        </div>
    );
}

/** 텍스트 입력 */
function TextField({
                       label,
                       value,
                       placeholder,
                       onChange,
                       rightSlot,
                   }: {
    label: string;
    value: string;
    placeholder?: string;
    onChange: (v: string) => void;
    rightSlot?: React.ReactNode;
}) {
    return (
        <Row>
            <Label>{label}</Label>
            <input
                className="text-[11px] border rounded px-2 py-1 w-full"
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
            />
            {rightSlot}
        </Row>
    );
}

/** 셀렉트 입력 */
function SelectField({
                         label,
                         options,
                         value,
                         onChange,
                         rightSlot,
                     }: {
    label: string;
    options: { label: string; value: unknown }[];
    value: unknown;
    onChange: (v: unknown) => void;
    rightSlot?: React.ReactNode;
}) {
    return (
        <Row>
            <Label>{label}</Label>
            <select
                className="text-[11px] border rounded px-2 py-1"
                value={String(value ?? '')}
                onChange={(e) => onChange(e.target.value)}
            >
                {options.map((o, i) => (
                    <option key={`${o.label}-${i}`} value={String(o.value)}>
                        {o.label}
                    </option>
                ))}
            </select>
            {rightSlot}
        </Row>
    );
}

/** 문자열을 안전하게 따옴표로 감쌈 (WhenBuilder 프리셋에서 사용) */
function quoteString(s: string): string {
    return `'${s
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '\\t')}'`;
}

/* ───────────────── 바인딩 유틸 ───────────────── */

/** 값이 단일 머스태쉬 바인딩이면 내부 expr을 반환: {{ expr }} → 'expr' */
function extractBindingExpr(v: unknown): string | null {
    if (typeof v !== 'string') return null;
    const m = v.match(/^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/);
    return m ? m[1] : null;
}

/** expr을 머스태쉬로 감싸기 */
function wrapMustache(expr: string): string {
    return `{{ ${expr.trim()} }}`;
}

/* ───────────────── 바인딩 팝오버 컴포넌트 ───────────────── */

/**
 * BindingPopover
 * - 특정 propKey에 대해 바인딩을 설정/해제/수정
 * - 추천: data.* 키, node.* / project.* 프리픽스, 최근 사용 목록
 */
function BindingPopover({
                            propKey,
                            value,
                            onApply,
                            onClear,
                        }: {
    propKey: string;
    value: unknown;
    onApply: (expr: string) => void; // expr: 'data.x.y' 형태(머스태쉬 제외)
    onClear: () => void;
}) {
    const state = useEditor();
    const bound = extractBindingExpr(value); // null | 'data.xxx'
    const [open, setOpen] = React.useState(false);
    const [expr, setExpr] = React.useState(bound ?? 'data.');

    React.useEffect(() => {
        setExpr(bound ?? 'data.');
    }, [bound]);

    // data 키 추천(1-depth)
    const dataKeys = React.useMemo(
        () => Object.keys(state.data ?? {}),
        [state.data]
    );

    const recents = React.useMemo(() => {
        const raw = state.settings['recentBindings'] as unknown;
        return Array.isArray(raw)
            ? (raw as unknown[]).filter((x) => typeof x === 'string') as string[]
            : [];
    }, [state.settings]);

    const apply = () => {
        const trimmed = expr.trim();
        if (!trimmed) return;
        onApply(trimmed);
        // 최근 경로 push
        const key = 'recentBindings';
        const prevRaw = state.settings[key] as unknown;
        const prevArr = Array.isArray(prevRaw)
            ? ((prevRaw as unknown[]).filter(
                (x) => typeof x === 'string'
            ) as string[])
            : [];
        const filtered = prevArr.filter((s) => s !== trimmed);
        const next = [trimmed, ...filtered].slice(0, 8);
        state.setSetting(key, next);
        setOpen(false);
    };

    const clear = () => {
        onClear();
        setOpen(false);
    };

    const Btn = (
        <button
            className="text-[11px] px-2 py-1 border rounded hover:bg-neutral-50"
            onClick={() => setOpen((v) => !v)}
            type="button"
        >
            {bound ? ' Bound' : 'Bind'}
        </button>
    );

    return (
        <div className="relative">
            {Btn}
            {open && (
                <div className="absolute z-10 mt-1 w-[320px] p-2 rounded border bg-white shadow">
                    <div className="text-[11px] font-semibold mb-1">
                        {propKey} 바인딩
                    </div>

                    {/* 입력 */}
                    <input
                        className="text-[11px] border rounded px-2 py-1 w-full mb-2"
                        value={expr}
                        onChange={(e) => setExpr(e.target.value)}
                        placeholder="data.path or node.props.x or project.pages[0].name"
                    />

                    {/* 퀵 프리픽스 */}
                    <div className="flex gap-1 mb-2">
                        {(['data.', 'node.props.', 'project.'] as string[]).map((p) => (
                            <button
                                key={p}
                                className="text-[10px] px-1.5 py-0.5 border rounded hover:bg-neutral-50"
                                onClick={() =>
                                    setExpr((cur) => (cur.startsWith(p) ? cur : p))
                                }
                                type="button"
                                title={p}
                            >
                                {p}
                            </button>
                        ))}
                    </div>

                    {/* data 키 추천 */}
                    {dataKeys.length > 0 && (
                        <div className="mb-2">
                            <div className="text-[10px] text-neutral-400 mb-1">
                                data.* 제안
                            </div>
                            <div className="flex gap-1 flex-wrap">
                                {dataKeys.map((k) => (
                                    <button
                                        key={k}
                                        className="text-[10px] px-1.5 py-0.5 border rounded hover:bg-neutral-50"
                                        onClick={() => setExpr(`data.${k}`)}
                                        type="button"
                                        title={`data.${k}`}
                                    >
                                        data.{k}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 최근 사용 */}
                    {recents.length > 0 && (
                        <div className="mb-2">
                            <div className="text-[10px] text-neutral-400 mb-1">최근</div>
                            <div className="flex gap-1 flex-wrap">
                                {recents.map((r, i) => (
                                    <button
                                        key={`${r}-${i}`}
                                        className="text-[10px] px-1.5 py-0.5 border rounded hover:bg-neutral-50"
                                        onClick={() => setExpr(r)}
                                        type="button"
                                        title={r}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 액션 */}
                    <div className="flex items-center justify-between">
                        <button
                            className="text-[11px] px-2 py-1 border rounded hover:bg-neutral-50"
                            onClick={apply}
                            type="button"
                        >
                            Apply
                        </button>
                        <div className="flex gap-2">
                            <button
                                className="text-[11px] px-2 py-1 border rounded hover:bg-neutral-50"
                                onClick={() => setOpen(false)}
                                type="button"
                            >
                                Close
                            </button>
                            <button
                                className="text-[11px] px-2 py-1 border rounded hover:bg-red-50"
                                onClick={clear}
                                type="button"
                            >
                                Clear
                            </button>
                        </div>
                    </div>

                    <div className="text-[10px] mt-2 text-neutral-400">
                        실제 값은 <code>{'{{}}'}</code>로 감싸 적용됩니다:{' '}
                        <code>{`{{ ${expr.trim()} }}`}</code>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ───────────────── 조건 프리셋(가시성) ───────────────── */

function ConditionPresetRow({ propKey, nodeId }: { propKey: string; nodeId: NodeId }) {
    const state = useEditor();
    const node = state.project.nodes[nodeId];
    const withMeta = node.props as NodePropsWithMeta;

    const readWhen = (): string =>
        withMeta.__propVisibility?.[propKey]?.whenExpr ?? '';

    const writeWhen = (expr: string) => {
        const trimmed = expr.trim();
        state.update((s: EditorState) => {
            const props = s.project.nodes[nodeId].props as NodePropsWithMeta;
            const cur = props.__propVisibility ?? {};
            const next = { ...cur };
            if (!trimmed) {
                if (next[propKey]) {
                    const { [propKey]: _omit, ...rest } = next;
                    props.__propVisibility = rest;
                }
            } else {
                next[propKey] = { whenExpr: trimmed };
                props.__propVisibility = next;
            }
        });
    };

    const [open, setOpen] = React.useState(false);
    const current = readWhen();

    // builder-like 인라인 컨트롤 (간단 프리셋)
    const [dataPath, setDataPath] = React.useState('user.role');
    const [boolVal, setBoolVal] = React.useState<'true' | 'false'>('true');
    const [textVal, setTextVal] = React.useState('');
    const [propEqualsVal, setPropEqualsVal] = React.useState('');
    const [notNullPath, setNotNullPath] = React.useState('user.id');

    const apply = (expr: string) => writeWhen(expr);

    return (
        <div className="ml-auto">
            <button
                className="text-[11px] px-2 py-1 border rounded hover:bg-neutral-50"
                onClick={() => setOpen((v) => !v)}
                title="이 프로퍼티의 표시 조건을 구성합니다"
                type="button"
            >
                조건(when)
            </button>

            {open && (
                <div className="mt-1 border rounded p-2">
                    {/* 프리셋 그리드 */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        {/* data.path == true/false */}
                        <div className="space-y-1">
                            <div className="text-[10px] text-neutral-500">
                                data.path == true/false
                            </div>
                            <input
                                className="text-[11px] border rounded px-2 py-1 w-full"
                                value={dataPath}
                                onChange={(e) => setDataPath(e.target.value)}
                            />
                            <select
                                className="text-[11px] border rounded px-2 py-1"
                                value={boolVal}
                                onChange={(e) =>
                                    setBoolVal(e.target.value as 'true' | 'false')
                                }
                            >
                                <option value="true">true</option>
                                <option value="false">false</option>
                            </select>
                            <button
                                className="text-[11px] px-2 py-1 border rounded hover:bg-neutral-50"
                                onClick={() => apply(`data.${dataPath.trim()} == ${boolVal}`)}
                                type="button"
                            >
                                적용
                            </button>
                        </div>

                        {/* data.path == 'text' */}
                        <div className="space-y-1">
                            <div className="text-[10px] text-neutral-500">
                                data.path == 'text'
                            </div>
                            <input
                                className="text-[11px] border rounded px-2 py-1 w-full"
                                value={dataPath}
                                onChange={(e) => setDataPath(e.target.value)}
                            />
                            <input
                                className="text-[11px] border rounded px-2 py-1 w-full"
                                value={textVal}
                                onChange={(e) => setTextVal(e.target.value)}
                            />
                            <button
                                className="text-[11px] px-2 py-1 border rounded hover:bg-neutral-50"
                                onClick={() =>
                                    apply(`data.${dataPath.trim()} == ${quoteString(textVal)}`)
                                }
                                type="button"
                            >
                                적용
                            </button>
                        </div>

                        {/* node.props.propKey == 'text' */}
                        <div className="space-y-1">
                            <div className="text-[10px] text-neutral-500">
                                node.props.{propKey} == 'text'
                            </div>
                            <input
                                className="text-[11px] border rounded px-2 py-1 w-full"
                                value={propEqualsVal}
                                onChange={(e) => setPropEqualsVal(e.target.value)}
                            />
                            <button
                                className="text-[11px] px-2 py-1 border rounded hover:bg-neutral-50"
                                onClick={() =>
                                    apply(
                                        `node.props.${propKey} == ${quoteString(propEqualsVal)}`
                                    )
                                }
                                type="button"
                            >
                                적용
                            </button>
                        </div>

                        {/* data.path != null */}
                        <div className="space-y-1">
                            <div className="text-[10px] text-neutral-500">
                                data.path != null
                            </div>
                            <input
                                className="text-[11px] border rounded px-2 py-1 w-full"
                                value={notNullPath}
                                onChange={(e) => setNotNullPath(e.target.value)}
                            />
                            <button
                                className="text-[11px] px-2 py-1 border rounded hover:bg-neutral-50"
                                onClick={() =>
                                    apply(`data.${notNullPath.trim()} != null`)
                                }
                                type="button"
                            >
                                적용
                            </button>
                        </div>
                    </div>

                    {/* 현재값 미리보기/편집 (WhenBuilder) */}
                    <WhenBuilder
                        onChange={(expr) => apply(expr)}
                        previewNodeId={nodeId}
                        className="border rounded p-2 text-[11px]"
                    />
                </div>
            )}
        </div>
    );
}

/* ───────────────── 메인 ───────────────── */

export function PropsAutoSection({
                                     nodeId,
                                     defId,
                                 }: {
    nodeId: NodeId;
    defId: string;
}) {
    // 훅(최상위)
    const state = useEditor();
    const node = state.project.nodes[nodeId];
    const defBase = getDefinition(defId);

    // 프로젝트 스키마 오버라이드가 있으면 우선 사용
    const override = state.project.schemaOverrides?.[defId];
    const entriesAll =
        ((override ?? defBase?.propsSchema ?? []) as Array<
            PropSchemaEntry<Record<string, unknown>>
        >) || [];

    // 🚫 As 관련 키 전면 배제: 'as', 내부 전환용 '__tag', 태그 속성 컨테이너 '__tagAttrs'
    const entries = entriesAll.filter((e) => {
        const k = String(e.key);
        return k !== 'as' && k !== '__tag' && k !== '__tagAttrs';
    });

    const values = node.props as Record<string, unknown>;
    const withMeta = node.props as NodePropsWithMeta;

    // 표시 여부 판단
    const shouldShow = (entry: PropSchemaEntry<Record<string, unknown>>): boolean => {
        const key = entry.key as string;

        // 1) 노드 오버라이드 whenExpr
        const expr = withMeta.__propVisibility?.[key]?.whenExpr;
        if (expr && expr.trim()) {
            const ok = evalWhenExpr(expr, { data: state.data, node, project: state.project });
            if (!ok) return false;
        }

        // 2) 스키마 when(동등)
        if ('when' in entry && entry.when) {
            const ok = Object.entries(entry.when).every(([k, v]) => values[k] === v);
            if (!ok) return false;
        }

        // 3) 스키마 whenExpr
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

    // 바인딩 적용/해제
    const applyBinding = (key: string, expr: string) => {
        onChange(key, wrapMustache(expr));
    };

    const clearBinding = (key: string) => {
        // 텍스트는 빈 문자열, 셀렉트는 undefined로 초기화(필요 시 def.defaults.props 사용 고려 가능)
        const entry = entries.find((e) => (e.key as string) === key);
        if (entry?.type === 'select') {
            onChange(key, undefined);
        } else {
            onChange(key, '');
        }
    };

    return (
        <section className="space-y-2">
            <div className="text-[11px] font-semibold text-neutral-700 px-1">
                props -------------------------
            </div>

            <div className="text-[11px] text-neutral-500 px-1 mb-1">
                값 옆 Bind 버튼으로 데이터/노드/프로젝트에 바인딩할 수 있습니다.
            </div>

            {entries.filter(shouldShow).map((e) => {
                const k = e.key as string;
                const val = values[k];
                const bound = extractBindingExpr(val);

                const bindBtn = (
                    <BindingPopover
                        propKey={k}
                        value={val}
                        onApply={(expr) => applyBinding(k, expr)}
                        onClear={() => clearBinding(k)}
                    />
                );

                return (
                    <div key={k} className="flex items-center gap-2 px-1">
                        {e.type === 'text' && (
                            <TextField
                                label={e.label ?? k}
                                value={String(val ?? '')}
                                placeholder={e.placeholder as string | undefined}
                                onChange={(v) => onChange(k, v)}
                                rightSlot={bindBtn}
                            />
                        )}

                        {e.type === 'select' && (
                            <SelectField
                                label={e.label ?? k}
                                options={e.options}
                                value={val}
                                onChange={(v) => onChange(k, v)}
                                rightSlot={bindBtn}
                            />
                        )}

                        {/* 조건식 프리셋 + WhenBuilder 토글 */}
                        <ConditionPresetRow propKey={k} nodeId={nodeId} />

                        {/* 바인딩 상태 라벨(선택) */}
                        {bound && (
                            <div className="text-[10px] text-neutral-400 ml-auto">
                                바인딩: <code>{`{{ ${bound} }}`}</code>
                            </div>
                        )}
                    </div>
                );
            })}
        </section>
    );
}