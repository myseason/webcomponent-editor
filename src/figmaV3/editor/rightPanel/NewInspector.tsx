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
    type LocaleLabel,
    type Option, // ← 추가
} from './InspectorStyle';

import {
    Lock, Unlock, ChevronDown, ChevronRight, Info, Wand2,
    Layout as LayoutIcon, Maximize, MoveHorizontal, Type as TypeIcon, Text as TextIcon,
    Palette, Sparkles, Hand, Square, Grid2x2
} from 'lucide-react';

import { getIconFor } from './InspectorStyleIcons';

// ─────────────────────────────────────────────────────────────
// Props & State Types
// ─────────────────────────────────────────────────────────────
type Props = {
    nodeId: string;
    defId: string;
    width?: number; // default 360
};

type Values = Record<string, string>;
type Expanded = Record<string, boolean>;

// ─────────────────────────────────────────────────────────────
// Static Mappings
// ─────────────────────────────────────────────────────────────
const SECTION_ORDER: (keyof InspectorStyle)[] = [
    'Layout',
    'Typography',
    'Appearance',
    'Effects',
    'Interactivity',
];

const SECTION_ICONS: Partial<Record<keyof InspectorStyle, React.ComponentType<{ size?: number; className?: string }>>> = {
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

// ─────────────────────────────────────────────────────────────
// Helpers (UI)
// ─────────────────────────────────────────────────────────────
/** 두 줄 레이아웃 (Left 2 : Right 7) - 오른쪽은 내부 10분할 (controls: 9, detail:1) */
const RowShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="grid grid-cols-9 gap-[4px] py-[4px] px-[6px] border-b border-neutral-100 items-center overflow-x-hidden">
        {children}
    </div>
);

const LeftCell: React.FC<{ title: string; subtitle?: string; tooltip?: string }> = ({ title, subtitle, tooltip }) => (
    <div className="col-span-2 flex flex-col justify-center min-w-0">
        <div className="text-[11px] font-medium leading-[14px] text-neutral-800 truncate" title={tooltip || title}>
            {title}
        </div>
        {subtitle ? <div className="text-[10px] text-neutral-500 ml-[8px] leading-[12px] truncate">{subtitle}</div> : null}
    </div>
);

