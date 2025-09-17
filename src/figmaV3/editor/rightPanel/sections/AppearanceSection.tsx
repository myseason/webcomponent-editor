'use client';

import * as React from 'react';
import { Square } from 'lucide-react';

import type { StyleValues, SetStyleValue } from '../util/types';
import {
    GroupHeader,
    RowShell,
    LeftCell,
    RightCell, DetailBlock,
} from '../util/ui';
import { renderValueControl } from '../util/controls';
import { makeSelect, makeIcons, makeChips, makeColor, makeInput, makeRatio } from "@/figmaV3/editor/rightPanel/util/spec";
import {
    useSyncLonghand,
    parseBackground,
    parseBorderLike,
    setIfEmpty,
} from '../util/longhand';

// 아이콘 매핑
const GROUP_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    Border: Square,
};

export interface AppearanceSectionProps {
    values: StyleValues;
    setValue: SetStyleValue;
    locks: Record<string, boolean>;
    onToggleLock: (k: string) => void;
    expanded: Record<string, boolean>;
    /** 상세를 펼칠 때 호출(원본처럼 시드 가능) */
    openDetail: (detailKey: string, seed?: () => void) => void;
}

/** Appearance 섹션 (원본 UI/UX & 동작 유지) */
const AppearanceSection: React.FC<AppearanceSectionProps> = ({
                                                                 values,
                                                                 setValue,
                                                                 locks,
                                                                 onToggleLock,
                                                                 expanded,
                                                                 openDetail,
                                                             }) => {
    const dk = (prop: string) => `Appearance.${prop}`;

    // background longhand 동기화
    useSyncLonghand({
        expanded,
        detailKey: dk('background'),
        shorthandKey: 'background',
        values,
        setValue,
        parse: (raw) => parseBackground(String(raw ?? '')),
        map: {
            backgroundImage: 'backgroundImage',
            backgroundPosition: 'backgroundPosition',
            backgroundSize: 'backgroundSize',
            backgroundRepeat: 'backgroundRepeat',
            backgroundClip: 'backgroundClip',
            backgroundOrigin: 'backgroundOrigin',
            backgroundAttachment: 'backgroundAttachment',
        },
    });

    // border (width/style/color)
    useSyncLonghand({
        expanded,
        detailKey: dk('border'),
        shorthandKey: 'border',
        values,
        setValue,
        parse: (raw) => {
            const b = parseBorderLike(String(raw ?? ''));
            return { width: b.width, style: b.style, color: b.color };
        },
        map: { width: 'borderWidth', style: 'borderStyle', color: 'borderColor' },
    });

    // borderRadius (단일값 → 4코너 복제)
    useSyncLonghand({
        expanded,
        detailKey: dk('borderRadius'),
        shorthandKey: 'borderRadius',
        values,
        setValue,
        parse: (raw) => {
            const v = String(raw ?? '').trim();
            return { tl: v, tr: v, br: v, bl: v };
        },
        map: {
            tl: 'borderTopLeftRadius',
            tr: 'borderTopRightRadius',
            br: 'borderBottomRightRadius',
            bl: 'borderBottomLeftRadius',
        },
    });

    // outline
    useSyncLonghand({
        expanded,
        detailKey: dk('outline'),
        shorthandKey: 'outline',
        values,
        setValue,
        parse: (raw) => {
            const b = parseBorderLike(String(raw ?? ''));
            return { width: b.width, style: b.style, color: b.color };
        },
        map: { width: 'outlineWidth', style: 'outlineStyle', color: 'outlineColor' },
    });

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
                            String(values['backgroundColor'] ?? ''),
                            (v) => setValue('backgroundColor', v),
                            locks['appearance.fill']
                        )}
                    </RightCell>
                </RowShell>

                {/* background */}
                <RowShell>
                    <LeftCell title="배경 상세" />
                    <RightCell
                        onToggleDetail={() =>
                            openDetail(dk('background'), () => {
                                const b = parseBackground(String(values.background ?? ''));
                                setIfEmpty(values, setValue, 'backgroundImage', b.backgroundImage);
                                setIfEmpty(values, setValue, 'backgroundPosition', b.backgroundPosition);
                                setIfEmpty(values, setValue, 'backgroundSize', b.backgroundSize);
                                setIfEmpty(values, setValue, 'backgroundRepeat', b.backgroundRepeat);
                                setIfEmpty(values, setValue, 'backgroundClip', b.backgroundClip);
                                setIfEmpty(values, setValue, 'backgroundOrigin', b.backgroundOrigin);
                                setIfEmpty(values, setValue, 'backgroundAttachment', b.backgroundAttachment);
                            })
                        }
                        detailActive={!!expanded[dk('background')]}
                    >
                        {renderValueControl(
                            'Appearance',
                            'background',
                            {
                                ...makeInput('<color> | <image> <position> / <size> repeat | ...', 'text', 'sm'),
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
                                ui: { size: 'sm', uploadButton: { enabled: true, accept: 'image/*', toValue: 'url()' } },
                            },
                            String(values['background'] ?? ''),
                            (v) => setValue('background', v),
                            locks['appearance.fill']
                        )}
                    </RightCell>
                </RowShell>

                {!!expanded[dk('background')] && (
                    <div className="ml-4 border-l border-dashed border-neutral-200 pl-3 mt-2">
                        {/* backgroundImage + dependents */}
                        <RowShell>
                            <LeftCell title="이미지" />
                            <RightCell>
                                {renderValueControl(
                                    'Appearance',
                                    'backgroundImage',
                                    { ...makeInput('url(...) / none', 'text', 'sm'), ui: { size: 'sm', uploadButton: { enabled: true, accept: 'image/*', toValue: 'url()' } } },
                                    String(values['backgroundImage'] ?? ''),
                                    (v) => setValue('backgroundImage', v),
                                    locks['appearance.fill']
                                )}
                            </RightCell>
                        </RowShell>

                        {(values['backgroundImage'] ?? '').trim() !== '' && (
                            <>
                                <RowShell>
                                    <LeftCell title="Size" />
                                    <RightCell>
                                        {renderValueControl(
                                            'Appearance',
                                            'backgroundSize',
                                            makeSelect(['auto','cover','contain']),
                                            String(values['backgroundSize'] ?? ''),
                                            (v) => setValue('backgroundSize', v),
                                            locks['appearance.fill']
                                        )}
                                    </RightCell>
                                </RowShell>
                                <RowShell>
                                    <LeftCell title="Repeat" />
                                    <RightCell>
                                        {renderValueControl(
                                            'Appearance',
                                            'backgroundRepeat',
                                            makeSelect(['repeat','no-repeat','repeat-x','repeat-y']),
                                            String(values['backgroundRepeat'] ?? ''),
                                            (v) => setValue('backgroundRepeat', v),
                                            locks['appearance.fill']
                                        )}
                                    </RightCell>
                                </RowShell>
                                <RowShell>
                                    <LeftCell title="Position" />
                                    <RightCell>
                                        {renderValueControl(
                                            'Appearance',
                                            'backgroundPosition',
                                            makeInput('ex) 50% 50%', 'text', 'sm'),
                                            String(values['backgroundPosition'] ?? ''),
                                            (v) => setValue('backgroundPosition', v),
                                            locks['appearance.fill']
                                        )}
                                    </RightCell>
                                </RowShell>
                                <RowShell>
                                    <LeftCell title="Clip" />
                                    <RightCell>
                                        {renderValueControl(
                                            'Appearance',
                                            'backgroundClip',
                                            makeSelect(['border-box','padding-box','content-box']),
                                            String(values['backgroundClip'] ?? ''),
                                            (v) => setValue('backgroundClip', v),
                                            locks['appearance.fill']
                                        )}
                                    </RightCell>
                                </RowShell>
                                <RowShell>
                                    <LeftCell title="Origin" />
                                    <RightCell>
                                        {renderValueControl(
                                            'Appearance',
                                            'backgroundOrigin',
                                            makeSelect(['padding-box','border-box','content-box']),
                                            String(values['backgroundOrigin'] ?? ''),
                                            (v) => setValue('backgroundOrigin', v),
                                            locks['appearance.fill']
                                        )}
                                    </RightCell>
                                </RowShell>
                                <RowShell>
                                    <LeftCell title="Attachment" />
                                    <RightCell>
                                        {renderValueControl(
                                            'Appearance',
                                            'backgroundAttachment',
                                            makeSelect(['scroll','fixed','local']),
                                            String(values['backgroundAttachment'] ?? ''),
                                            (v) => setValue('backgroundAttachment', v),
                                            locks['appearance.fill']
                                        )}
                                    </RightCell>
                                </RowShell>
                            </>
                        )}
                    </div>
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

                {/* border */}
                <RowShell>
                    <LeftCell title="테두리" />
                    <RightCell
                        onToggleDetail={() =>
                            openDetail(dk('border'), () => {
                                const b = parseBorderLike(String(values.border ?? ''));
                                setIfEmpty(values, setValue, 'borderWidth', b.width);
                                setIfEmpty(values, setValue, 'borderStyle', b.style);
                                setIfEmpty(values, setValue, 'borderColor', b.color);
                            })
                        }
                        detailActive={!!expanded[dk('border')]}
                    >
                        {renderValueControl(
                            'Appearance',
                            'border',
                            {
                                ...makeInput('1px solid currentColor'),
                                shorthand: {
                                    enabled: true,
                                    syntax: '<width> || <style> || <color>',
                                    examples: ['1px solid #000'],
                                    longhandKeys: ['borderWidth','borderStyle','borderColor'],
                                },
                                ui: { size: 'xs', extraInput: { enabled: true, size: 'xs', placeholder: '1px solid black' } },
                            },
                            String(values['border'] ?? ''),
                            (v) => setValue('border', v),
                            locks['appearance.border']
                        )}
                    </RightCell>
                </RowShell>

                {!!expanded[dk('border')] && (
                    <div className="ml-4 border-l border-dashed border-neutral-200 pl-3 mt-2">
                        <RowShell>
                            <LeftCell title="두께" />
                            <RightCell>
                                {renderValueControl(
                                    'Appearance',
                                    'borderWidth',
                                    makeChips(['0','1','2','4'], { size: 'xs', free: true, placeholder: '0' }),
                                    String(values['borderWidth'] ?? ''),
                                    (v) => setValue('borderWidth', v),
                                    locks['appearance.border']
                                )}
                            </RightCell>
                        </RowShell>
                        <RowShell>
                            <LeftCell title="스타일" />
                            <RightCell>
                                {renderValueControl(
                                    'Appearance',
                                    'borderStyle',
                                    makeSelect(['none','solid','dashed','dotted']),
                                    String(values['borderStyle'] ?? ''),
                                    (v) => setValue('borderStyle', v),
                                    locks['appearance.border']
                                )}
                            </RightCell>
                        </RowShell>
                        <RowShell>
                            <LeftCell title="색상" />
                            <RightCell>
                                {renderValueControl(
                                    'Appearance',
                                    'borderColor',
                                    makeColor(),
                                    String(values['borderColor'] ?? ''),
                                    (v) => setValue('borderColor', v),
                                    locks['appearance.border']
                                )}
                            </RightCell>
                        </RowShell>
                    </div>
                )}

                {/* borderRadius */}
                <RowShell>
                    <LeftCell title="모서리" />
                    <RightCell
                        onToggleDetail={() =>
                            openDetail(dk('borderRadius'), () => {
                                const base = String(values.borderRadius ?? '');
                                if (!base) return;
                                setIfEmpty(values, setValue, 'borderTopLeftRadius', base);
                                setIfEmpty(values, setValue, 'borderTopRightRadius', base);
                                setIfEmpty(values, setValue, 'borderBottomRightRadius', base);
                                setIfEmpty(values, setValue, 'borderBottomLeftRadius', base);
                            })
                        }
                        detailActive={!!expanded[dk('borderRadius')]}
                    >
                        {renderValueControl(
                            'Appearance',
                            'borderRadius',
                            makeChips(['0','2','4','8'], { size: 'xs', free: true }),
                            String(values['borderRadius'] ?? ''),
                            (v) => setValue('borderRadius', v),
                            locks['appearance.border']
                        )}
                    </RightCell>
                </RowShell>
                {!!expanded[dk('borderRadius')] && (
                    <DetailBlock
                        sectionKey="Layout"
                        values={values}
                        setValue={setValue}
                        disabled={locks['layout.spacing']}
                        propsMap={{
                            borderTopLeftRadius: {
                                ...makeChips(['0','1','2','4'], { size: 'xs', free: true, placeholder: 'ex) 1' }),
                                label: { ko: 'TL', en: 'Border TopLeft Radius' }
                            },
                            borderTopRightRadius: {
                                ...makeChips(['0', '1', '2', '4'], {size: 'xs', free: true, placeholder: 'ex) 1'}),
                                label: { ko: 'TR', en: 'Border TopRight Radius' }
                            },
                            borderBottomRightRadius: {
                                ...makeChips(['0', '1', '2', '4'], {size: 'xs', free: true, placeholder: 'ex) 1'}),
                                label: { ko: 'BR', en: 'Border BottomRight Radius' }
                            },
                            borderBottomLeftRadius: {
                                ...makeChips(['0', '1', '2', '4'], {size: 'xs', free: true, placeholder: 'ex) 1'}),
                                label: {ko: 'BL', en: 'Border BottomLeft Radius'}
                            }
                        }}
                        variant='smart'
                    />
                )}

                {/* outline */}
                <RowShell>
                    <LeftCell title="외곽선" />
                    <RightCell
                        onToggleDetail={() =>
                            openDetail(dk('outline'), () => {
                                const b = parseBorderLike(String(values.outline ?? ''));
                                setIfEmpty(values, setValue, 'outlineWidth', b.width);
                                setIfEmpty(values, setValue, 'outlineStyle', b.style);
                                setIfEmpty(values, setValue, 'outlineColor', b.color);
                            })
                        }
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
                                    longhandKeys: ['outlineWidth','outlineStyle','outlineColor'],
                                },
                            },
                            String(values['outline'] ?? ''),
                            (v) => setValue('outline', v),
                            locks['appearance.border']
                        )}
                    </RightCell>
                </RowShell>

                {!!expanded[dk('outline')] && (
                    <div className="ml-4 border-l border-dashed border-neutral-200 pl-3 mt-2">
                        <RowShell>
                            <LeftCell title="두께" />
                            <RightCell>
                                {renderValueControl(
                                    'Appearance',
                                    'outlineWidth',
                                    makeChips(['0','1','2','4'], { size: 'xs', free: true }),
                                    String(values['outlineWidth'] ?? ''),
                                    (v) => setValue('outlineWidth', v),
                                    locks['appearance.border']
                                )}
                            </RightCell>
                        </RowShell>
                        <RowShell>
                            <LeftCell title="스타일" />
                            <RightCell>
                                {renderValueControl(
                                    'Appearance',
                                    'outlineStyle',
                                    makeSelect(['none','solid','dashed','dotted']),
                                    String(values['outlineStyle'] ?? ''),
                                    (v) => setValue('outlineStyle', v),
                                    locks['appearance.border']
                                )}
                            </RightCell>
                        </RowShell>
                        <RowShell>
                            <LeftCell title="색상" />
                            <RightCell>
                                {renderValueControl(
                                    'Appearance',
                                    'outlineColor',
                                    makeColor(),
                                    String(values['outlineColor'] ?? ''),
                                    (v) => setValue('outlineColor', v),
                                    locks['appearance.border']
                                )}
                            </RightCell>
                        </RowShell>
                    </div>
                )}
            </div>
        </>
    );
};

export default AppearanceSection;