'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    INSPECTOR_STYLE,
    type InspectorStyle,
    type SectionSpec,
    type GroupSpec,
    type PropertySpec,
    type DependentGroup,
} from './InspectorStyle';

import {
    Lock, Unlock, ChevronDown, ChevronRight, Info, Wand2,
    Layout as LayoutIcon, Maximize, MoveHorizontal, Type as TypeIcon, Text as TextIcon,
    Palette, Sparkles, Hand, Square, Grid2x2,
} from 'lucide-react';

import { getIconFor } from './InspectorStyleIcons';

type Props = {
    nodeId: string;
    defId: string;
    width?: number; // default 360
};

type Values   = Record<string, string>;
type Expanded = Record<string, boolean>;

const SECTION_ORDER: (keyof InspectorStyle)[] = [
    'Layout',
    'Typography',
    'Appearance',
    'Effects',
    'Interactivity',
];

const SECTION_ICONS: Partial<Record<keyof InspectorStyle, React.ComponentType<{size?:number; className?:string}>>> = {
    Layout: LayoutIcon,
    Typography: TypeIcon,
    Appearance: Palette,
    Effects: Sparkles,
    Interactivity: Hand,
};

const GROUP_ICONS: Record<string, React.ComponentType<{size?:number; className?:string}>> = {
    'Display & Flow': Grid2x2,
    'Sizing': Maximize,
    'Spacing': MoveHorizontal,
    'Font': TypeIcon,
    'Text': TextIcon,
    'Border': Square,
};

/** Row = 2 : 7 , 오른쪽 8:1:1 (controls:lock:detail) */
const RowShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="grid grid-cols-9 gap-[4px] py-[4px] px-[6px] border-b border-neutral-100 items-center">
        {children}
    </div>
);

const LeftCell: React.FC<{ title: string; subtitle?: string; tooltip?: string }> = ({ title, subtitle, tooltip }) => (
    <div className="col-span-2 flex flex-col justify-center">
        <div className="text-[11px] font-medium leading-[14px] text-neutral-800" title={tooltip}>
            {title}
        </div>
        {subtitle ? <div className="text-[10px] text-neutral-500 ml-[8px] leading-[12px]">{subtitle}</div> : null}
    </div>
);

