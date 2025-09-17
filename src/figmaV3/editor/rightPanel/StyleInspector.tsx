'use client';

import * as React from 'react';

// 공용 UI (StyleInspector와 동일 레이아웃 컴포넌트)
import {
    SectionFrame,
    GroupHeader,
    RowShell,
    LeftCell,
    RightCell,
    InlineInfo,
} from './styleInspector/ui';

// 단일 컨트롤 렌더 함수 (스키마 스타일의 PropertySpec을 받아 렌더)
import { renderValueControl } from './styleInspector/controls';

// 공용 로직 타입 (컨텍스트 타입만 사용)
import type { Context } from './styleInspector/logic';
import type { PropertySpec } from './styleInspector/InspectorStyle';

// (아이콘칩 내부에서 iconKey를 해석할 때 사용됨 — controls 쪽에서 참조)
import { getIconFor } from './styleInspector/InspectorStyleIcons';

// 섹션/그룹 아이콘 (이전 StyleInspector와 동일)
import {
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
    Wand2,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// 공통 타입/유틸
// ─────────────────────────────────────────────────────────────
type Values = Record<string, string>;
type SetValue = (k: string, v: string) => void;

const GROUP_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    'Display & Flow': Grid2x2,
    Sizing: Maximize,
    Spacing: MoveHorizontal,
    Font: TypeIcon,
    Text: TextIcon,
    Border: Square,
};

const SECTION_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    Layout: LayoutIcon,
    Typography: TypeIcon,
    Appearance: Palette,
    Effects: Sparkles,
    Interactivity: Hand,
};

// StyleInspector.tsx (상단 util)
const INITIAL_DEFAULTS: Record<string, string> = {
    display: 'block',
    overflow: 'visible',
    fontFamily: 'Inter',
    textAlign: 'left',
};

// select/chips: 첫 옵션이 있으면 그걸 기본으로 쓰는 보조
function firstOption(spec?: { options?: Array<{ value: any }> }) {
    const v = spec?.options?.[0]?.value;
    return v != null ? String(v) : undefined;
}