const RightCell: React.FC<{
    children: React.ReactNode;
    onToggleDetail?: () => void;
    detailActive?: boolean;
}> = ({ children, onToggleDetail, detailActive }) => (
    <div className="col-span-7 grid grid-cols-10 items-center gap-[4px] min-w-0">
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

/** 섹션 프레임 (접기/펼치기) */
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
                    <div className="rounded-lg border border-neutral-200 bg-white overflow-x-hidden">{children}</div>
                </div>
            )}
        </div>
    </section>
);

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
                        className="p-1 rounded hover:bg-neutral-100"
                        title={locked ? 'Unlock' : 'Lock'}
                        onClick={onToggleLock}
                        type="button"
                    >
                        {locked ? <Lock size={14}/> : <Unlock size={14} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// Helpers (data/format)
// ─────────────────────────────────────────────────────────────
const toLabel = (lbl?: LocaleLabel, fallback?: string) => lbl?.ko ?? lbl?.en ?? fallback ?? '';

function normalizeColor(v?: string) {
    if (!v) return '#000000';
    if (v.startsWith('#')) return v;
    return '#000000';
}

/** extra input width는 스키마에서 제거 → 사이즈 힌트만 해석 */
function freeInputClass(size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | undefined) {
    switch (size) {
        case 'xs': return 'min-w-[64px] w-[96px]';
        case 'sm': return 'min-w-[96px] w-[128px]';
        case 'md': return 'min-w-[120px] w-[160px]';
        case 'lg': return 'w-full';
        case 'xl': return 'w-full';
        default:   return 'min-w-[120px] w-[160px]';
    }
}

/** option.iconKey ("group.prop:value")를 파싱하여 getIconFor 호출 */
function resolveIconByKey(iconKey: string | undefined, fallbackGroup: string, propKey: string, fallbackValue: string) {
    if (!iconKey || iconKey.trim() === '') {
        return getIconFor(fallbackGroup, propKey, fallbackValue);
    }
    const h = iconKey.trim();
    const hasDot = h.includes('.');
    const hasColon = h.includes(':');
    if (hasDot && hasColon) {
        const [g, rest] = h.split('.', 2);
        const [p, v] = rest.split(':', 2);
        if (g && p && v) return getIconFor(g.toLowerCase(), p, v);
    }
    // value-only 힌트로 처리
    return getIconFor(fallbackGroup, propKey, h);
}

/** WhenExpr 평가기 */
type Context = { isContainer?: boolean; parentDisplay?: string | number | boolean };

/** 값 조회자는 propKey 기반 */
const evalWhen = (expr: WhenExpr, ctx: Context, getVal: (k: string) => any): boolean => {
    if ('all' in expr) return expr.all.every((e) => evalWhen(e, ctx, getVal));
    if ('any' in expr) return expr.any.some((e) => evalWhen(e, ctx, getVal));
    if ('not' in expr) return !evalWhen(expr.not, ctx, getVal);
    if ('context' in expr) {
        const cur =
            expr.context === 'isContainer' ? ctx.isContainer :
                expr.context === 'parentDisplay' ? ctx.parentDisplay : undefined;
        if ('in' in expr && expr.in) return expr.in.includes(cur as any);
        if ('is' in expr) return cur === expr.is;
        return Boolean(cur);
    }
    if ('value' in expr) {
        const cur = getVal(expr.value);
        if ('in' in expr && expr.in) return expr.in.includes(cur);
        if ('is' in expr) return cur === expr.is;
        return cur != null && cur !== '';
    }
    return true;
};

/** spec.options 우선, 없으면 presets를 options로 변환 */
function getOptions(spec: PropertySpec): Option[] {
    if (spec.options && spec.options.length > 0) {
        // 이미 Option[]
        return spec.options as Option[];
    }
    if (spec.presets && spec.presets.length > 0) {
        // presets → Option으로 정규화
        return spec.presets.map((p): Option => ({
            value: p.value,
            label: p.label ? { ko: p.label } : undefined,
            iconKey: (p as any).icon,
            disabled: false,            // ← 명시해서 Option으로 수렴
            description: undefined,
        }));
    }
    return [];
}

// ─────────────────────────────────────────────────────────────
// Control Renderer
// ─────────────────────────────────────────────────────────────
function renderValueControl(
    sectionKey: string,
    propKey: string,
    spec: PropertySpec,
    value: string | undefined,
    onChange: (v: string) => void,
    disabled?: boolean
) {
    const group = sectionKey.toLowerCase();

    // SELECT
    if (spec.control === 'select') {
        const opts = getOptions(spec);
        return (
            <select
                className="h-6 px-1 border border-neutral-200 rounded text-[11px] w-full min-w-0"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
            >
                <option value="">{'(unset)'}</option>
                {opts.map((op, i) => {
                    const val = String(op.value);
                    return (
                        <option key={`${propKey}:opt:${val}:${i}`} value={val}>
                            {toLabel(op.label, val)}
                        </option>
                    );
                })}
            </select>
        );
    }

    // CHIPS / ICONS (chips도 iconKey 있으면 아이콘 표시)
    if (spec.control === 'chips' || spec.control === 'icons') {
        const opts = getOptions(spec);
        const Chips = (
            <div className="flex flex-wrap items-center gap-[4px] min-w-0 max-w-full">
                {opts.map((op, idx) => {
                    const val = String(op.value);
                    const active = val === value;
                    const wantIcon = spec.control === 'icons' || !!op.iconKey;
                    const Icon = wantIcon ? resolveIconByKey(op.iconKey, group, propKey, val) : null;

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
                            title={toLabel(op.label, spec.description || val)}
                            onClick={() => !disabled && !op.disabled && onChange(val)}
                            disabled={disabled || op.disabled}
                            type="button"
                        >
                            {Icon ? <Icon size={12} className="shrink-0" /> : null}
                            {!Icon ? toLabel(op.label, val) : null}
                        </button>
                    );
                })}
            </div>
        );

        // extra input
        if (spec.ui?.extraInput?.enabled) {
            const ei = spec.ui.extraInput;
            return (
                <div className="flex items-center gap-[6px] w-full min-w-0 max-w-full">
                    {Chips}
                    <input
                        className={`h-6 px-1 border border-neutral-200 rounded text-[11px] ${freeInputClass(ei?.size)} flex-1 min-w-0`}
                        value={value ?? ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={ei?.placeholder || spec.placeholder || spec.description}
                        disabled={disabled}
                        type={ei?.type === 'number' ? 'number' : 'text'}
                    />
                </div>
            );
        }

        return Chips;
    }

    // COLOR (propKey에 color 포함 시 간단 처리)
    const isColor = propKey.toLowerCase().includes('color');
    if (spec.control === 'color' || isColor) {
        return (
            <div className="flex items-center gap-2 w-full min-w-0">
                <input
                    type="color"
                    className="h-6 w-7 p-0 border border-neutral-200 rounded"
                    value={normalizeColor(value)}
                    onChange={(e) => onChange(e.target.value)}
                    title="Pick color"
                    disabled={disabled}
                />
                <input
                    type="text"
                    className="h-6 px-1 border border-neutral-200 rounded text-[11px] flex-1 min-w-0"
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={spec.placeholder || spec.description || '#000000'}
                    disabled={disabled}
                />
            </div>
        );
    }

    // SHORTHAND
    if (spec.shorthand?.enabled) {
        const placeholder = spec.shorthand.examples?.[0] ?? spec.shorthand.syntax ?? 'shorthand';
        const hint = spec.shorthand.syntax;
        return (
            <input
                className="h-6 px-1 border border-neutral-200 rounded text-[11px] w-full min-w-0"
                placeholder={placeholder}
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                title={hint}
                disabled={disabled}
                type={spec.ui?.inputType === 'number' ? 'number' : 'text'}
            />
        );
    }

    // 기본 input
    return (
        <input
            type={spec.ui?.inputType === 'number' ? 'number' : 'text'}
            className="h-6 px-1 border border-neutral-200 rounded text-[11px] w-full min-w-0"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={spec.placeholder || spec.description}
            disabled={disabled}
        />
    );
}

// ─────────────────────────────────────────────────────────────
// Dependent Blocks
// ─────────────────────────────────────────────────────────────
const DependentBlock: React.FC<{
    title?: string;
    propsMap: Record<string, PropertySpec>;
    values: Values;
    setValue: (key: string, v: string) => void;
    sectionKey: string;
    disabled?: boolean;
}> = ({ title, propsMap, values, setValue, sectionKey, disabled }) => {
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
                return (
                    <RowShell key={rowKey}>
                        <LeftCell title={toLabel(p.label, k)} tooltip={p.ui?.tooltip} />
                        <RightCell>
                            {renderValueControl(sectionKey, k, p, v, (val) => setValue(k, val), disabled)}
                        </RightCell>
                    </RowShell>
                );
            })}
        </div>
    );
};

