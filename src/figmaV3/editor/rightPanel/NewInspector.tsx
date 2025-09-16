'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    INSPECTOR_STYLE,
    type InspectorStyle,
    type SectionSpec,
    type GroupSpec,
    type PropertySpec,
    type DependentGroupSpec,
    type WhenExpr,
    type UISize,
    type UIWidth,
} from './InspectorStyle';

import {
    ChevronDown,
    ChevronRight,
    Info,
    Wand2,
    Lock,
    Unlock,
    Layout as LayoutIcon,
    Maximize,
    MoveHorizontal,
    Type as TypeIcon,
    Text as TextIcon,
    Palette,
    Sparkles,
    Hand,
    Square,
    Grid2x2,
} from 'lucide-react';

import { getIconFor } from './InspectorStyleIcons';

type Props = {
    nodeId: string;
    defId: string;
    width?: number; // default 360

    /** WhenExpr 평가용 컨텍스트(부모/컨테이너 정보) */
    isContainer?: boolean;
    parentDisplay?: string | null;
};

type Values = Record<string, string | undefined>;
type Expanded = Record<string, boolean>;

const SECTION_ORDER: (keyof InspectorStyle)[] = [
    'Layout',
    'Typography',
    'Appearance',
    'Effects',
    'Interactivity',
];

const SECTION_ICONS: Partial<
    Record<keyof InspectorStyle, React.ComponentType<{ size?: number; className?: string }>>
> = {
    Layout: LayoutIcon,
    Typography: TypeIcon,
    Appearance: Palette,
    Effects: Sparkles,
    Interactivity: Hand,
};

const GROUP_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    'Display & Flow': Grid2x2,
    Sizing: Maximize,
    Spacing: MoveHorizontal,
    Font: TypeIcon,
    Text: TextIcon,
    Border: Square,
};

/** Row = 좌 2, 우 7 / 우측 끝 상세 토글 (Lock은 그룹 헤더로 이동) */
const RowShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="grid grid-cols-9 gap-[4px] py-[4px] px-[6px] border-b border-neutral-100 items-center">
        {children}
    </div>
);

const LeftCell: React.FC<{ title: string; tooltip?: string }> = ({ title, tooltip }) => (
    <div className="col-span-2 flex flex-col justify-center">
        <div className="text-[11px] font-medium leading-[14px] text-neutral-800" title={tooltip}>
            {title}
        </div>
    </div>
);