// 상세/종속 블록 (스키마 없이 inline spec으로도 쓰기 쉽게 독립 구성)
const DependentBlock: React.FC<{
    title?: string;
    propsMap: Record<string, PropertySpec>;
    values: Values;
    setValue: SetValue;
    sectionKey: string;
    disabled?: boolean;
}> = ({ title, propsMap, values, setValue, sectionKey, disabled }) => {
    const entries = Object.entries(propsMap);
    if (entries.length === 0) return null;

    return (
        <div className="ml-4 border-l border-neutral-200 pl-3 mt-1">
            {title ? <InlineInfo>{title}</InlineInfo> : null}
            {entries.map(([k, p]) => {
                const v = values[k];
                return (
                    <RowShell key={`dep:${sectionKey}:${k}`}>
                        <LeftCell title={p.label?.ko ?? p.label?.en ?? k} tooltip={p.ui?.tooltip} />
                        <RightCell>
                            {renderValueControl(sectionKey, k, p, v, (nv) => setValue(k, nv), disabled)}
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
    setValue: SetValue;
    sectionKey: string;
    disabled?: boolean;
    // detail 하위에도 종속 그룹이 있는 경우를 위해, propKey → dependentSpec 생성기를 받음
    getDependentsFor?: (propKey: string, curVal?: string) => Array<{ title?: string; properties: Record<string, PropertySpec> }>;
}> = ({ propsMap, values, setValue, sectionKey, disabled, getDependentsFor }) => {
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
                const v = values[k];

                return (
                    <div key={`detail:${sectionKey}:${k}`}>
                        <RowShell>
                            <LeftCell title={p.label?.ko ?? p.label?.en ?? k} tooltip={p.ui?.tooltip} />
                            <RightCell>
                                {renderValueControl(sectionKey, k, p, v, (nv) => setValue(k, nv), disabled)}
                            </RightCell>
                        </RowShell>

                        {/* 상세 속성의 종속 그룹 처리(예: backgroundImage 선택 시 이미지 관련 하위) */}
                        {getDependentsFor && (
                            getDependentsFor(k, v)?.map((dg, idx) => (
                                <DependentBlock
                                    key={`detail-dep:${sectionKey}:${k}:${idx}`}
                                    title={dg.title}
                                    propsMap={dg.properties}
                                    values={values}
                                    setValue={setValue}
                                    sectionKey={sectionKey}
                                    disabled={disabled}
                                />
                            ))
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// 간단한 spec maker 유틸들 (스키마 없이 inline 작성 편하게)
const makeChips = (
    opts: Array<string | { value: string; label?: string }>,
    extra?: { placeholder?: string; free?: boolean; size?: 'xs'|'sm'|'md'|'lg'|'xl' }
): PropertySpec => ({
    control: 'chips',
    options: opts.map((o) => (typeof o === 'string' ? { value: o } : { value: o.value, label: o.label ? { ko: o.label } : undefined })),
    placeholder: extra?.placeholder,
    ui: {
        size: extra?.size ?? 'xs',
        extraInput: extra?.free ? { enabled: true, size: extra?.size ?? 'xs', placeholder: extra?.placeholder } : undefined,
    },
});

const makeIcons = (
    opts: Array<{ value: string; iconKey?: string; label?: string }>,
    size: 'xs'|'sm'|'md'|'lg'|'xl' = 'xs'
): PropertySpec => ({
    control: 'icons',
    options: opts.map((o) => ({
        value: o.value,
        iconKey: o.iconKey ?? o.value,
        label: o.label ? { ko: o.label } : undefined,
    })),
    ui: { size },
});

const makeSelect = (opts: Array<string | { value: string; label?: string }>, size: 'xs'|'sm'|'md'|'lg'|'xl' = 'sm'): PropertySpec => ({
    control: 'select',
    options: opts.map((o) => (typeof o === 'string' ? { value: o } : { value: o.value, label: o.label ? { ko: o.label } : undefined })),
    ui: { size },
});

const makeInput = (placeholder?: string, inputType: 'text'|'number'|'url'|'time' = 'text', size: 'xs'|'sm'|'md'|'lg'|'xl' = 'xs'): PropertySpec => ({
    control: 'input',
    placeholder,
    ui: { inputType, size },
});

const makeColor = (placeholder?: string, size: 'xs'|'sm'|'md'|'lg'|'xl' = 'sm'): PropertySpec => ({
    control: 'color',
    placeholder,
    ui: { size },
});

const makeRatio = (placeholder?: string, presets?: Array<{ value: string; label?: string }>, size: 'xs'|'sm'|'md'|'lg'|'xl' = 'xs'): PropertySpec => ({
    control: 'ratio',
    presets: presets?.map((p) => ({ value: p.value, label: p.label })),
    placeholder,
    ui: { size },
});

// ─────────────────────────────────────────────────────────────
// 섹션: Layout
// ─────────────────────────────────────────────────────────────
const LayoutSection: React.FC<{
    values: Values;
    setValue: SetValue;
    locks: Record<string, boolean>;
    onToggleLock: (k: string) => void;
    expanded: Record<string, boolean>;
    toggleDetail: (k: string) => void;
}> = ({ values, setValue, locks, onToggleLock, expanded, toggleDetail }) => {
    const display = values['display'];
    const isContainer = display === 'flex' || display === 'grid';
    const parentDisplay = values['__parentDisplay']; // 편집기에서 주입 가능
    const showFlexContainer = display === 'flex' && isContainer;
    const showGridContainer = display === 'grid' && isContainer;
    const showFlexItem = parentDisplay === 'flex';
    const showGridItem = parentDisplay === 'grid';

    // 상세 키
    const dk = (prop: string) => `Layout.${prop}`;

    return (
        <>
            {/* Display & Flow */}
            <div className="border-b border-neutral-200">
                <GroupHeader
                    label="Display & Flow"
                    Icon={GROUP_ICONS['Display & Flow']}
                    locked={!!locks['layout.display']}
                    onToggleLock={() => onToggleLock('layout.display')}
                />

                {/* display */}
                <RowShell>
                    <LeftCell title="배치 방식" />
                    <RightCell>
                        {renderValueControl(
                            'Layout',
                            'display',
                            makeChips(
                                [
                                    { value: 'block' },
                                    { value: 'inline' },
                                    { value: 'flex' },
                                    { value: 'grid' },
                                ],
                                { size: 'xs' }
                            ),
                            values['display'],
                            (v) => setValue('display', v),
                            locks['layout.display']
                        )}
                    </RightCell>
                </RowShell>

                {/* flex container */}
                {showFlexContainer && (
                    <>
                        <RowShell>
                            <LeftCell title="방향" />
                            <RightCell>
                                {renderValueControl(
                                    'Layout',
                                    'flexDirection',
                                    makeIcons([
                                        { value: 'row', iconKey: 'layout.flexDirection:row' },
                                        { value: 'row-reverse', iconKey: 'layout.flexDirection:row-reverse' },
                                        { value: 'column', iconKey: 'layout.flexDirection:column' },
                                        { value: 'column-reverse', iconKey: 'layout.flexDirection:column-reverse' },
                                    ]),
                                    values['flexDirection'],
                                    (v) => setValue('flexDirection', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>

                        <RowShell>
                            <LeftCell title="주축 정렬" />
                            <RightCell>
                                {renderValueControl(
                                    'Layout',
                                    'justifyContent',
                                    makeIcons([
                                        { value: 'flex-start', iconKey: 'layout.justifyContent:flex-start' },
                                        { value: 'center', iconKey: 'layout.justifyContent:center' },
                                        { value: 'flex-end', iconKey: 'layout.justifyContent:flex-end' },
                                        { value: 'space-between', iconKey: 'layout.justifyContent:space-between' },
                                        { value: 'space-around', iconKey: 'layout.justifyContent:space-around' },
                                        { value: 'space-evenly', iconKey: 'layout.justifyContent:space-evenly' },
                                    ]),
                                    values['justifyContent'],
                                    (v) => setValue('justifyContent', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>

                        <RowShell>
                            <LeftCell title="교차축 정렬" />
                            <RightCell>
                                {renderValueControl(
                                    'Layout',
                                    'alignItems',
                                    makeIcons([
                                        { value: 'flex-start', iconKey: 'layout.alignItems:flex-start' },
                                        { value: 'center', iconKey: 'layout.alignItems:center' },
                                        { value: 'flex-end', iconKey: 'layout.alignItems:flex-end' },
                                        { value: 'stretch', iconKey: 'layout.alignItems:stretch' },
                                    ]),
                                    values['alignItems'],
                                    (v) => setValue('alignItems', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>

                        <RowShell>
                            <LeftCell title="줄바꿈" />
                            <RightCell>
                                {renderValueControl(
                                    'Layout',
                                    'flexWrap',
                                    makeSelect(['nowrap', 'wrap', 'wrap-reverse']),
                                    values['flexWrap'],
                                    (v) => setValue('flexWrap', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>

                        <RowShell>
                            <LeftCell title="간격" />
                            <RightCell>
                                {renderValueControl(
                                    'Layout',
                                    'gap',
                                    makeChips(['auto', '1', '2', '4'], { size: 'xs', free: true, placeholder: 'ex) 10px' }),
                                    values['gap'],
                                    (v) => setValue('gap', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>
                    </>
                )}

                {/* grid container */}
                {showGridContainer && (
                    <>
                        <RowShell>
                            <LeftCell title="열 개수" />
                            <RightCell>
                                {renderValueControl(
                                    'Layout',
                                    'gridTemplateColumns',
                                    makeChips(['auto', '1', '2', '3'], { size: 'xs', free: true, placeholder: 'auto' }),
                                    values['gridTemplateColumns'],
                                    (v) => setValue('gridTemplateColumns', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>

                        <RowShell>
                            <LeftCell title="행 개수" />
                            <RightCell>
                                {renderValueControl(
                                    'Layout',
                                    'gridTemplateRows',
                                    makeChips(['auto', '1', '2', '3'], { size: 'xs', free: true, placeholder: 'auto' }),
                                    values['gridTemplateRows'],
                                    (v) => setValue('gridTemplateRows', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>

                        <RowShell>
                            <LeftCell title="가로 정렬" />
                            <RightCell>
                                {renderValueControl(
                                    'Layout',
                                    'justifyItems',
                                    makeSelect(['stretch', 'start', 'center', 'end']),
                                    values['justifyItems'],
                                    (v) => setValue('justifyItems', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>

                        <RowShell>
                            <LeftCell title="세로 정렬" />
                            <RightCell>
                                {renderValueControl(
                                    'Layout',
                                    'alignItems',
                                    makeSelect(['stretch', 'start', 'center', 'end']),
                                    values['alignItems'],
                                    (v) => setValue('alignItems', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>
                    </>
                )}

                {/* flex item */}
                {showFlexItem && (
                    <>
                        <RowShell>
                            <LeftCell title="개별 정렬" />
                            <RightCell>
                                {renderValueControl(
                                    'Layout',
                                    'alignSelf',
                                    makeSelect(['auto', 'flex-start', 'center', 'flex-end', 'stretch']),
                                    values['alignSelf'],
                                    (v) => setValue('alignSelf', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>

                        <RowShell>
                            <LeftCell title="순서" />
                            <RightCell>
                                {renderValueControl(
                                    'Layout',
                                    'order',
                                    makeInput('0', 'number'),
                                    values['order'],
                                    (v) => setValue('order', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>

                        <RowShell>
                            <LeftCell title="성장/축소/기준" />
                            <RightCell>
                                {renderValueControl(
                                    'Layout',
                                    'flex',
                                    makeInput('1 1 auto'),
                                    values['flex'],
                                    (v) => setValue('flex', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>
                    </>
                )}

                {/* grid item */}
                {showGridItem && (
                    <>
                        <RowShell>
                            <LeftCell title="열 범위" />
                            <RightCell>
                                {renderValueControl(
                                    'Layout',
                                    'gridColumn',
                                    makeInput('1 / 3'),
                                    values['gridColumn'],
                                    (v) => setValue('gridColumn', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>

                        <RowShell>
                            <LeftCell title="행 범위" />
                            <RightCell>
                                {renderValueControl(
                                    'Layout',
                                    'gridRow',
                                    makeInput('1 / 2'),
                                    values['gridRow'],
                                    (v) => setValue('gridRow', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>

                        <RowShell>
                            <LeftCell title="가로 정렬(개별)" />
                            <RightCell>
                                {renderValueControl(
                                    'Layout',
                                    'justifySelf',
                                    makeSelect(['start', 'center', 'end', 'stretch']),
                                    values['justifySelf'],
                                    (v) => setValue('justifySelf', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>

                        <RowShell>
                            <LeftCell title="세로 정렬(개별)" />
                            <RightCell>
                                {renderValueControl(
                                    'Layout',
                                    'alignSelf',
                                    makeSelect(['start', 'center', 'end', 'stretch']),
                                    values['alignSelf'],
                                    (v) => setValue('alignSelf', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>
                    </>
                )}

                {/* overflow */}
                <RowShell>
                    <LeftCell title="오버플로우" />
                    <RightCell>
                        {renderValueControl(
                            'Layout',
                            'overflow',
                            makeSelect(['visible', 'hidden', 'scroll', 'auto']),
                            values['overflow'],
                            (v) => setValue('overflow', v),
                            locks['layout.display']
                        )}
                    </RightCell>
                </RowShell>
            </div>

            {/* Sizing */}
            <div className="border-b border-neutral-200">
                <GroupHeader
                    label="Sizing"
                    Icon={GROUP_ICONS['Sizing']}
                    locked={!!locks['layout.sizing']}
                    onToggleLock={() => onToggleLock('layout.sizing')}
                />

                {/* width (+ 상세: minWidth/maxWidth) */}
                <RowShell>
                    <LeftCell title="너비" />
                    <RightCell
                        onToggleDetail={() => toggleDetail(dk('width'))}
                        detailActive={!!expanded[dk('width')]}
                    >
                        {renderValueControl(
                            'Layout',
                            'width',
                            {
                                ...makeChips([{ value: 'auto' }], { size: 'xs', free: true, placeholder: 'ex) 320px / 50%' }),
                                detailProperties: {
                                    minWidth: makeInput('ex) 100'),
                                    maxWidth: makeInput('ex) 100'),
                                },
                            },
                            values['width'],
                            (v) => setValue('width', v),
                            locks['layout.sizing']
                        )}
                    </RightCell>
                </RowShell>
                {!!expanded[dk('width')] && (
                    <DetailBlock
                        propsMap={{
                            minWidth: makeInput('ex) 100'),
                            maxWidth: makeInput('ex) 100'),
                        }}
                        values={values}
                        setValue={setValue}
                        sectionKey="Layout"
                        disabled={locks['layout.sizing']}
                    />
                )}

                {/* height (+ 상세: minHeight/maxHeight) */}
                <RowShell>
                    <LeftCell title="높이" />
                    <RightCell
                        onToggleDetail={() => toggleDetail(dk('height'))}
                        detailActive={!!expanded[dk('height')]}
                    >
                        {renderValueControl(
                            'Layout',
                            'height',
                            {
                                ...makeChips([{ value: 'auto' }], { size: 'xs', free: true, placeholder: 'ex) 200px / 50%' }),
                                detailProperties: {
                                    minHeight: makeInput('ex) 100'),
                                    maxHeight: makeInput('ex) 100'),
                                },
                            },
                            values['height'],
                            (v) => setValue('height', v),
                            locks['layout.sizing']
                        )}
                    </RightCell>
                </RowShell>
                {!!expanded[dk('height')] && (
                    <DetailBlock
                        propsMap={{
                            minHeight: makeInput('ex) 100'),
                            maxHeight: makeInput('ex) 100'),
                        }}
                        values={values}
                        setValue={setValue}
                        sectionKey="Layout"
                        disabled={locks['layout.sizing']}
                    />
                )}

                {/* aspect-ratio */}
                <RowShell>
                    <LeftCell title="종횡비" />
                    <RightCell>
                        {renderValueControl(
                            'Layout',
                            'aspectRatio',
                            makeRatio('ex) 4/3', [{ value: '1/1', label: '1:1' }, { value: '16/9', label: '16:9' }]),
                            values['aspectRatio'],
                            (v) => setValue('aspectRatio', v),
                            locks['layout.sizing']
                        )}
                    </RightCell>
                </RowShell>

                {/* box-sizing */}
                <RowShell>
                    <LeftCell title="크기 계산" />
                    <RightCell>
                        {renderValueControl(
                            'Layout',
                            'boxSizing',
                            makeSelect(['content-box', 'border-box']),
                            values['boxSizing'],
                            (v) => setValue('boxSizing', v),
                            locks['layout.sizing']
                        )}
                    </RightCell>
                </RowShell>
            </div>

            {/* Spacing */}
            <div className="border-b border-neutral-200">
                <GroupHeader
                    label="Spacing"
                    Icon={GROUP_ICONS['Spacing']}
                    locked={!!locks['layout.spacing']}
                    onToggleLock={() => onToggleLock('layout.spacing')}
                />

                {/* padding (+ 상세: 4방향) */}
                <RowShell>
                    <LeftCell title="패딩" />
                    <RightCell
                        onToggleDetail={() => toggleDetail(dk('padding'))}
                        detailActive={!!expanded[dk('padding')]}
                    >
                        {renderValueControl(
                            'Layout',
                            'padding',
                            {
                                ...makeChips(['0', '2', '4', '8', '16'], { size: 'xs', free: true, placeholder: 'ex) 12px' }),
                                detailProperties: {
                                    paddingTop: makeChips(['0', '2', '4', '8'], { size: 'xs', free: true, placeholder: 'ex) 1' }),
                                    paddingRight: makeChips(['0', '2', '4', '8'], { size: 'xs', free: true, placeholder: 'ex) 1' }),
                                    paddingBottom: makeChips(['0', '2', '4', '8'], { size: 'xs', free: true, placeholder: 'ex) 1' }),
                                    paddingLeft: makeChips(['0', '2', '4', '8'], { size: 'xs', free: true, placeholder: 'ex) 1' }),
                                },
                            },
                            values['padding'],
                            (v) => setValue('padding', v),
                            locks['layout.spacing']
                        )}
                    </RightCell>
                </RowShell>
                {!!expanded[dk('padding')] && (
                    <DetailBlock
                        propsMap={{
                            paddingTop: makeChips(['0', '2', '4', '8'], { size: 'xs', free: true, placeholder: 'ex) 1' }),
                            paddingRight: makeChips(['0', '2', '4', '8'], { size: 'xs', free: true, placeholder: 'ex) 1' }),
                            paddingBottom: makeChips(['0', '2', '4', '8'], { size: 'xs', free: true, placeholder: 'ex) 1' }),
                            paddingLeft: makeChips(['0', '2', '4', '8'], { size: 'xs', free: true, placeholder: 'ex) 1' }),
                        }}
                        values={values}
                        setValue={setValue}
                        sectionKey="Layout"
                        disabled={locks['layout.spacing']}
                    />
                )}

                {/* margin (+ 상세: 4방향) */}
                <RowShell>
                    <LeftCell title="마진" />
                    <RightCell
                        onToggleDetail={() => toggleDetail(dk('margin'))}
                        detailActive={!!expanded[dk('margin')]}
                    >
                        {renderValueControl(
                            'Layout',
                            'margin',
                            {
                                ...makeChips(['0', '2', '4', '8', '16'], { size: 'xs', free: true, placeholder: 'ex) 12px' }),
                                detailProperties: {
                                    marginTop: makeChips(['0', '2', '4', '8'], { size: 'xs', free: true, placeholder: 'ex) 1' }),
                                    marginRight: makeChips(['0', '2', '4', '8'], { size: 'xs', free: true, placeholder: 'ex) 1' }),
                                    marginBottom: makeChips(['0', '2', '4', '8'], { size: 'xs', free: true, placeholder: 'ex) 1' }),
                                    marginLeft: makeChips(['0', '2', '4', '8'], { size: 'xs', free: true, placeholder: 'ex) 1' }),
                                },
                            },
                            values['margin'],
                            (v) => setValue('margin', v),
                            locks['layout.spacing']
                        )}
                    </RightCell>
                </RowShell>
                {!!expanded[dk('margin')] && (
                    <DetailBlock
                        propsMap={{
                            marginTop: makeChips(['0', '2', '4', '8'], { size: 'xs', free: true, placeholder: 'ex) 1' }),
                            marginRight: makeChips(['0', '2', '4', '8'], { size: 'xs', free: true, placeholder: 'ex) 1' }),
                            marginBottom: makeChips(['0', '2', '4', '8'], { size: 'xs', free: true, placeholder: 'ex) 1' }),
                            marginLeft: makeChips(['0', '2', '4', '8'], { size: 'xs', free: true, placeholder: 'ex) 1' }),
                        }}
                        values={values}
                        setValue={setValue}
                        sectionKey="Layout"
                        disabled={locks['layout.spacing']}
                    />
                )}

                {/* gap */}
                <RowShell>
                    <LeftCell title="간격" />
                    <RightCell>
                        {renderValueControl(
                            'Layout',
                            'gap',
                            makeChips(['0', '2', '4', '8', '16'], { size: 'xs', free: true, placeholder: 'ex) 12' }),
                            values['gap'],
                            (v) => setValue('gap', v),
                            locks['layout.spacing']
                        )}
                    </RightCell>
                </RowShell>
            </div>
        </>
    );
};

// ─────────────────────────────────────────────────────────────
// 섹션: Typography
// ─────────────────────────────────────────────────────────────
const TypographySection: React.FC<{
    values: Values;
    setValue: SetValue;
    locks: Record<string, boolean>;
    onToggleLock: (k: string) => void;
}> = ({ values, setValue, locks, onToggleLock }) => {
    return (
        <>
            {/* Font */}
            <div className="border-b border-neutral-200">
                <GroupHeader
                    label="Font"
                    Icon={GROUP_ICONS['Font']}
                    locked={!!locks['typo.font']}
                    onToggleLock={() => onToggleLock('typo.font')}
                />
                <RowShell>
                    <LeftCell title="글꼴" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'fontFamily',
                            makeSelect(['Inter', 'Pretendard', 'Noto Sans']),
                            values['fontFamily'],
                            (v) => setValue('fontFamily', v),
                            locks['typo.font']
                        )}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="크기" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'fontSize',
                            makeChips(['10', '12', '14', '16'], { size: 'xs', free: true, placeholder: 'ex) 18' }),
                            values['fontSize'],
                            (v) => setValue('fontSize', v),
                            locks['typo.font']
                        )}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="스타일" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'fontStyle',
                            makeSelect(['normal', 'italic', 'oblique']),
                            values['fontStyle'],
                            (v) => setValue('fontStyle', v),
                            locks['typo.font']
                        )}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="굵기" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'fontWeight',
                            makeSelect([
                                '100','200','300','400','500','600','700','800','900',
                                'normal','bold','bolder','lighter',
                            ]),
                            values['fontWeight'],
                            (v) => setValue('fontWeight', v),
                            locks['typo.font']
                        )}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="글자색" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'color',
                            makeColor(),
                            values['color'],
                            (v) => setValue('color', v),
                            locks['typo.font']
                        )}
                    </RightCell>
                </RowShell>
            </div>

            {/* Text */}
            <div className="border-b border-neutral-200">
                <GroupHeader
                    label="Text"
                    Icon={GROUP_ICONS['Text']}
                    locked={!!locks['typo.text']}
                    onToggleLock={() => onToggleLock('typo.text')}
                />

                <RowShell>
                    <LeftCell title="정렬" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'textAlign',
                            makeIcons([
                                { value: 'left',    iconKey: 'typography.textAlign:left' },
                                { value: 'center',  iconKey: 'typography.textAlign:center' },
                                { value: 'right',   iconKey: 'typography.textAlign:right' },
                                { value: 'justify', iconKey: 'typography.textAlign:justify' },
                            ], 'sm'),
                            values['textAlign'],
                            (v) => setValue('textAlign', v),
                            locks['typo.text']
                        )}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="대소문자" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'textTransform',
                            makeChips(['none', 'lowercase', 'uppercase', 'capitalize'], { size: 'sm' }),
                            values['textTransform'],
                            (v) => setValue('textTransform', v),
                            locks['typo.text']
                        )}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="장식" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'textDecoration',
                            makeChips(['none', 'underline', 'line-through'], { size: 'sm' }),
                            values['textDecoration'],
                            (v) => setValue('textDecoration', v),
                            locks['typo.text']
                        )}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="줄 높이" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'lineHeight',
                            makeChips(['1', '1.2', '1.5', '2'], { size: 'xs', free: true, placeholder: '1.4 / 20px' }),
                            values['lineHeight'],
                            (v) => setValue('lineHeight', v),
                            locks['typo.text']
                        )}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="자간" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'letterSpacing',
                            makeChips(['0', '0.5', '1', '2'], { size: 'xs', free: true, placeholder: 'ex) 0.2px' }),
                            values['letterSpacing'],
                            (v) => setValue('letterSpacing', v),
                            locks['typo.text']
                        )}
                    </RightCell>
                </RowShell>
            </div>

            {/* Content Flow */}
            <div className="border-b border-neutral-200">
                <GroupHeader
                    label="Content Flow"
                    locked={!!locks['typo.flow']}
                    onToggleLock={() => onToggleLock('typo.flow')}
                />

                <RowShell>
                    <LeftCell title="공백 처리" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'whiteSpace',
                            makeSelect(['normal', 'nowrap', 'pre', 'pre-wrap']),
                            values['whiteSpace'],
                            (v) => setValue('whiteSpace', v),
                            locks['typo.flow']
                        )}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="줄바꿈" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'wordBreak',
                            makeSelect(['normal', 'break-all', 'keep-all']),
                            values['wordBreak'],
                            (v) => setValue('wordBreak', v),
                            locks['typo.flow']
                        )}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="넘침 표시" />
                    <RightCell>
                        {renderValueControl(
                            'Typography',
                            'textOverflow',
                            makeSelect(['clip', 'ellipsis']),
                            values['textOverflow'],
                            (v) => setValue('textOverflow', v),
                            locks['typo.flow']
                        )}
                    </RightCell>
                </RowShell>
            </div>
        </>
    );
};

// ─────────────────────────────────────────────────────────────
// 섹션: Appearance
// ─────────────────────────────────────────────────────────────
const AppearanceSection: React.FC<{
    values: Values;
    setValue: SetValue;
    locks: Record<string, boolean>;
    onToggleLock: (k: string) => void;
    expanded: Record<string, boolean>;
    toggleDetail: (k: string) => void;
}> = ({ values, setValue, locks, onToggleLock, expanded, toggleDetail }) => {
    const dk = (prop: string) => `Appearance.${prop}`;
    return (
        <>
            {/* Fill */}
            <div className="border-b border-neutral-200">
                <GroupHeader
                    label="Fill"
                    locked={!!locks['appearance.fill']}
                    onToggleLock={() => onToggleLock('appearance.fill')}
                />

                <RowShell>
                    <LeftCell title="배경색" />
                    <RightCell>
                        {renderValueControl(
                            'Appearance',
                            'backgroundColor',
                            makeColor(),
                            values['backgroundColor'],
                            (v) => setValue('backgroundColor', v),
                            locks['appearance.fill']
                        )}
                    </RightCell>
                </RowShell>

                {/* background (shorthand + upload + detail: backgroundImage + dependents) */}
                <RowShell>
                    <LeftCell title="배경 상세" />
                    <RightCell
                        onToggleDetail={() => toggleDetail(dk('background'))}
                        detailActive={!!expanded[dk('background')]}
                    >
                        {renderValueControl(
                            'Appearance',
                            'background',
                            {
                                ...makeInput('<color> | <image> <position> / <size> repeat | ...', 'text', 'sm'),
                                ui: {
                                    size: 'sm',
                                    uploadButton: {
                                        enabled: true,
                                        accept: 'image/*',
                                        toValue: 'url()',
                                    },
                                },
                                shorthand: {
                                    enabled: true,
                                    layered: true,
                                    layerLimit: 1,
                                    syntax: '<color> | <image> <position> / <size> repeat | ...',
                                    longhandKeys: [
                                        'backgroundImage',
                                        'backgroundPosition',
                                        'backgroundSize',
                                        'backgroundRepeat',
                                        'backgroundClip',
                                        'backgroundOrigin',
                                        'backgroundAttachment',
                                    ],
                                },
                                detailProperties: {
                                    backgroundImage: {
                                        ...makeInput('url(...) / none', 'text', 'sm'),
                                        ui: {
                                            size: 'sm',
                                            uploadButton: { enabled: true, accept: 'image/*', toValue: 'url()' },
                                        },
                                        label: { ko: '이미지' },
                                    },
                                    backgroundPosition: {
                                        ...makeInput('url(...) / none', 'text', 'sm'),
                                        ui: {
                                            size: 'sm',
                                            uploadButton: { enabled: true, accept: 'image/*', toValue: 'url()' },
                                        },
                                        label: { ko: '이미지' },
                                    },
                                    backgroundSize: {
                                        ...makeInput('url(...) / none', 'text', 'sm'),
                                        ui: {
                                            size: 'sm',
                                            uploadButton: { enabled: true, accept: 'image/*', toValue: 'url()' },
                                        },
                                        label: { ko: '이미지' },
                                    },
                                    backgroundRepeat: {
                                        ...makeInput('url(...) / none', 'text', 'sm'),
                                        ui: {
                                            size: 'sm',
                                            uploadButton: { enabled: true, accept: 'image/*', toValue: 'url()' },
                                        },
                                        label: { ko: '이미지' },
                                    },
                                    backgroundClip: {
                                        ...makeInput('url(...) / none', 'text', 'sm'),
                                        ui: {
                                            size: 'sm',
                                            uploadButton: { enabled: true, accept: 'image/*', toValue: 'url()' },
                                        },
                                        label: { ko: '이미지' },
                                    },
                                    backgroundOrigin: {
                                        ...makeInput('url(...) / none', 'text', 'sm'),
                                        ui: {
                                            size: 'sm',
                                            uploadButton: { enabled: true, accept: 'image/*', toValue: 'url()' },
                                        },
                                        label: { ko: '이미지' },
                                    },
                                    backgroundAttachment: {
                                        ...makeInput('url(...) / none', 'text', 'sm'),
                                        ui: {
                                            size: 'sm',
                                            uploadButton: { enabled: true, accept: 'image/*', toValue: 'url()' },
                                        },
                                        label: { ko: '이미지' },
                                    },
                                },
                            },
                            values['background'],
                            (v) => setValue('background', v),
                            locks['appearance.fill']
                        )}
                    </RightCell>
                </RowShell>

                {!!expanded[dk('background')] && (
                    <DetailBlock
                        propsMap={{
                            backgroundImage: {
                                ...makeInput('url(...) / none', 'text', 'sm'),
                                ui: { size: 'sm', uploadButton: { enabled: true, accept: 'image/*', toValue: 'url()' } },
                                label: { ko: '이미지' },
                            },
                        }}
                        values={values}
                        setValue={setValue}
                        sectionKey="Appearance"
                        disabled={locks['appearance.fill']}
                        getDependentsFor={(propKey, curVal) => {
                            // backgroundImage 가 셋이면 하위 이미지 설정 노출
                            if (propKey === 'backgroundImage' && curVal && curVal.trim() !== '') {
                                return [
                                    {
                                        title: '이미지 설정',
                                        properties: {
                                            backgroundSize: makeSelect(['auto', 'cover', 'contain']),
                                            backgroundRepeat: makeSelect(['repeat', 'no-repeat', 'repeat-x', 'repeat-y']),
                                            backgroundPosition: makeInput('ex) 50% 50%', 'text', 'sm'),
                                            backgroundClip: makeSelect(['border-box', 'padding-box', 'content-box']),
                                            backgroundOrigin: makeSelect(['padding-box', 'border-box', 'content-box']),
                                            backgroundAttachment: makeSelect(['scroll', 'fixed', 'local']),
                                        },
                                    },
                                ];
                            }
                            return [];
                        }}
                    />
                )}
            </div>

            {/* Border */}
            <div className="border-b border-neutral-200">
                <GroupHeader
                    label="Border"
                    Icon={GROUP_ICONS['Border']}
                    locked={!!locks['appearance.border']}
                    onToggleLock={() => onToggleLock('appearance.border')}
                />

                {/* border (shorthand + detail: width/style/color) */}
                <RowShell>
                    <LeftCell title="테두리" />
                    <RightCell
                        onToggleDetail={() => toggleDetail(dk('border'))}
                        detailActive={!!expanded[dk('border')]}
                    >
                        {renderValueControl(
                            'Appearance',
                            'border',
                            {
                                ...makeInput('1px solid currentColor'),
                                placeholder: '1px solid currentColor',
                                shorthand: {
                                    enabled: true,
                                    syntax: '<width> || <style> || <color>',
                                    examples: ['1px solid #000'],
                                    longhandKeys: ['borderWidth', 'borderStyle', 'borderColor'],
                                },
                                ui: {
                                    size: 'xs',
                                    extraInput: { enabled: true, size: 'xs', placeholder: '1px solid black' },
                                },
                                detailProperties: {
                                    borderWidth: makeChips(['0', '1', '2', '4'], { size: 'xs', free: true, placeholder: '0' }),
                                    borderStyle: makeSelect(['none', 'solid', 'dashed', 'dotted']),
                                    borderColor: makeColor(),
                                },
                            },
                            values['border'],
                            (v) => setValue('border', v),
                            locks['appearance.border']
                        )}
                    </RightCell>
                </RowShell>
                {!!expanded[dk('border')] && (
                    <DetailBlock
                        propsMap={{
                            borderWidth: makeChips(['0', '1', '2', '4'], { size: 'xs', free: true, placeholder: '0' }),
                            borderStyle: makeSelect(['none', 'solid', 'dashed', 'dotted']),
                            borderColor: makeColor(),
                        }}
                        values={values}
                        setValue={setValue}
                        sectionKey="Appearance"
                        disabled={locks['appearance.border']}
                    />
                )}

                {/* border-radius (상세: 4코너) */}
                <RowShell>
                    <LeftCell title="모서리" />
                    <RightCell
                        onToggleDetail={() => toggleDetail(dk('borderRadius'))}
                        detailActive={!!expanded[dk('borderRadius')]}
                    >
                        {renderValueControl(
                            'Appearance',
                            'borderRadius',
                            {
                                ...makeChips(['0', '2', '4', '8'], { size: 'xs', free: true }),
                                detailProperties: {
                                    borderTopLeftRadius: makeChips(['0', '1', '2', '4'], { size: 'xs', free: true, placeholder: '0' }),
                                    borderTopRightRadius: makeChips(['0', '1', '2', '4'], { size: 'xs', free: true, placeholder: '0' }),
                                    borderBottomRightRadius: makeChips(['0', '1', '2', '4'], { size: 'xs', free: true, placeholder: '0' }),
                                    borderBottomLeftRadius: makeChips(['0', '1', '2', '4'], { size: 'xs', free: true, placeholder: '0' }),
                                },
                            },
                            values['borderRadius'],
                            (v) => setValue('borderRadius', v),
                            locks['appearance.border']
                        )}
                    </RightCell>
                </RowShell>
                {!!expanded[dk('borderRadius')] && (
                    <DetailBlock
                        propsMap={{
                            borderTopLeftRadius: makeChips(['0', '1', '2', '4'], { size: 'xs', free: true, placeholder: '0' }),
                            borderTopRightRadius: makeChips(['0', '1', '2', '4'], { size: 'xs', free: true, placeholder: '0' }),
                            borderBottomRightRadius: makeChips(['0', '1', '2', '4'], { size: 'xs', free: true, placeholder: '0' }),
                            borderBottomLeftRadius: makeChips(['0', '1', '2', '4'], { size: 'xs', free: true, placeholder: '0' }),
                        }}
                        values={values}
                        setValue={setValue}
                        sectionKey="Appearance"
                        disabled={locks['appearance.border']}
                    />
                )}

                {/* outline (shorthand + detail) */}
                <RowShell>
                    <LeftCell title="외곽선" />
                    <RightCell
                        onToggleDetail={() => toggleDetail(dk('outline'))}
                        detailActive={!!expanded[dk('outline')]}
                    >
                        {renderValueControl(
                            'Appearance',
                            'outline',
                            {
                                ...makeChips([], { size: 'xs', free: true, placeholder: '1px solid black' }),
                                placeholder: '1px solid currentColor',
                                shorthand: {
                                    enabled: true,
                                    syntax: '<outline-width> || <outline-style> || <outline-color>',
                                    examples: ['1px solid #000'],
                                    longhandKeys: ['outlineWidth', 'outlineStyle', 'outlineColor'],
                                },
                                detailProperties: {
                                    outlineWidth: makeChips(['0', '1', '2', '4'], { size: 'xs', free: true }),
                                    outlineStyle: makeSelect(['none', 'solid', 'dashed', 'dotted']),
                                    outlineColor: makeColor(),
                                },
                            },
                            values['outline'],
                            (v) => setValue('outline', v),
                            locks['appearance.border']
                        )}
                    </RightCell>
                </RowShell>
                {!!expanded[dk('outline')] && (
                    <DetailBlock
                        propsMap={{
                            outlineWidth: makeChips(['0', '1', '2', '4'], { size: 'xs', free: true }),
                            outlineStyle: makeSelect(['none', 'solid', 'dashed', 'dotted']),
                            outlineColor: makeColor(),
                        }}
                        values={values}
                        setValue={setValue}
                        sectionKey="Appearance"
                        disabled={locks['appearance.border']}
                    />
                )}
            </div>
        </>
    );
};

// ─────────────────────────────────────────────────────────────
// 섹션: Effects
// ─────────────────────────────────────────────────────────────
const EffectsSection: React.FC<{
    values: Values;
    setValue: SetValue;
    locks: Record<string, boolean>;
    onToggleLock: (k: string) => void;
    expanded: Record<string, boolean>;
    toggleDetail: (k: string) => void;
}> = ({ values, setValue, locks, onToggleLock, expanded, toggleDetail }) => {
    const dk = (prop: string) => `Effects.${prop}`;
    return (
        <>
            {/* Visual */}
            <div className="border-b border-neutral-200">
                <GroupHeader
                    label="Visual"
                    locked={!!locks['effects.visual']}
                    onToggleLock={() => onToggleLock('effects.visual')}
                />

                <RowShell>
                    <LeftCell title="투명도" />
                    <RightCell>
                        {renderValueControl(
                            'Effects',
                            'opacity',
                            makeChips(['1', '0.5', '0'], { size: 'xs', free: true, placeholder: '0~1' }),
                            values['opacity'],
                            (v) => setValue('opacity', v),
                            locks['effects.visual']
                        )}
                    </RightCell>
                </RowShell>

                {/* filter (shorthand + detail) */}
                <RowShell>
                    <LeftCell title="그래픽 효과" />
                    <RightCell
                        onToggleDetail={() => toggleDetail(dk('filter'))}
                        detailActive={!!expanded[dk('filter')]}
                    >
                        {renderValueControl(
                            'Effects',
                            'filter',
                            {
                                ...makeInput('blur(4px) brightness(0.9)', 'text', 'xl'),
                                shorthand: {
                                    enabled: true,
                                    layered: true,
                                    layerLimit: 1,
                                    syntax: '<filter-function-list>',
                                    longhandKeys: [
                                        'blur',
                                        'brightness',
                                        'contrast',
                                        'grayscale',
                                        'hue-rotate',
                                        'invert',
                                        'saturate',
                                        'sepia',
                                        'drop-shadow',
                                    ],
                                },
                                detailProperties: {
                                    blur: makeInput('blur(6px)'),
                                    brightness: makeInput('brightness(1.1)'),
                                    contrast: makeInput('contrast(1.2)'),
                                    grayscale: makeInput('grayscale(1)'),
                                    'hue-rotate': makeInput('hue-rotate(30deg)'),
                                    invert: makeInput('invert(1)'),
                                    saturate: makeInput('saturate(1.2)'),
                                    sepia: makeInput('sepia(1)'),
                                    'drop-shadow': makeInput('drop-shadow(0 2px 6px #0003)'),
                                },
                            },
                            values['filter'],
                            (v) => setValue('filter', v),
                            locks['effects.visual']
                        )}
                    </RightCell>
                </RowShell>
                {!!expanded[dk('filter')] && (
                    <DetailBlock
                        propsMap={{
                            blur: makeInput('blur(6px)'),
                            brightness: makeInput('brightness(1.1)'),
                            contrast: makeInput('contrast(1.2)'),
                            grayscale: makeInput('grayscale(1)'),
                            'hue-rotate': makeInput('hue-rotate(30deg)'),
                            invert: makeInput('invert(1)'),
                            saturate: makeInput('saturate(1.2)'),
                            sepia: makeInput('sepia(1)'),
                            'drop-shadow': makeInput('drop-shadow(0 2px 6px #0003)'),
                        }}
                        values={values}
                        setValue={setValue}
                        sectionKey="Effects"
                        disabled={locks['effects.visual']}
                    />
                )}

                <RowShell>
                    <LeftCell title="블렌드" />
                    <RightCell>
                        {renderValueControl(
                            'Effects',
                            'mixBlendMode',
                            makeSelect([
                                'normal','multiply','screen','overlay','darken','lighten',
                                'color-dodge','color-burn','hard-light','soft-light','difference','exclusion',
                                'hue','saturation','color','luminosity',
                            ]),
                            values['mixBlendMode'],
                            (v) => setValue('mixBlendMode', v),
                            locks['effects.visual']
                        )}
                    </RightCell>
                </RowShell>
            </div>

            {/* Transform */}
            <div className="border-b border-neutral-200">
                <GroupHeader
                    label="Transform"
                    locked={!!locks['effects.transform']}
                    onToggleLock={() => onToggleLock('effects.transform')}
                />

                {/* transform (shorthand + detail) */}
                <RowShell>
                    <LeftCell title="변형" />
                    <RightCell
                        onToggleDetail={() => toggleDetail(dk('transform'))}
                        detailActive={!!expanded[dk('transform')]}
                    >
                        {renderValueControl(
                            'Effects',
                            'transform',
                            {
                                ...makeInput('scale(1.05) rotate(5deg) translate(0, 4px)', 'text', 'xl'),
                                shorthand: {
                                    enabled: true,
                                    layered: true,
                                    layerLimit: 1,
                                    syntax: '<transform-function>+',
                                    longhandKeys: ['translate', 'scale', 'scaleX', 'scaleY', 'rotate', 'skew', 'skewX', 'skewY'],
                                },
                                detailProperties: {
                                    translate: makeInput('translate(10px, 0)'),
                                    scale: makeInput('scale(1.1)'),
                                    rotate: makeInput('rotate(10deg)'),
                                    skew: makeInput('skew(5deg, 0)'),
                                },
                            },
                            values['transform'],
                            (v) => setValue('transform', v),
                            locks['effects.transform']
                        )}
                    </RightCell>
                </RowShell>
                {!!expanded[dk('transform')] && (
                    <DetailBlock
                        propsMap={{
                            translate: makeInput('translate(10px, 0)'),
                            scale: makeInput('scale(1.1)'),
                            rotate: makeInput('rotate(10deg)'),
                            skew: makeInput('skew(5deg, 0)'),
                        }}
                        values={values}
                        setValue={setValue}
                        sectionKey="Effects"
                        disabled={locks['effects.transform']}
                    />
                )}

                <RowShell>
                    <LeftCell title="기준점" />
                    <RightCell>
                        {renderValueControl(
                            'Effects',
                            'transformOrigin',
                            makeInput('50% 50% / center'),
                            values['transformOrigin'],
                            (v) => setValue('transformOrigin', v),
                            locks['effects.transform']
                        )}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="원근" />
                    <RightCell>
                        {renderValueControl(
                            'Effects',
                            'perspective',
                            makeInput('600px'),
                            values['perspective'],
                            (v) => setValue('perspective', v),
                            locks['effects.transform']
                        )}
                    </RightCell>
                </RowShell>
            </div>

            {/* Transition */}
            <div className="border-b border-neutral-200">
                <GroupHeader
                    label="Transition"
                    locked={!!locks['effects.transition']}
                    onToggleLock={() => onToggleLock('effects.transition')}
                />

                {/* transition (shorthand + detail) */}
                <RowShell>
                    <LeftCell title="전환 효과" />
                    <RightCell
                        onToggleDetail={() => toggleDetail(dk('transition'))}
                        detailActive={!!expanded[dk('transition')]}
                    >
                        {renderValueControl(
                            'Effects',
                            'transition',
                            {
                                ...makeInput('all 150ms ease-out'),
                                shorthand: {
                                    enabled: true,
                                    layered: true,
                                    layerLimit: 1,
                                    syntax: '<property> <duration> <timing-function>? <delay>?',
                                    longhandKeys: [
                                        'transitionProperty',
                                        'transitionDuration',
                                        'transitionTimingFunction',
                                        'transitionDelay',
                                    ],
                                },
                                ui: { size: 'xs', extraInput: { enabled: true, size: 'xs', placeholder: 'opacity 200ms ease-in' } },
                                detailProperties: {
                                    transitionProperty: makeInput('opacity, transform'),
                                    transitionDuration: makeInput('200ms'),
                                    transitionTimingFunction: makeSelect(['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out'], 'xs'),
                                    transitionDelay: makeInput('0ms'),
                                },
                            },
                            values['transition'],
                            (v) => setValue('transition', v),
                            locks['effects.transition']
                        )}
                    </RightCell>
                </RowShell>
                {!!expanded[dk('transition')] && (
                    <DetailBlock
                        propsMap={{
                            transitionProperty: makeInput('opacity, transform'),
                            transitionDuration: makeInput('200ms'),
                            transitionTimingFunction: makeSelect(['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out'], 'xs'),
                            transitionDelay: makeInput('0ms'),
                        }}
                        values={values}
                        setValue={setValue}
                        sectionKey="Effects"
                        disabled={locks['effects.transition']}
                    />
                )}
            </div>
        </>
    );
};

// ─────────────────────────────────────────────────────────────
// 섹션: Interactivity
// ─────────────────────────────────────────────────────────────
const InteractivitySection: React.FC<{
    values: Values;
    setValue: SetValue;
    locks: Record<string, boolean>;
    onToggleLock: (k: string) => void;
}> = ({ values, setValue, locks, onToggleLock }) => {
    return (
        <>
            <div className="border-b border-neutral-200">
                <GroupHeader
                    label="User Interaction"
                    locked={!!locks['interact.user']}
                    onToggleLock={() => onToggleLock('interact.user')}
                />

                <RowShell>
                    <LeftCell title="커서" />
                    <RightCell>
                        {renderValueControl(
                            'Interactivity',
                            'cursor',
                            makeSelect(['auto', 'default', 'pointer', 'text', 'move']),
                            values['cursor'],
                            (v) => setValue('cursor', v),
                            locks['interact.user']
                        )}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="포인터 이벤트" />
                    <RightCell>
                        {renderValueControl(
                            'Interactivity',
                            'pointerEvents',
                            makeSelect(['auto', 'none']),
                            values['pointerEvents'],
                            (v) => setValue('pointerEvents', v),
                            locks['interact.user']
                        )}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="텍스트 선택" />
                    <RightCell>
                        {renderValueControl(
                            'Interactivity',
                            'userSelect',
                            makeSelect(['auto', 'text', 'none']),
                            values['userSelect'],
                            (v) => setValue('userSelect', v),
                            locks['interact.user']
                        )}
                    </RightCell>
                </RowShell>
            </div>
        </>
    );
};

// ─────────────────────────────────────────────────────────────
export default function StyleInspector({
                                           nodeId,
                                           defId,
                                           width = 360,
                                       }: {
    nodeId: string;
    defId: string;
    width?: number;
}) {
    // 값 상태 (초기값은 최소한만 — 실제에선 노드 스타일과 연결)
    const [values, setValues] = React.useState<Values>({
        display: 'block',
        overflow: 'visible',
        fontFamily: 'Inter',
        textAlign: 'left',
        __parentDisplay: undefined as any, // 편집기에서 주입 시 반영
    });
    const setValue: SetValue = (k, v) => setValues((prev) => ({ ...prev, [k]: v }));

    // 섹션 접기
    const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({
        Layout: false,
        Typography: false,
        Appearance: false,
        Effects: false,
        Interactivity: false,
    });

    // 그룹별 잠금
    const [locks, setLocks] = React.useState<Record<string, boolean>>({});
    const toggleLock = (k: string) => setLocks((p) => ({ ...p, [k]: !p[k] }));

    // 상세 토글 (prop별)
    const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
    const toggleDetail = (k: string) => setExpanded((p) => ({ ...p, [k]: !p[k] }));



    return (
        <div style={{ width }} className="text-[11px] text-neutral-800 overflow-x-hidden">
            {/* Layout */}
            <SectionFrame
                title="Layout"
                Icon={SECTION_ICONS['Layout']}
                collapsed={!!collapsed.Layout}
                onToggle={() => setCollapsed((p) => ({ ...p, Layout: !p.Layout }))}
            >
                <LayoutSection
                    values={values}
                    setValue={setValue}
                    locks={locks}
                    onToggleLock={toggleLock}
                    expanded={expanded}
                    toggleDetail={toggleDetail}
                />
            </SectionFrame>

            {/* Typography */}
            <SectionFrame
                title="Typography"
                Icon={SECTION_ICONS['Typography']}
                collapsed={!!collapsed.Typography}
                onToggle={() => setCollapsed((p) => ({ ...p, Typography: !p.Typography }))}
            >
                <TypographySection values={values} setValue={setValue} locks={locks} onToggleLock={toggleLock} />
            </SectionFrame>

            {/* Appearance */}
            <SectionFrame
                title="Appearance"
                Icon={SECTION_ICONS['Appearance']}
                collapsed={!!collapsed.Appearance}
                onToggle={() => setCollapsed((p) => ({ ...p, Appearance: !p.Appearance }))}
            >
                <AppearanceSection
                    values={values}
                    setValue={setValue}
                    locks={locks}
                    onToggleLock={toggleLock}
                    expanded={expanded}
                    toggleDetail={toggleDetail}
                />
            </SectionFrame>

            {/* Effects */}
            <SectionFrame
                title="Effects"
                Icon={SECTION_ICONS['Effects']}
                collapsed={!!collapsed.Effects}
                onToggle={() => setCollapsed((p) => ({ ...p, Effects: !p.Effects }))}
            >
                <EffectsSection
                    values={values}
                    setValue={setValue}
                    locks={locks}
                    onToggleLock={toggleLock}
                    expanded={expanded}
                    toggleDetail={toggleDetail}
                />
            </SectionFrame>

            {/* Interactivity */}
            <SectionFrame
                title="Interactivity"
                Icon={SECTION_ICONS['Interactivity']}
                collapsed={!!collapsed.Interactivity}
                onToggle={() => setCollapsed((p) => ({ ...p, Interactivity: !p.Interactivity }))}
            >
                <InteractivitySection values={values} setValue={setValue} locks={locks} onToggleLock={toggleLock} />
            </SectionFrame>
        </div>
    );
}