const DetailBlock: React.FC<{
    propsMap?: Record<string, PropertySpec>;
    values: Values;
    setValue: (key: string, v: string) => void;
    sectionKey: string;
    disabled?: boolean;
}> = ({ propsMap, values, setValue, sectionKey, disabled }) => {
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

                const mainRow = (
                    <RowShell key={`${detailKey}.__row`}>
                        <LeftCell title={toLabel(p.label, k)} tooltip={p.ui?.tooltip} />
                        <RightCell>
                            {renderValueControl(sectionKey, k, p, v, (val) => setValue(k, val), disabled)}
                        </RightCell>
                    </RowShell>
                );

                // detail 속성의 의존 하위 그룹(* 등)
                const depGroups: DependentGroupSpec[] = [];
                if (p.dependentProperties) {
                    const cur = v;
                    // 현재 값과 일치
                    if (cur && p.dependentProperties[cur]) depGroups.push(p.dependentProperties[cur]);
                    // 와일드카드
                    if (p.dependentProperties['*']) depGroups.push(p.dependentProperties['*']);
                    // 특수키("*:...")는 무조건 후보
                    Object.entries(p.dependentProperties).forEach(([dk, dg]) => {
                        if (dk.startsWith('*:')) depGroups.push(dg);
                    });
                }

                return (
                    <div key={detailKey}>
                        {mainRow}
                        {depGroups.length > 0 && (
                            <div>
                                {depGroups.map((g, idx) => (
                                    <DependentBlock
                                        key={`${detailKey}.__dep.${idx}`}
                                        title={toLabel(g.label)}
                                        propsMap={g.properties}
                                        values={values}
                                        setValue={setValue}
                                        sectionKey={sectionKey}
                                        disabled={disabled}
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

// ─────────────────────────────────────────────────────────────
// Defaults
// ─────────────────────────────────────────────────────────────
function defaultFromSpec(prop: PropertySpec): string | undefined {
    const opts = getOptions(prop);
    if (prop.control === 'select' && opts.length > 0) return String(opts[0].value);
    if ((prop.control === 'chips' || prop.control === 'icons') && opts.length > 0) return String(opts[0].value);
    return undefined;
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
export const NewInspector: React.FC<Props> = ({ nodeId, defId, width = 360 }) => {
    const [values, setValues] = useState<Values>({});
    const [lockedGroups, setLockedGroups] = useState<Record<string, boolean>>({});
    const [expandedDetail, setExpandedDetail] = useState<Expanded>({});
    const [collapsedSection, setCollapsedSection] = useState<Record<string, boolean>>({});

    const style = useMemo(() => INSPECTOR_STYLE, []);

    // 초기값 주입 (propKey 기반)
    useEffect(() => {
        const next: Values = {};
        (SECTION_ORDER as (keyof InspectorStyle)[]).forEach((secKey) => {
            const sec = (style as any)[secKey] as SectionSpec | undefined;
            if (!sec) return;
            Object.entries(sec.groups).forEach(([groupKey, group]: [string, GroupSpec]) => {
                Object.entries(group.properties).forEach(([propKey, prop]) => {
                    const defVal = defaultFromSpec(prop);
                    if (defVal !== undefined) {
                        next[propKey] = defVal;
                    }
                    // 상세 속성에도 기본값 있을 수 있으니 주입
                    if (prop.detailProperties) {
                        Object.entries(prop.detailProperties).forEach(([dk, ds]) => {
                            const dv = defaultFromSpec(ds);
                            if (dv !== undefined) next[dk] = dv;
                        });
                    }
                });
            });
        });
        if (Object.keys(next).length > 0) {
            setValues((prev) => ({ ...next, ...prev }));
        }
    }, [style]);

    // 값 변경
    const setValue = (propKey: string, v: string) => {
        setValues((prev) => ({ ...prev, [propKey]: v }));
    };

    const toggleDetail = (mainKey: string) => {
        setExpandedDetail((prev) => ({ ...prev, [mainKey]: !prev[mainKey] }));
    };

    const toggleGroupLock = (sectionKey: string, groupKey: string) => {
        const k = `${sectionKey}.${groupKey}`;
        setLockedGroups((prev) => ({ ...prev, [k]: !prev[k] }));
    };

    // 간이 컨텍스트 추정:
    // - display가 flex/grid면 컨테이너라고 가정
    // - parentDisplay는 실제 편집기 컨텍스트에서 주입되어야 함 (TODO)
    const getContext = (): Context => {
        const display = values['display'];
        return {
            //isContainer: display === 'flex' || display === 'grid',
            //parentDisplay: undefined, // TODO: 편집기에서 실제 부모 display 전달
            isContainer: true,
            parentDisplay: 'grid', // TODO: 편집기에서 실제 부모 display 전달
        };
    };

    // 의존 그룹 수집 + WhenExpr 평가
    const getActiveDependentGroups = (propKey: string, prop: PropertySpec, currentValue?: string): DependentGroupSpec[] => {
        if (!prop.dependentProperties) return [];
        const list: DependentGroupSpec[] = [];
        const ctx = getContext();
        const getVal = (k: string) => values[k];

        // 1) 현재 값과 일치하는 키 (예: 'flex', 'grid')
        if (currentValue && prop.dependentProperties[currentValue]) {
            const g = prop.dependentProperties[currentValue];
            if (!g.displayWhen || evalWhen(g.displayWhen, ctx, getVal)) list.push(g);
        }
        // 2) 와일드카드 '*'
        if (prop.dependentProperties['*']) {
            const g = prop.dependentProperties['*'];
            if (!g.displayWhen || evalWhen(g.displayWhen, ctx, getVal)) list.push(g);
        }
        // 3) 특수키 '*:...'
        Object.entries(prop.dependentProperties).forEach(([k, g]) => {
            if (k.startsWith('*:')) {
                if (!g.displayWhen || evalWhen(g.displayWhen, ctx, getVal)) list.push(g);
            }
        });

        return list;
    };

    const renderPropertyRow = (
        sectionKey: keyof InspectorStyle,
        groupKey: string,
        propKey: string,
        prop: PropertySpec,
        disabled?: boolean
    ) => {
        const title = toLabel(prop.label, propKey);
        const mainKey = `${sectionKey}.${groupKey}.${propKey}`;
        const v = values[propKey];

        const hasDetail = !!prop.detailProperties;
        const detailOpen = expandedDetail[mainKey] === true;

        const controls = renderValueControl(String(sectionKey), propKey, prop, v, (nv) => setValue(propKey, nv), disabled);

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
                            title={toLabel(g.label)}
                            propsMap={g.properties}
                            values={values}
                            setValue={setValue}
                            sectionKey={String(sectionKey)}
                            disabled={disabled}
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
                    disabled={disabled}
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
        const groupKeyFull = `${sectionKey}.${groupKey}`;
        const isLocked = !!lockedGroups[groupKeyFull];

        return (
            <div key={`${sectionKey}.${groupKey}`} className="border-b border-neutral-200">
                <GroupHeader
                    label={toLabel(group.label, groupKey)}
                    iconKey={groupKey}
                    locked={isLocked}
                    onToggleLock={() => toggleGroupLock(String(sectionKey), groupKey)}
                />
                <div className="min-w-0">
                    {entries.map(([propKey, prop]) =>
                        renderPropertyRow(sectionKey, groupKey, propKey, prop, isLocked)
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
                key={`section:${String(sectionKey)}`}
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
        <div style={{ width }} className="text-[11px] text-neutral-800 overflow-x-hidden">
            {SECTION_ORDER.map((sec) => renderSection(sec, (style as any)[sec] as SectionSpec))}
        </div>
    );
};

export default NewInspector;