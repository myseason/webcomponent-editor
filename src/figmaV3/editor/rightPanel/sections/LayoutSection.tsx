'use client';

import * as React from 'react';
import {Maximize, MoveHorizontal, Grid2x2, Crosshair} from 'lucide-react';

import type {StyleValues, SetStyleValue, SectionProps} from '../util/types';
import {
    GroupHeader,
    RowShell,
    LeftCell,
    RightCell,
    DetailBlock,
    NoticeRow,
    InlineInfo,
    GROUP_ICONS
} from '../util/ui';
import { renderValueControl } from '../util/controls';
import { makeSelect, makeIcons, makeChips, makeColor, makeInput, makeRatio } from "@/figmaV3/editor/rightPanel/util/spec";
import {
    useSyncLonghand,
    expandBoxShorthand,
    setIfEmpty, disabledWithReason,
} from '../util/longhand';

/** Layout 섹션 (원본 UI/UX & 동작 그대로 유지) */
export const LayoutSection: React.FC<SectionProps> = ({
                                                         values,
                                                         setValue,
                                                         locks,
                                                         onToggleLock,
                                                         expanded,
                                                         openDetail,
                                                         canLock,
                                                         getCpVisible,
                                                     }) => {
    const display = values['display'];
    const isContainer = display === 'flex' || display === 'grid';
    const parentDisplay = values['__parentDisplay'];
    const showFlexContainer = display === 'flex' && isContainer;
    const showGridContainer = display === 'grid' && isContainer;
    const showFlexItem = parentDisplay === 'flex';
    const showGridItem = parentDisplay === 'grid';

    const sizingState = disabledWithReason('sizing', values, locks['layout.sizing']); // { disabled, reason }
    const sizingDisabled = sizingState.disabled;

    const dk = (prop: string) => `Layout.${prop}`;

    // position
    useSyncLonghand({
        expanded,
        detailKey: dk('inset'),
        shorthandKey: 'inset',
        values,
        setValue,
        parse: (raw) => {
            const b = expandBoxShorthand(String(raw ?? ''));
            return { top: b.top, right: b.right, bottom: b.bottom, left: b.left };
        },
        map: {
            top: 'top',
            right: 'right',
            bottom: 'bottom',
            left: 'left',
        },
    });

    // padding longhand 동기화
    useSyncLonghand({
        expanded,
        detailKey: dk('padding'),
        shorthandKey: 'padding',
        values,
        setValue,
        parse: (raw) => {
            const b = expandBoxShorthand(String(raw ?? ''));
            return { top: b.top, right: b.right, bottom: b.bottom, left: b.left };
        },
        map: {
            top: 'paddingTop',
            right: 'paddingRight',
            bottom: 'paddingBottom',
            left: 'paddingLeft',
        },
    });

    // margin longhand 동기화
    useSyncLonghand({
        expanded,
        detailKey: dk('margin'),
        shorthandKey: 'margin',
        values,
        setValue,
        parse: (raw) => {
            const b = expandBoxShorthand(String(raw ?? ''));
            return { top: b.top, right: b.right, bottom: b.bottom, left: b.left };
        },
        map: {
            top: 'marginTop',
            right: 'marginRight',
            bottom: 'marginBottom',
            left: 'marginLeft',
        },
    });

    return (
        <>
            {/* Display & Flow */}
            <div className="border-b border-neutral-200">
                <GroupHeader
                    label="Display & Flow"
                    Icon={GROUP_ICONS['Display & Flow']}
                    locked={canLock ? false : undefined}
                    onToggleLock={canLock ? () => onToggleLock('layout.display') : undefined}
                />

                <RowShell>
                    <LeftCell title="배치 방식" />
                    <RightCell>
                        {renderValueControl(
                            'Layout',
                            'display',
                            makeChips([{ value: 'block' }, { value: 'inline' }, { value: 'flex' }, { value: 'grid' }], { size: 'xs' }),
                            String(values['display'] ?? ''),
                            (v) => setValue('display', v),
                            locks['layout.display']
                        )}
                    </RightCell>
                </RowShell>

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
                                    String(values['flexDirection'] ?? ''),
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
                                    String(values['justifyContent'] ?? ''),
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
                                    String(values['alignItems'] ?? ''),
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
                                    String(values['flexWrap'] ?? ''),
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
                                    String(values['gap'] ?? ''),
                                    (v) => setValue('gap', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>
                    </>
                )}

                {showGridContainer && (
                    <>
                        <RowShell>
                            <LeftCell title="열 개수" />
                            <RightCell>
                                {renderValueControl(
                                    'Layout',
                                    'gridTemplateColumns',
                                    makeChips(['auto', '1', '2', '3'], { size: 'xs', free: true, placeholder: 'auto' }),
                                    String(values['gridTemplateColumns'] ?? ''),
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
                                    String(values['gridTemplateRows'] ?? ''),
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
                                    String(values['justifyItems'] ?? ''),
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
                                    String(values['alignItems'] ?? ''),
                                    (v) => setValue('alignItems', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>
                    </>
                )}

                {showFlexItem && (
                    <>
                        <RowShell>
                            <LeftCell title="개별 정렬" />
                            <RightCell>
                                {renderValueControl(
                                    'Layout',
                                    'alignSelf',
                                    makeSelect(['auto', 'flex-start', 'center', 'flex-end', 'stretch']),
                                    String(values['alignSelf'] ?? ''),
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
                                    String(values['order'] ?? ''),
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
                                    String(values['flex'] ?? ''),
                                    (v) => setValue('flex', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>
                    </>
                )}

                {showGridItem && (
                    <>
                        <RowShell>
                            <LeftCell title="열 범위" />
                            <RightCell>
                                {renderValueControl(
                                    'Layout',
                                    'gridColumn',
                                    makeInput('1 / 3'),
                                    String(values['gridColumn'] ?? ''),
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
                                    String(values['gridRow'] ?? ''),
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
                                    String(values['justifySelf'] ?? ''),
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
                                    String(values['alignSelf'] ?? ''),
                                    (v) => setValue('alignSelf', v),
                                    locks['layout.display']
                                )}
                            </RightCell>
                        </RowShell>
                    </>
                )}

                <RowShell>
                    <LeftCell title="오버플로우" />
                    <RightCell>
                        {renderValueControl(
                            'Layout',
                            'overflow',
                            makeSelect(['visible', 'hidden', 'scroll', 'auto']),
                            String(values['overflow'] ?? ''),
                            (v) => setValue('overflow', v),
                            locks['layout.display']
                        )}
                    </RightCell>
                </RowShell>
            </div>

            {/* position */}
            <div className="border-b border-neutral-200">
                <GroupHeader
                    label="Position"
                    Icon={GROUP_ICONS?.Position ?? Crosshair}
                    locked={canLock ? false : undefined}
                    onToggleLock={canLock ? () => onToggleLock('layout.position') : undefined}
                />
                {/* position: static이면 offsets 비활성 + 안내 배너 */}
                {(() => {
                    const state = disabledWithReason('positionOffsets', values, locks['layout.position']);
                    return (!locks['layout.position'] && state.reason) ? (
                        <NoticeRow tone="warning">{state.reason}</NoticeRow>
                    ) : null;
                })()}
                <RowShell>
                    <LeftCell title="Position" />
                    <RightCell>
                        {renderValueControl(
                            'Layout',
                            'position',
                            // select: static / relative / absolute / fixed / sticky
                            { control: 'select', options: [
                                    { value: 'static',   label: { ko: 'static' } },
                                    { value: 'relative', label: { ko: 'relative' } },
                                    { value: 'absolute', label: { ko: 'absolute' } },
                                    { value: 'fixed',    label: { ko: 'fixed' } },
                                    { value: 'sticky',   label: { ko: 'sticky' } },
                                ], ui: { size: 'sm' } },
                            String(values['position'] ?? ''),
                            (v) => setValue('position', v),
                            locks['layout.position']
                        )}
                    </RightCell>
                </RowShell>

                {/* inset (top/right/bottom/left 의 shorthand) */}
                <RowShell>
                    <LeftCell title="오프셋" />
                    <RightCell
                        onToggleDetail={() => openDetail(dk('inset'))}
                        detailActive={!!expanded[dk('inset')]}
                    >
                        {renderValueControl(
                            'Layout',
                            'inset',
                            {
                                control: 'input',
                                placeholder: 'ex) 0 | 10px 20px',
                                ui: { size: 'xs' },
                                shorthand: {
                                    enabled: true,
                                    syntax: '<top> <right> <bottom> <left> (1~4값)',
                                    longhandKeys: ['top', 'right', 'bottom', 'left'],
                                },
                            },
                            String(values['inset'] ?? ''),
                            (v) => setValue('inset', v),
                            // disabled: position: static 이거나 잠금일 때
                            disabledWithReason('positionOffsets', values, locks['layout.position']).disabled
                        )}
                    </RightCell>
                </RowShell>
                {/* 상세: top/right/bottom/left */}
                {expanded[dk('inset')] && (
                    <DetailBlock
                        propsMap={{
                            top:    makeInput('예) 0 / 10px', 'text', 'xs'),
                            right:  makeInput('예) 0 / 10px', 'text', 'xs'),
                            bottom: makeInput('예) 0 / 10px', 'text', 'xs'),
                            left:   makeInput('예) 0 / 10px', 'text', 'xs'),
                        }}
                        values={values}
                        setValue={setValue}
                        sectionKey="Layout"
                        disabled={(() => disabledWithReason('positionOffsets', values, locks['layout.position']))().disabled}
                        variant='smart'
                    />
                )}

                {/* z-index */}
                <RowShell>
                    <LeftCell title="z-index" />
                    <RightCell>
                        {renderValueControl(
                            'Layout',
                            'zIndex',
                            makeInput('ex) 1', 'number', 'xs'),
                            String(values['zIndex'] ?? ''),
                            (v) => setValue('zIndex', v),
                            locks['layout.position']
                        )}
                    </RightCell>
                </RowShell>
            </div>

            {/* Sizing */}
            <div className="border-b border-neutral-200">
                <GroupHeader
                    label="Sizing"
                    Icon={GROUP_ICONS['Sizing']}
                    locked={canLock ? false : undefined}
                    onToggleLock={canLock ? () => onToggleLock('layout.sizing') : undefined}
                />
                {/* 새 전용 메시지 Row (RowShell 바깥에서 한 줄 전체 사용) */}
                {!locks['layout.sizing'] && sizingState.reason && (
                    <NoticeRow tone="warning">{sizingState.reason}</NoticeRow>
                )}
                {/* width */}
                <RowShell>
                    <LeftCell title="너비" />
                    <RightCell
                        onToggleDetail={() => openDetail(dk('width'))}
                        detailActive={expanded[dk('width')]}
                    >
                        {renderValueControl(
                            'Layout',
                            'width',
                            makeChips([{ value: 'auto' }], { size: 'xs', free: true, placeholder: 'ex) 320px / 50%' }),
                            String(values['width'] ?? ''),
                            (v) => setValue('width', v),
                            sizingDisabled  // 인라인이면 비활성
                        )}
                    </RightCell>
                </RowShell>
                {expanded[dk('width')] && (
                    <DetailBlock
                        variant="smart"                 // ★ 아이콘 없이 단순 롱핸드
                        propsMap={{
                            minWidth: {
                                ...makeInput('ex) 100'),
                                label: { ko: '최소 너비', en: 'Min Width' }
                            },
                            maxWidth: {
                                ...makeInput('ex) 100'),
                                label: { ko: '최대 너비', en: 'Max Width' }
                            },
                        }}
                        values={values}
                        setValue={setValue}
                        sectionKey="Layout"
                        disabled={sizingDisabled}  // 인라인이면 비활성
                    />
                )}

                {/* height */}
                <RowShell>
                    <LeftCell title="높이" />
                    <RightCell
                        onToggleDetail={() => openDetail(dk('height'))}
                        detailActive={expanded[dk('height')]}
                    >
                        {renderValueControl(
                            'Layout',
                            'height',
                            makeChips([{ value: 'auto' }], { size: 'xs', free: true, placeholder: 'ex) 200px / 50%' }),
                            String(values['height'] ?? ''),
                            (v) => setValue('height', v),
                            sizingDisabled  // 인라인이면 비활성
                        )}
                    </RightCell>
                </RowShell>
                {expanded[dk('height')] && (
                    <DetailBlock
                        variant="smart"                 // ★ 아이콘 없이 단순 롱핸드
                        propsMap={{
                            minHeight: {
                                ...makeInput('ex) 100'),
                                label: { ko: '최소 높이', en: 'Min Height' }
                            },
                            maxHeight: {
                                ...makeInput('ex) 100'),
                                label: { ko: '최대 높이', en: 'Max Height' }
                            },
                        }}
                        values={values}
                        setValue={setValue}
                        sectionKey="Layout"
                        disabled={sizingDisabled} // 인라인이면 비활성}
                    />
                )}

                <RowShell>
                    <LeftCell title="종횡비" />
                    <RightCell>
                        {renderValueControl(
                            'Layout',
                            'aspectRatio',
                            makeRatio('ex) 4/3',
                                [{ value: '4/3', label: '4:3' }, { value: '16/9', label: '16:9' }],
                                'xs'),
                            String(values['aspectRatio'] ?? ''),
                            (v) => setValue('aspectRatio', v),
                            sizingDisabled
                        )}
                    </RightCell>
                </RowShell>

                <RowShell>
                    <LeftCell title="크기 계산" />
                    <RightCell>
                        {renderValueControl(
                            'Layout',
                            'boxSizing',
                            makeSelect(['content-box', 'border-box']),
                            String(values['boxSizing'] ?? ''),
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
                    locked={canLock ? false : undefined}
                    onToggleLock={canLock ? () => onToggleLock('layout.spacing') : undefined}
                />

                {/* padding */}
                <RowShell>
                    <LeftCell title="패딩" />
                    <RightCell
                        onToggleDetail={() =>
                            openDetail(dk('padding'), () => {
                                const base = expandBoxShorthand(String(values.padding ?? ''));
                                setIfEmpty(values, setValue, 'paddingTop', base.top);
                                setIfEmpty(values, setValue, 'paddingRight', base.right);
                                setIfEmpty(values, setValue, 'paddingBottom', base.bottom);
                                setIfEmpty(values, setValue, 'paddingLeft', base.left);
                            })
                        }
                        detailActive={expanded[dk('padding')]}
                    >
                        {renderValueControl(
                            'Layout',
                            'padding',
                            makeChips(['0', '2', '4', '8', '16'], { size: 'xs', free: true, placeholder: 'ex) 12px' }),
                            String(values['padding'] ?? ''),
                            (v) => setValue('padding', v),
                            locks['layout.spacing']
                        )}
                    </RightCell>
                </RowShell>
                {expanded[dk('padding')] && (
                    <DetailBlock
                        sectionKey="Layout"
                        values={values}
                        setValue={setValue}
                        disabled={locks['layout.spacing']}
                        propsMap={{
                            paddingTop: {
                                ...makeChips(['0','2','4','8'], { size: 'xs', free: true, placeholder: 'ex) 1' }),
                                label: { ko: '상단 여백', en: 'Padding Top' }
                            },
                            paddingRight: {
                                ...makeChips(['0', '2', '4', '8'], {size: 'xs', free: true, placeholder: 'ex) 1'}),
                                label: { ko: '오늘쪽 여백', en: 'Padding Right' }
                            },
                            paddingBottom: {
                                ...makeChips(['0', '2', '4', '8'], {size: 'xs', free: true, placeholder: 'ex) 1'}),
                                label: { ko: '하단 여백', en: 'Padding Bottom' }
                            },
                            paddingLeft: {
                                ...makeChips(['0', '2', '4', '8'], {size: 'xs', free: true, placeholder: 'ex) 1'}),
                                label: {ko: '왼쪽 여백', en: 'Padding Left'}
                            }

                        }}
                        variant='smart'
                    />
                )}

                {/* margin */}
                <RowShell>
                    <LeftCell title="마진" />
                    <RightCell
                        onToggleDetail={() =>
                            openDetail(dk('margin'), () => {
                                const base = expandBoxShorthand(String(values.margin ?? ''));
                                setIfEmpty(values, setValue, 'marginTop', base.top);
                                setIfEmpty(values, setValue, 'marginRight', base.right);
                                setIfEmpty(values, setValue, 'marginBottom', base.bottom);
                                setIfEmpty(values, setValue, 'marginLeft', base.left);
                            })
                        }
                        detailActive={expanded[dk('margin')]}
                    >
                        {renderValueControl(
                            'Layout',
                            'margin',
                            makeChips(['0', '2', '4', '8', '16'], { size: 'xs', free: true, placeholder: 'ex) 12px' }),
                            String(values['margin'] ?? ''),
                            (v) => setValue('margin', v),
                            locks['layout.spacing']
                        )}
                    </RightCell>
                </RowShell>
                {expanded[dk('margin')] && (
                    <DetailBlock
                        sectionKey="Layout"
                        values={values}
                        setValue={setValue}
                        disabled={locks['layout.spacing']}
                        propsMap={{
                            marginTop: {
                                ...makeChips(['0','2','4','8'], { size: 'xs', free: true, placeholder: 'ex) 1' }),
                                label: { ko: '상단 여백', en: 'Margin Top' }
                            },
                            marginRight: {
                                ...makeChips(['0', '2', '4', '8'], {size: 'xs', free: true, placeholder: 'ex) 1'}),
                                label: { ko: '오늘쪽 여백', en: 'Margin Right' }
                            },
                            marginBottom: {
                                ...makeChips(['0', '2', '4', '8'], {size: 'xs', free: true, placeholder: 'ex) 1'}),
                                label: { ko: '하단 여백', en: 'Margin Bottom' }
                            },
                            marginLeft: {
                                ...makeChips(['0', '2', '4', '8'], {size: 'xs', free: true, placeholder: 'ex) 1'}),
                                label: {ko: '왼쪽 여백', en: 'Margin Left'}
                            }

                        }}
                        variant='smart'
                    />
                )}

                <RowShell>
                    <LeftCell title="간격" />
                    <RightCell>
                        {renderValueControl(
                            'Layout',
                            'gap',
                            makeChips(['0', '2', '4', '8', '16'], { size: 'xs', free: true, placeholder: 'ex) 12' }),
                            String(values['gap'] ?? ''),
                            (v) => setValue('gap', v),
                            locks['layout.spacing']
                        )}
                    </RightCell>
                </RowShell>
            </div>
        </>
    );
};

export default LayoutSection;