const RightCell: React.FC<{
    children: React.ReactNode;
    onToggleDetail?: () => void;
    detailActive?: boolean;
}> = ({ children, onToggleDetail, detailActive }) => (
    <div className="col-span-7 grid grid-cols-10 items-center gap-[4px]">
        <div className="col-span-9 min-w-0 flex items-center">{children}</div>
        <div className="col-span-1 flex justify-center">
            {onToggleDetail ? (
                <button
                    className={`p-1 rounded hover:bg-neutral-100 ${detailActive ? 'text-blue-600' : ''}`}
                    title="상세"
                    onClick={onToggleDetail}
                    type="button"
                >
                    {detailActive ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
            ) : null}
        </div>
    </div>
);

/** 메인 섹션 프레임 — 기존 스타일 유지 */
const SectionFrame: React.FC<{
    title: string;
    Icon?: React.ComponentType<{ size?: number; className?: string }>;
    collapsed?: boolean;
    onToggle?: () => void;
    children: React.ReactNode;
}> = ({ title, Icon, collapsed, onToggle, children }) => (
    <section className="mb-5">
        <div className="rounded-lg bg-neutral-50 border border-neutral-200">
            <div className="px-3 py-1.5">
                <div className="flex items-center">
                    {Icon ? <Icon size={14} className="text-neutral-700 mr-2" /> : null}
                    <div className="text-[12px] font-bold text-neutral-900">{title}</div>
                    <div className="ml-auto">
                        <button
                            className="p-1 rounded hover:bg-neutral-100"
                            title={collapsed ? '펼치기' : '접기'}
                            onClick={onToggle}
                            type="button"
                        >
                            {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                        </button>
                    </div>
                </div>
            </div>
            {!collapsed && (
                <div className="p-2">
                    <div className="rounded-lg border border-neutral-200 bg-white">{children}</div>
                </div>
            )}
        </div>
    </section>
);

/** 그룹 헤더: 좌측 라벨/아이콘, 우측 Lock 버튼(요구사항) */
const GroupHeader: React.FC<{
    label: string;
    iconKey?: string;
    locked?: boolean;
    onToggleLock?: () => void;
}> = ({ label, iconKey, locked, onToggleLock }) => {
    const Icon = iconKey ? GROUP_ICONS[iconKey] : undefined;
    return (
        <div className="px-3 py-2 border-b border-neutral-200 bg-transparent">
            <div className="flex items-center">
                {Icon ? <Icon size={13} className="text-neutral-700 mr-2" /> : null}
                <div className="text-[11px] font-semibold text-neutral-800">{label}</div>
                <div className="ml-auto">
                    <button
                        className="p-1 rounded hover:bg-neutral-100 text-neutral-600"
                        title={locked ? 'Unlock' : 'Lock'}
                        onClick={onToggleLock}
                        type="button"
                    >
                        {locked ? <Unlock size={14} /> : <Lock size={14} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ============================ 유틸 ============================ */
function toLabel(v: any, fallback: string) {
    if (!v) return fallback;
    if (typeof v === 'string') return v;
    return v.ko ?? v.en ?? fallback;
}

function normalizeColor(v?: string) {
    if (!v) return '#000000';
    if (v.startsWith('#')) return v;
    return '#000000';
}

function sizeClass(size?: UISize) {
    switch (size) {
        case 'xs':
            return 'h-6 text-[11px]';
        case 'sm':
            return 'h-7 text-[12px]';
        case 'md':
            return 'h-8 text-[12px]';
        case 'lg':
            return 'h-9 text-[13px]';
        case 'xl':
            return 'h-10 text-[14px]';
        default:
            return 'h-7 text-[12px]';
    }
}

function toCssWidth(w?: UIWidth) {
    if (w == null) return undefined;
    if (typeof w === 'number') return `${w}px`;
    return w;
}

/** WhenExpr 평가 */
function evalWhen(
    expr: WhenExpr | undefined,
    ctx: { isContainer?: boolean; parentDisplay?: string | null },
    values: Values
): boolean {
    if (!expr) return true;

    if ('all' in expr) return expr.all.every((e) => evalWhen(e, ctx, values));
    if ('any' in expr) return expr.any.some((e) => evalWhen(e, ctx, values));
    if ('not' in expr) return !evalWhen(expr.not, ctx, values);

    if ('context' in expr) {
        const cur = expr.context === 'isContainer' ? !!ctx.isContainer : (ctx.parentDisplay ?? '');
        if ('is' in expr) return cur === expr.is;
        if ('in' in expr && Array.isArray(expr.in)) return (expr.in as any[]).includes(cur as any);
        return false;
    }
    if ('value' in expr) {
        // cssKey 제거 → propKey가 곧 값 키
        const cur = values[expr.value] ?? '';
        if ('is' in expr) return cur === String(expr.is);
        if ('in' in expr && Array.isArray(expr.in)) return (expr.in as any[]).map(String).includes(String(cur));
        return false;
    }
    return true;
}

/* ===================== 컨트롤 렌더러 (UI/UX 유지) ===================== */
function ControlRenderer(props: {
    sectionKey: string;
    propKey: string;
    spec: PropertySpec;
    value: string | undefined;
    onChange: (v: string) => void;
    disabled?: boolean;
}) {
    const { sectionKey, propKey, spec, value, onChange, disabled } = props;
    const group = sectionKey.toLowerCase();
    const isColor = spec.control === 'color' || propKey.toLowerCase().includes('color');
    const ui = spec.ui;

    const baseCls = `px-2 border border-neutral-200 rounded ${sizeClass(ui?.size)} ${
        disabled ? 'opacity-60 cursor-not-allowed bg-neutral-50' : ''
    }`;

    // SELECT
    if (spec.control === 'select') {
        const opts = spec.options ?? [];
        return (
            <select
                className={`${baseCls} w-full`}
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
            >
                <option value="">{'(unset)'}</option>
                {opts.map((op, idx) => {
                    const val = String(op.value);
                    return (
                        <option key={`${propKey}:opt:${val}:${idx}`} value={val}>
                            {toLabel(op.label, val)}
                        </option>
                    );
                })}
            </select>
        );
    }

    // RADIO / CHECKBOX
    if (spec.control === 'radio' || spec.control === 'checkbox') {
        const opts = spec.options ?? [];
        const isMulti = spec.control === 'checkbox';
        const selSet = new Set((isMulti ? (value ?? '').split(/\s*,\s*/) : [value ?? '']).filter(Boolean));

        const toggle = (val: string) => {
            if (!isMulti) return onChange(val);
            const next = new Set(selSet);
            if (next.has(val)) next.delete(val);
            else next.add(val);
            onChange(Array.from(next).join(','));
        };

        return (
            <div className="flex flex-wrap gap-1">
                {opts.map((op, idx) => {
                    const val = String(op.value);
                    const active = selSet.has(val);
                    return (
                        <button
                            key={`${propKey}:rb:${val}:${idx}`}
                            className={`rounded border ${sizeClass(ui?.size)} text-[10px] px-1.5 ${
                                disabled
                                    ? 'opacity-60 cursor-not-allowed border-neutral-200 bg-neutral-50'
                                    : active
                                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                                        : 'border-neutral-200 hover:bg-neutral-50'
                            }`}
                            onClick={() => !disabled && toggle(val)}
                            title={toLabel(op.label, val)}
                            disabled={disabled}
                            type="button"
                        >
                            {toLabel(op.label, val)}
                        </button>
                    );
                })}
            </div>
        );
    }

    // CHIPS / ICONS (chips도 option.iconKey가 있으면 아이콘 표시)
    // NewInspector.tsx - ControlRenderer 내부의 "CHIPS / ICONS" 분기 전체를 이 블록으로 교체

// CHIPS / ICONS (chips도 option.iconKey가 있으면 아이콘 표시)
    if (spec.control === 'chips' || spec.control === 'icons') {
        const opts =
            (spec.options && spec.options.length > 0
                ? spec.options
                : (spec.presets ?? []).map((p) => ({
                    value: p.value,
                    label: p.label ? { ko: p.label } : undefined,
                    iconKey: (p as any).icon,
                }))) as Array<{ value: string | number; label?: any; iconKey?: string; disabled?: boolean }>;

        // ✅ iconKey가 "layout.display:flex" 같은 정규화된 키라면 파싱해서 getIconFor에 넘겨준다.
        const resolveIcon = (hint: string | undefined, fallbackVal: string) => {
            if (!hint || hint.trim() === '') {
                return getIconFor(group, propKey, fallbackVal);
            }
            const h = hint.trim();

            // fully-qualified: "<group>.<prop>:<value>"
            const hasDot = h.includes('.');
            const hasColon = h.includes(':');
            if (hasDot && hasColon) {
                const [g, rest] = h.split('.', 2);
                const [p, v] = rest.split(':', 2);
                if (g && p && v) {
                    return getIconFor(g.toLowerCase(), p, v);
                }
            }

            // value-only 힌트로 해석
            return getIconFor(group, propKey, h);
        };

        const Chips = (
            <div className="flex flex-wrap items-center gap-[4px] min-w-0 max-w-full">
                {opts.map((op, idx) => {
                    const val = String(op.value);
                    const active = val === value;

                    // chips라도 iconKey가 있으면 아이콘 사용
                    const wantIcon = spec.control === 'icons' || !!op.iconKey;
                    const Icon = wantIcon ? resolveIcon(op.iconKey, val) : null;

                    return (
                        <button
                            key={`${propKey}:chip:${val}:${idx}`}
                            className={`h-6 px-1.5 rounded border text-[10px] flex items-center gap-1 ${
                                disabled
                                    ? 'opacity-60 cursor-not-allowed border-neutral-200 bg-neutral-50'
                                    : active
                                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                                        : 'border-neutral-200 hover:bg-neutral-50'
                            }`}
                            title={(op.label && (op.label.ko || op.label.en)) || spec.description || val}
                            onClick={() => !disabled && !op.disabled && onChange(val)}
                            disabled={disabled}
                            type="button"
                        >
                            {Icon ? <Icon size={12} className="shrink-0" /> : null}
                            {!Icon ? ((op.label && (op.label.ko || op.label.en)) || val) : null}
                        </button>
                    );
                })}
            </div>
        );

        const extra = spec.ui?.extraInput?.enabled ? (
            <input
                className={`${baseCls}`}
                style={{ width: toCssWidth(spec.ui?.extraInput?.width), maxWidth: '100%' }}
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={spec.ui?.extraInput?.placeholder || spec.placeholder || spec.description}
                disabled={disabled}
                type={spec.ui?.extraInput?.type === 'number' ? 'number' : 'text'}
            />
        ) : null;

        if (!extra) return Chips;

        return (
            <div className="flex items-center gap-[6px] w-full min-w-0 max-w-full">
                {Chips}
                {extra}
            </div>
        );
    }

    // COLOR
    if (isColor) {
        const cur = normalizeColor(value);
        return (
            <div className="flex items-center gap-2 w-full">
                <input
                    type="color"
                    className="h-6 w-7 p-0 border border-neutral-200 rounded"
                    value={cur}
                    onChange={(e) => onChange(e.target.value)}
                    title="Pick color"
                    disabled={disabled}
                />
                <input
                    type="text"
                    className={`${baseCls} w-full`}
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="#000000 or rgba()"
                    disabled={disabled}
                />
            </div>
        );
    }

    // ratio
    if (spec.control === 'ratio') {
        return (
            <input
                className={`${baseCls} w-full`}
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={spec.placeholder || 'ex) 1/1'}
                disabled={disabled}
            />
        );
    }

    // shorthand
    if (spec.shorthand?.enabled) {
        const placeholder = spec.shorthand.examples?.[0] ?? spec.shorthand.syntax ?? 'shorthand';
        const hint = spec.shorthand.syntax;
        return (
            <input
                className={`${baseCls} w-full`}
                placeholder={placeholder}
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                title={hint}
                disabled={disabled}
            />
        );
    }

    // 기본 input
    return (
        <input
            className={`${baseCls} w-full`}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={spec.placeholder || spec.description}
            disabled={disabled}
            type={spec.ui?.inputType ?? 'text'}
        />
    );
}

/* 종속 그룹 블록 */
const DependentBlock: React.FC<{
    title?: string;
    propsMap: Record<string, PropertySpec>;
    values: Values;
    setValue: (key: string, v: string) => void;
    sectionKey: string;
    groupLocked?: boolean;
}> = ({ title, propsMap, values, setValue, sectionKey, groupLocked }) => {
    const entries = Object.entries(propsMap);
    if (entries.length === 0) return null;

    return (
        <div className="ml-4 border-l border-neutral-200 pl-3 mt-1">
            {title ? (
                <div className="text-[10px] text-neutral-500 mb-1 flex items-center gap-1">
                    <Info size={12} />
                    {title}
                </div>
            ) : null}
            {entries.map(([k, p]) => {
                const rowKey = `dep:${sectionKey}:${k}`;
                const v = values[k];
                const disabled = !!(groupLocked && p.ui?.lockUnit);
                return (
                    <RowShell key={rowKey}>
                        <LeftCell title={toLabel(p.label, k)} tooltip={p.ui?.tooltip} />
                        <RightCell>
                            <ControlRenderer
                                sectionKey={sectionKey}
                                propKey={k}
                                spec={p}
                                value={v}
                                onChange={(val) => setValue(k, val)}
                                disabled={disabled}
                            />
                        </RightCell>
                    </RowShell>
                );
            })}
        </div>
    );
};

/* 상세 블록 */
const DetailBlock: React.FC<{
    propsMap?: Record<string, PropertySpec>;
    values: Values;
    setValue: (key: string, v: string) => void;
    sectionKey: string;
    groupLocked?: boolean;
}> = ({ propsMap, values, setValue, sectionKey, groupLocked }) => {
    if (!propsMap) return null;
    const entries = Object.entries(propsMap);
    if (entries.length === 0) return null;

    return (
        <div className="ml-4 border-l border-dashed border-neutral-200 pl-3 mt-2">
            <div className="text-[10px] text-neutral-500 mb-1 flex items-center gap-1">
                <Wand2 size={12} />
                상세
            </div>
            {entries.map(([k, p]) => {
                const detailKey = `detail:${sectionKey}:${k}`;
                const v = values[k];
                const disabled = !!(groupLocked && p.ui?.lockUnit);

                const mainRow = (
                    <RowShell key={`${detailKey}.__row`}>
                        <LeftCell title={toLabel(p.label, k)} tooltip={p.ui?.tooltip} />
                        <RightCell>
                            <ControlRenderer
                                sectionKey={sectionKey}
                                propKey={k}
                                spec={p}
                                value={v}
                                onChange={(val) => setValue(k, val)}
                                disabled={disabled}
                            />
                        </RightCell>
                    </RowShell>
                );

                const depGroups: DependentGroupSpec[] = [];
                if (p.dependentProperties) {
                    if (v && p.dependentProperties[v]) depGroups.push(p.dependentProperties[v]);
                    if (p.dependentProperties['*']) depGroups.push(p.dependentProperties['*']);
                }

                return (
                    <div key={detailKey}>
                        {mainRow}
                        {depGroups.length > 0 && (
                            <div>
                                {depGroups.map((g, idx) => (
                                    <DependentBlock
                                        key={`${detailKey}.__dep.${idx}`}
                                        title={toLabel(g.label, '')}
                                        propsMap={g.properties}
                                        values={values}
                                        setValue={setValue}
                                        sectionKey={sectionKey}
                                        groupLocked={groupLocked}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

function defaultFromSpec(prop: PropertySpec): string | undefined {
    if (prop.control === 'select' && prop.options && prop.options.length > 0) {
        return String(prop.options[0].value);
    }
    if (prop.control === 'chips' || prop.control === 'icons') {
        if (prop.options && prop.options.length > 0) return String(prop.options[0].value);
        if (prop.presets && prop.presets.length > 0) return String(prop.presets[0].value);
    }
    return undefined;
}

/* ============================== 메인 ============================== */
export const NewInspector: React.FC<Props> = ({
                                                  nodeId,
                                                  defId,
                                                  width = 340,
                                                  isContainer = true,
                                                  parentDisplay = 'flex',
                                              }) => {
    const [values, setValues] = useState<Values>({});
    const [expandedDetail, setExpandedDetail] = useState<Expanded>({});
    const [collapsedSection, setCollapsedSection] = useState<Record<string, boolean>>({});
    // 그룹 단위 Lock (그룹 헤더 우측)
    const [lockedGroups, setLockedGroups] = useState<Record<string, boolean>>({});

    const style = useMemo(() => INSPECTOR_STYLE, []);
    const ctx = useMemo(() => ({ isContainer, parentDisplay }), [isContainer, parentDisplay]);

    // 초기값 부트스트랩 (propKey 기반)
    useEffect(() => {
        const next: Values = {};
        (SECTION_ORDER as (keyof InspectorStyle)[]).forEach((secKey) => {
            const sec = (style as any)[secKey] as SectionSpec | undefined;
            if (!sec) return;
            Object.entries(sec.groups).forEach(([groupKey, group]: [string, GroupSpec]) => {
                Object.entries(group.properties).forEach(([propKey, prop]) => {
                    const defVal = defaultFromSpec(prop);
                    if (defVal !== undefined && next[propKey] === undefined) {
                        next[propKey] = defVal;
                    }
                });
            });
        });
        if (Object.keys(next).length > 0) {
            setValues((prev) => ({ ...next, ...prev }));
        }
    }, [style]);

    const setValue = (key: string, v: string) => {
        setValues((prev) => ({ ...prev, [key]: v }));
        // TODO: editorStore와 연동 (예: updateNodeStyles(nodeId, { [key]: v }))
    };

    const toggleDetail = (rowKey: string) => {
        setExpandedDetail((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }));
    };

    const toggleGroupLock = (secKey: string, groupKey: string) => {
        const k = `${secKey}.${groupKey}`;
        setLockedGroups((prev) => ({ ...prev, [k]: !prev[k] }));
    };

    const getActiveDependentGroups = (
        propKey: string,
        prop: PropertySpec,
        currentValue?: string
    ): DependentGroupSpec[] => {
        if (!prop.dependentProperties) return [];
        const out: DependentGroupSpec[] = [];

        // 모든 정의를 순회하면서 *, exact, *:wildcard 모두 후보 포함
        for (const [k, g] of Object.entries(prop.dependentProperties)) {
            const match = k === '*' || k === (currentValue ?? '') || k.startsWith('*:');
            if (match && evalWhen(g.displayWhen, ctx, values)) {
                out.push(g);
            }
        }
        return out;
    };

    const renderPropertyRow = (
        sectionKey: keyof InspectorStyle,
        groupKey: string,
        propKey: string,
        prop: PropertySpec,
        groupLocked: boolean
    ) => {
        // 프로퍼티 자체 표시 조건
        if (!evalWhen(prop.displayWhen, ctx, values)) return null;

        const title = toLabel(prop.label, propKey);
        const mainKey = `${sectionKey}.${groupKey}.${propKey}`;
        const v = values[propKey];
        const hasDetail = !!prop.detailProperties;
        const detailOpen = expandedDetail[mainKey] === true;
        const disabled = !!(groupLocked && prop.ui?.lockUnit);

        const controls = (
            <ControlRenderer
                sectionKey={String(sectionKey)}
                propKey={propKey}
                spec={prop}
                value={v}
                onChange={(nv) => setValue(propKey, nv)}
                disabled={disabled}
            />
        );

        const row = (
            <RowShell key={`${mainKey}.__row`}>
                <LeftCell title={title} tooltip={prop.ui?.tooltip} />
                <RightCell
                    onToggleDetail={hasDetail ? () => toggleDetail(mainKey) : undefined}
                    detailActive={detailOpen}
                >
                    {controls}
                </RightCell>
            </RowShell>
        );

        const depGroups = getActiveDependentGroups(propKey, prop, v);
        const depBlock =
            depGroups.length > 0 ? (
                <div key={`${mainKey}.__depwrap`}>
                    {depGroups.map((g, idx) => (
                        <DependentBlock
                            key={`${mainKey}.__dep.${idx}`}
                            title={toLabel(g.label, '')}
                            propsMap={g.properties}
                            values={values}
                            setValue={setValue}
                            sectionKey={String(sectionKey)}
                            groupLocked={groupLocked}
                        />
                    ))}
                </div>
            ) : null;

        const detail =
            hasDetail && detailOpen ? (
                <DetailBlock
                    key={`${mainKey}.__detail`}
                    propsMap={prop.detailProperties}
                    values={values}
                    setValue={setValue}
                    sectionKey={String(sectionKey)}
                    groupLocked={groupLocked}
                />
            ) : null;

        return (
            <div key={`${mainKey}.__wrap`}>
                {row}
                {depBlock}
                {detail}
            </div>
        );
    };

    const renderGroup = (sectionKey: keyof InspectorStyle, groupKey: string, group: GroupSpec) => {
        const entries = Object.entries(group.properties);
        const groupId = `${sectionKey}.${groupKey}`;
        const locked = !!lockedGroups[groupId];

        return (
            <div key={groupId} className="border-b border-neutral-200">
                <GroupHeader
                    label={toLabel(group.label, groupKey)}
                    iconKey={groupKey}
                    locked={locked}
                    onToggleLock={() => toggleGroupLock(String(sectionKey), groupKey)}
                />
                <div>
                    {entries.map(([propKey, prop]) =>
                        renderPropertyRow(sectionKey, groupKey, propKey, prop, locked),
                    )}
                </div>
            </div>
        );
    };

    const renderSection = (sectionKey: keyof InspectorStyle, section: SectionSpec) => {
        const groups = Object.entries(section.groups);
        const SecIcon = SECTION_ICONS[sectionKey];
        const collapsed = !!collapsedSection[sectionKey as string];

        return (
            <SectionFrame
                key={`sec:${String(sectionKey)}`} // key 경고 해결
                title={toLabel(section.label, String(sectionKey))}
                Icon={SecIcon}
                collapsed={collapsed}
                onToggle={() =>
                    setCollapsedSection((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey as string] }))
                }
            >
                {groups.map(([gk, g]) => renderGroup(sectionKey, gk, g))}
            </SectionFrame>
        );
    };

    return (
        <div style={{ width }} className="text-[11px] text-neutral-800 min-w-0 max-w-full">
            {SECTION_ORDER.map((sec) => renderSection(sec, (style as any)[sec] as SectionSpec))}
        </div>
    );
};

export default NewInspector;