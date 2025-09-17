'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    INSPECTOR_STYLE,
    type InspectorStyle,
    type SectionSpec,
    type GroupSpec,
    type PropertySpec,
    type DependentGroupSpec,
} from './styleInspector/InspectorStyle';

import {
    Layout as LayoutIcon, Maximize, MoveHorizontal, Type as TypeIcon, Text as TextIcon,
    Palette, Sparkles, Hand, Square, Grid2x2, Wand2,
} from 'lucide-react';

import { getIconFor } from './styleInspector/InspectorStyleIcons';
import { RowShell, LeftCell, RightCell, SectionFrame, GroupHeader, InlineInfo } from './styleInspector/ui';
import { toLabel, defaultFromSpec, evalWhen, type Context } from './styleInspector/logic';
import { renderValueControl } from './styleInspector/controls';

// ─────────────────────────────────────────────────────────────
// Props & State Types
// ─────────────────────────────────────────────────────────────
type Props = {
    nodeId: string;
    defId: string;
    width?: number; // default 360
};

type Values   = Record<string, string>;
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
// Dependent blocks
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
            {title ? <InlineInfo>{title}</InlineInfo> : null}
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
                    if (cur && p.dependentProperties[cur]) depGroups.push(p.dependentProperties[cur]);
                    if (p.dependentProperties['*']) depGroups.push(p.dependentProperties['*']);
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
// Component
// ─────────────────────────────────────────────────────────────
export const OldStyleInspector: React.FC<Props> = ({ nodeId, defId, width = 360 }) => {
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
                    if (defVal !== undefined) next[propKey] = defVal;

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

    // TODO: 편집기 실데이터로 대체
    const getContext = (): Context => {
        const display = values['display'];
        return {
            isContainer: display === 'flex' || display === 'grid',
            parentDisplay: undefined,
        };
    };

    const getActiveDependentGroups = (propKey: string, prop: PropertySpec, currentValue?: string): DependentGroupSpec[] => {
        if (!prop.dependentProperties) return [];
        const list: DependentGroupSpec[] = [];
        const ctx = getContext();
        const getVal = (k: string) => values[k];

        if (currentValue && prop.dependentProperties[currentValue]) {
            const g = prop.dependentProperties[currentValue];
            if (!g.displayWhen || evalWhen(g.displayWhen, ctx, getVal)) list.push(g);
        }
        if (prop.dependentProperties['*']) {
            const g = prop.dependentProperties['*'];
            if (!g.displayWhen || evalWhen(g.displayWhen, ctx, getVal)) list.push(g);
        }
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
        const Icon = GROUP_ICONS[groupKey];

        return (
            <div key={`${sectionKey}.${groupKey}`} className="border-b border-neutral-200">
                <GroupHeader
                    label={toLabel(group.label, groupKey)}
                    Icon={Icon}
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

export default OldStyleInspector;