const RightCell: React.FC<{
    children: React.ReactNode;
    onToggleDetail?: () => void;
    lockable?: boolean;
    locked?: boolean;
    onToggleLock?: () => void;
    detailActive?: boolean;
}> = ({ children, onToggleDetail, lockable, locked, onToggleLock, detailActive }) => (
    <div className="col-span-7 grid grid-cols-10 items-center gap-[4px]">
        <div className="col-span-8 min-w-0 flex items-center">{children}</div>
        <div className="col-span-1 flex justify-center">
            {lockable ? (
                <button
                    className="p-1 rounded hover:bg-neutral-100"
                    title={locked ? 'Unlock' : 'Lock'}
                    onClick={onToggleLock}
                >
                    {locked ? <Unlock size={14} /> : <Lock size={14} />}
                </button>
            ) : null}
        </div>
        <div className="col-span-1 flex justify-center">
            {onToggleDetail ? (
                <button
                    className={`p-1 rounded hover:bg-neutral-100 ${detailActive ? 'text-blue-600' : ''}`}
                    title="상세"
                    onClick={onToggleDetail}
                >
                    {detailActive ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
            ) : null}
        </div>
    </div>
);

/** 메인 섹션 프레임 — 배경 강조 + 접기/펴기 토글(오른쪽 끝) (컴팩트 버전) */
const SectionFrame: React.FC<{
    title: string;
    Icon?: React.ComponentType<{size?:number; className?:string}>;
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
                        >
                            {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                        </button>
                    </div>
                </div>
            </div>
            {!collapsed && (
                <div className="p-2">
                    <div className="rounded-lg border border-neutral-200 bg-white">
                        {children}
                    </div>
                </div>
            )}
        </div>
    </section>
);

const GroupHeader: React.FC<{ label: string; iconKey?: string }> = ({ label, iconKey }) => {
    const Icon = iconKey ? GROUP_ICONS[iconKey] : undefined;
    return (
        <div className="px-3 py-2 border-b border-neutral-200 bg-transparent">
            <div className="flex items-center">
                {Icon ? <Icon size={13} className="text-neutral-700 mr-2" /> : null}
                <div className="text-[11px] font-semibold text-neutral-800">{label}</div>
            </div>
        </div>
    );
};

function normalizeColor(v?: string) {
    if (!v) return '#000000';
    if (v.startsWith('#')) return v;
    return '#000000';
}

/** freeInput 크기 클래스 */
function freeInputClass(size: 'sm' | 'md' | 'lg' | undefined) {
    switch (size) {
        case 'sm': return 'min-w-[64px] w-[64px]';
        case 'md': return 'min-w-[120px] w-[120px]';
        case 'lg': return 'w-full'; // 가용폭
        default:   return 'min-w-[120px] w-[120px]';
    }
}

/** 값 컨트롤 렌더러(컴팩트)
 * - control: 'select' → select 강제
 * - control: 'chips' → 텍스트 칩 (아이콘 미사용)
 * - control: 'icons' → 아이콘 칩
 * - freeInput: 칩 옆에 입력칸 추가 + 크기 spec.ui.freeInputSize 로 제어
 * - shorthand → 한 줄 입력 (상세에서 분해)
 */
function renderValueControl(
    sectionKey: string,
    propKey: string,
    spec: PropertySpec,
    value: string | undefined,
    onChange: (v: string) => void
) {
    const group = sectionKey.toLowerCase();
    const cssKey = spec.cssKey;
    const isColor = cssKey.toLowerCase().includes('color');

    // 1) SELECT
    if (spec.control === 'select') {
        const opts = spec.options ?? [];
        return (
            <select
                className="h-6 px-1 border border-neutral-200 rounded text-[11px] w-full"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
            >
                <option value="">{'(unset)'}</option>
                {opts.map((op) => {
                    const val = String(op.value);
                    return (
                        <option key={`${cssKey}:opt:${val}`} value={val}>
                            {op.label?.ko ?? op.label?.en ?? val}
                        </option>
                    );
                })}
            </select>
        );
    }

    // 2) chips/icons
    if ((spec.control === 'chips' || spec.control === 'icons') && spec.presets && spec.presets.length > 0) {
        const allowFree = spec.ui?.['freeInput'] === true || !!spec.placeholder;
        const freeSize  = (spec.ui?.['freeInputSize'] as 'sm' | 'md' | 'lg' | undefined) ?? 'md';

        const Chips = (
            <div className="flex flex-wrap items-center gap-[4px]">
                {spec.presets.map((p) => {
                    const val = String(p.value);
                    const active = val === value;

                    // chips → 텍스트만, icons → 아이콘 우선
                    const Icon = spec.control === 'icons'
                        ? (p.icon ? getIconFor(group, cssKey, val) || getIconFor(group, cssKey, p.icon) : getIconFor(group, cssKey, val))
                        : null;

                    return (
                        <button
                            key={`${cssKey}:pre:${val}`}
                            className={`h-6 px-1.5 rounded border text-[10px] flex items-center gap-1 ${
                                active ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-neutral-200 hover:bg-neutral-50'
                            }`}
                            title={p.label || spec.description}
                            onClick={() => onChange(val)}
                        >
                            {Icon ? <Icon size={12} className="shrink-0" /> : null}
                            {!Icon ? val : null}
                        </button>
                    );
                })}
            </div>
        );

        if (!allowFree) return Chips;

        return (
            <div className="flex items-center gap-[6px] w-full">
                {Chips}
                <input
                    type="text"
                    className={`h-6 px-1 border border-neutral-200 rounded text-[11px] ${freeInputClass(freeSize)} flex-1`}
                    placeholder={spec.placeholder || spec.description || 'value'}
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                />
            </div>
        );
    }

    // 3) color
    if (isColor) {
        return (
            <div className="flex items-center gap-2 w-full">
                <input
                    type="color"
                    className="h-6 w-7 p-0 border border-neutral-200 rounded"
                    value={normalizeColor(value)}
                    onChange={(e) => onChange(e.target.value)}
                    title="Pick color"
                />
                <input
                    type="text"
                    className="h-6 px-1 border border-neutral-200 rounded text-[11px] flex-1 min-w-0"
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="#000000 or rgba()"
                />
            </div>
        );
    }

    // 4) shorthand
    if (spec.shorthand?.enabled) {
        const placeholder = spec.shorthand.examples?.[0] ?? spec.shorthand.syntax ?? 'shorthand';
        const hint = spec.shorthand.syntax;
        return (
            <input
                className="h-6 px-1 border border-neutral-200 rounded text-[11px] w-full"
                placeholder={placeholder}
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                title={hint}
            />
        );
    }

    // 5) fallback input
    return (
        <input
            type="text"
            className="h-6 px-1 border border-neutral-200 rounded text-[11px] w-full"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={spec.placeholder || spec.description}
        />
    );
}

const DependentBlock: React.FC<{
    title?: string;
    propsMap: Record<string, PropertySpec>;
    values: Values;
    setValue: (key: string, v: string) => void;
    sectionKey: string;
}> = ({ title, propsMap, values, setValue, sectionKey }) => {
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
                const v = values[p.cssKey];
                return (
                    <RowShell key={rowKey}>
                        <LeftCell title={p.label?.ko ?? p.label?.en ?? k} tooltip={p.ui?.tooltip} />
                        <RightCell>
                            {renderValueControl(sectionKey, k, p, v, (val) => setValue(p.cssKey, val))}
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
}> = ({ propsMap, values, setValue, sectionKey }) => {
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
                const v = values[p.cssKey];

                const mainRow = (
                    <RowShell key={`${detailKey}.__row`}>
                        <LeftCell title={p.label?.ko ?? p.label?.en ?? k} tooltip={p.ui?.tooltip} />
                        <RightCell>
                            {renderValueControl(sectionKey, k, p, v, (val) => setValue(p.cssKey, val))}
                        </RightCell>
                    </RowShell>
                );

                const depGroups: DependentGroup[] = [];
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
                                        title={g.label?.ko ?? g.label?.en}
                                        propsMap={g.properties}
                                        values={values}
                                        setValue={setValue}
                                        sectionKey={sectionKey}
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
    if ((prop.control === 'chips' || prop.control === 'icons') && prop.presets && prop.presets.length > 0) {
        return String(prop.presets[0].value);
    }
    return undefined;
}

export const NewInspector: React.FC<Props> = ({ nodeId, defId, width = 360 }) => {
    const [values, setValues] = useState<Values>({});
    const [locked, setLocked] = useState<Record<string, boolean>>({});
    const [expandedDetail, setExpandedDetail] = useState<Expanded>({});
    const [collapsedSection, setCollapsedSection] = useState<Record<string, boolean>>({});

    const style = useMemo(() => INSPECTOR_STYLE, []);

    useEffect(() => {
        const next: Values = {};
        (SECTION_ORDER as (keyof InspectorStyle)[]).forEach((secKey) => {
            const sec = (style as any)[secKey] as SectionSpec | undefined;
            if (!sec) return;
            Object.values(sec.groups).forEach((group: GroupSpec) => {
                Object.entries(group.properties).forEach(([propKey, prop]) => {
                    const defVal = defaultFromSpec(prop);
                    if (defVal !== undefined) {
                        next[prop.cssKey] = defVal;
                    }
                });
            });
        });
        if (Object.keys(next).length > 0) {
            setValues((prev) => ({ ...next, ...prev }));
        }
    }, [style]);

    const setValue = (cssKey: string, v: string) => {
        setValues((prev) => ({ ...prev, [cssKey]: v }));
    };
    const toggleDetail = (mainKey: string) => {
        setExpandedDetail((prev) => ({ ...prev, [mainKey]: !prev[mainKey] }));
    };
    const toggleLock = (mainKey: string) => {
        setLocked((prev) => ({ ...prev, [mainKey]: !prev[mainKey] }));
    };

    const getActiveDependentGroups = (prop: PropertySpec, currentValue?: string): DependentGroup[] => {
        if (!prop.dependentProperties) return [];
        const groups: DependentGroup[] = [];
        if (currentValue && prop.dependentProperties[currentValue]) {
            groups.push(prop.dependentProperties[currentValue]);
        }
        if (prop.dependentProperties['*']) {
            groups.push(prop.dependentProperties['*']);
        }
        return groups;
    };

    const renderPropertyRow = (
        sectionKey: keyof InspectorStyle,
        groupKey: string,
        propKey: string,
        prop: PropertySpec
    ) => {
        const title = prop.label?.ko ?? prop.label?.en ?? propKey;
        const mainKey = `${sectionKey}.${groupKey}.${propKey}`;
        const v = values[prop.cssKey];
        const isLocked = locked[mainKey] === true;

        const hasDetail = !!prop.detailProperties;
        const detailOpen = expandedDetail[mainKey] === true;

        const controls = renderValueControl(String(sectionKey), propKey, prop, v, (nv) => setValue(prop.cssKey, nv));

        const row = (
            <RowShell key={`${mainKey}.__row`}>
                <LeftCell title={title} tooltip={prop.ui?.tooltip} />
                <RightCell
                    lockable={!!prop.ui?.lockUnit}
                    locked={isLocked}
                    onToggleLock={() => toggleLock(mainKey)}
                    onToggleDetail={hasDetail ? () => toggleDetail(mainKey) : undefined}
                    detailActive={detailOpen}
                >
                    {controls}
                </RightCell>
            </RowShell>
        );

        const depGroups = getActiveDependentGroups(prop, v);
        const depBlock =
            depGroups.length > 0 ? (
                <div key={`${mainKey}.__depwrap`}>
                    {depGroups.map((g, idx) => (
                        <DependentBlock
                            key={`${mainKey}.__dep.${idx}`}
                            title={g.label?.ko ?? g.label?.en}
                            propsMap={g.properties}
                            values={values}
                            setValue={setValue}
                            sectionKey={String(sectionKey)}
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
        return (
            <div key={`${sectionKey}.${groupKey}`} className="border-b border-neutral-200">
                <GroupHeader label={group.label?.ko ?? group.label?.en ?? groupKey} iconKey={groupKey} />
                <div>
                    {entries.map(([propKey, prop]) =>
                        renderPropertyRow(sectionKey, groupKey, propKey, prop)
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
                title={section.label?.ko ?? section.label?.en ?? String(sectionKey)}
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
        <div style={{ width }} className="text-[11px] text-neutral-800">
            {SECTION_ORDER.map((sec) => renderSection(sec, (style as any)[sec] as SectionSpec))}
        </div>
    );
};

export default NewInspector;