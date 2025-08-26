'use client';

import React from 'react';
import type { CSSDict, InspectorFilter, TagPolicy, TagPolicyMap } from '../../../../core/types';
import { useAllowed, Label, MiniSelect, MiniInput, ChipBtn, DisabledHint, DisallowReason, IconBtn } from './common';
import { isContainerTag } from '../../../../runtime/capabilities';

import {
    AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
    AlignHorizontalSpaceBetween, AlignHorizontalSpaceAround, AlignHorizontalDistributeCenter,
    AlignStartVertical, AlignCenterVertical, AlignEndVertical,
    AlignVerticalSpaceBetween, AlignVerticalSpaceAround, AlignVerticalDistributeCenter,
    StretchHorizontal, StretchVertical, GalleryHorizontal, GalleryVertical, ArrowLeftRight, ArrowUpDown,
} from 'lucide-react';

type IconCmp = React.ComponentType<{ size?: number; className?: string }>;

export function LayoutGroup(props: {
    el: Record<string, unknown>;
    tag: string;
    tagPolicy: TagPolicy | undefined;
    tf: InspectorFilter | undefined;
    map: TagPolicyMap | undefined;
    expert: boolean;
    patch: (css: CSSDict) => void;
    open: boolean;
    onToggle: () => void;
}) {
    const { el, tag, patch, tf, map, expert, tagPolicy, open, onToggle } = props;
    const allowLayout = useAllowed(['display', 'overflow', 'width', 'height'], tf, tag, map, expert);
    const allowFlex   = useAllowed(['flexDirection', 'justifyContent', 'alignItems', 'gap'], tf, tag, map, expert);
    const allowGrid   = useAllowed(
        ['gridTemplateColumns','gridTemplateRows','gridAutoFlow','gap','rowGap','columnGap','justifyItems','alignItems','justifyContent','alignContent'],
        tf, tag, map, expert
    );

    const dis = (k: string): DisallowReason => {
        if (tagPolicy?.styles?.allow && !tagPolicy.styles.allow.includes(k)) return 'tag';
        if (tagPolicy?.styles?.deny && tagPolicy.styles.deny.includes(k)) return 'tag';
        if (!expert && tf?.styles) {
            if (tf.styles.allow && !tf.styles.allow.includes(k)) return 'template';
            if (tf.styles.deny && tf.styles.deny.includes(k)) return 'template';
        }
        return null;
    };

    const display = (el.display as string) ?? 'block';
    const isInline = display === 'inline';
    const container = isContainerTag(tag, tagPolicy);

    const dir = (el.flexDirection as string) ?? 'row';
    const isCol = dir === 'column' || dir === 'column-reverse';
    const justifyIcons: { v: string; title: string; I: IconCmp }[] = isCol
        ? [
            { v: 'flex-start', title: 'flex-start', I: AlignStartVertical },
            { v: 'center', title: 'center', I: AlignCenterVertical },
            { v: 'flex-end', title: 'flex-end', I: AlignEndVertical },
            { v: 'space-between', title: 'space-between', I: AlignVerticalSpaceBetween },
            { v: 'space-around', title: 'space-around', I: AlignVerticalSpaceAround },
            { v: 'space-evenly', title: 'space-evenly', I: AlignVerticalDistributeCenter },
        ]
        : [
            { v: 'flex-start', title: 'flex-start', I: AlignStartHorizontal },
            { v: 'center', title: 'center', I: AlignCenterHorizontal },
            { v: 'flex-end', title: 'flex-end', I: AlignEndHorizontal },
            { v: 'space-between', title: 'space-between', I: AlignHorizontalSpaceBetween },
            { v: 'space-around', title: 'space-around', I: AlignHorizontalSpaceAround },
            { v: 'space-evenly', title: 'space-evenly', I: AlignHorizontalDistributeCenter },
        ];
    const alignIcons: { v: string; title: string; I: IconCmp }[] = isCol
        ? [
            { v: 'flex-start', title: 'flex-start', I: AlignStartHorizontal },
            { v: 'center', title: 'center', I: AlignCenterHorizontal },
            { v: 'flex-end', title: 'flex-end', I: AlignEndHorizontal },
            { v: 'stretch', title: 'stretch', I: StretchHorizontal },
        ]
        : [
            { v: 'flex-start', title: 'flex-start', I: AlignStartVertical },
            { v: 'center', title: 'center', I: AlignCenterVertical },
            { v: 'flex-end', title: 'flex-end', I: AlignEndVertical },
            { v: 'stretch', title: 'stretch', I: StretchVertical },
        ];

    const parseRepeat = (v: unknown): number | null => {
        if (typeof v !== 'string') return null;
        const m = v.trim().match(/^repeat\((\d+),\s*1fr\)$/);
        return m ? Number(m[1]) : null;
    };
    const cols = parseRepeat(el.gridTemplateColumns);
    const rows = parseRepeat(el.gridTemplateRows);

    const setCols = (n: number | 'auto') => n === 'auto'
        ? patch({ gridTemplateColumns: undefined })
        : patch({ gridTemplateColumns: `repeat(${n}, 1fr)` });

    const setRows = (n: number | 'auto') => n === 'auto'
        ? patch({ gridTemplateRows: undefined })
        : patch({ gridTemplateRows: `repeat(${n}, 1fr)` });

    return (
        <div className="border-t border-neutral-200 pt-3 mt-3">
            <button type="button" className="w-full text-left text-[12px] uppercase tracking-wide text-neutral-500 mb-2 flex items-center gap-2" onClick={onToggle}>
                <span className="inline-block w-3">{open ? '▾' : '▸'}</span><span>Layout</span>
            </button>

            {open && (
                <div className="space-y-2">
                    {/* display (active) */}
                    <div>
                        <Label>display {!allowLayout.has('display') && <DisabledHint reason={dis('display')!} />}</Label>
                        {allowLayout.has('display') ? (
                            <div className="flex items-center gap-1 flex-wrap">
                                {(['block','inline','flex','grid'] as const).map((v) => (
                                    <ChipBtn key={v} title={v} onClick={() => patch({ display: v })} active={display === v}>{v}</ChipBtn>
                                ))}
                            </div>
                        ) : <div className="text-[12px] text-neutral-400">제한됨</div>}
                    </div>

                    {/* overflow */}
                    <div>
                        <Label>overflow {!allowLayout.has('overflow') && <DisabledHint reason={dis('overflow')!} />}</Label>
                        {allowLayout.has('overflow') ? (
                            <MiniSelect value={el.overflow as string | undefined} options={['visible','hidden','scroll','auto']} onChange={(v) => patch({ overflow: v })} />
                        ) : <div className="text-[12px] text-neutral-400">제한됨</div>}
                    </div>

                    {/* width/height */}
                    {!isInline ? (
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label>width {!allowLayout.has('width') && <DisabledHint reason={dis('width')!} />}</Label>
                                {allowLayout.has('width') ? <MiniInput value={el.width as string | number | undefined} onChange={(v) => patch({ width: v })} /> : <div className="text-[12px] text-neutral-400">제한됨</div>}
                            </div>
                            <div>
                                <Label>height {!allowLayout.has('height') && <DisabledHint reason={dis('height')!} />}</Label>
                                {allowLayout.has('height') ? <MiniInput value={el.height as string | number | undefined} onChange={(v) => patch({ height: v })} /> : <div className="text-[12px] text-neutral-400">제한됨</div>}
                            </div>
                        </div>
                    ) : <div className="text-[12px] text-neutral-400">display:inline에서는 width/height 설정 불가</div>}

                    {/* Flex */}
                    {container && (el.display as string) === 'flex' && (
                        <div className="mt-2 space-y-2">
                            <div>
                                <Label>direction {!allowFlex.has('flexDirection') && <DisabledHint reason={dis('flexDirection')!} />}</Label>
                                <div className="grid grid-cols-4 gap-1">
                                    {[
                                        { v: 'row', I: GalleryHorizontal, title: 'row' },
                                        { v: 'row-reverse', I: ArrowLeftRight, title: 'row-reverse' },
                                        { v: 'column', I: GalleryVertical, title: 'column' },
                                        { v: 'column-reverse', I: ArrowUpDown, title: 'column-reverse' },
                                    ].map(({ v, I, title }) => (
                                        <IconBtn key={v} title={title} onClick={() => patch({ flexDirection: v })} disabled={!allowFlex.has('flexDirection')} active={dir === v}>
                                            <I size={16} />
                                        </IconBtn>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <Label>justify {!allowFlex.has('justifyContent') && <DisabledHint reason={dis('justifyContent')!} />}</Label>
                                <div className="grid grid-cols-6 gap-1">
                                    {justifyIcons.map(({ v, I, title }) => (
                                        <IconBtn key={v} title={title} onClick={() => patch({ justifyContent: v })} disabled={!allowFlex.has('justifyContent')} active={el.justifyContent === v}>
                                            <I size={16} />
                                        </IconBtn>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <Label>align {!allowFlex.has('alignItems') && <DisabledHint reason={dis('alignItems')!} />}</Label>
                                <div className="grid grid-cols-4 gap-1">
                                    {alignIcons.map(({ v, I, title }) => (
                                        <IconBtn key={v} title={title} onClick={() => patch({ alignItems: v })} disabled={!allowFlex.has('alignItems')} active={el.alignItems === v}>
                                            <I size={16} />
                                        </IconBtn>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <Label>gap {!allowFlex.has('gap') && <DisabledHint reason={dis('gap')!} />}</Label>
                                {allowFlex.has('gap') ? <MiniInput value={el.gap as string | number | undefined} onChange={(v) => patch({ gap: v })} /> : <div className="text-[12px] text-neutral-400">제한됨</div>}
                            </div>
                        </div>
                    )}

                    {/* Grid */}
                    {container && (el.display as string) === 'grid' && (
                        <div className="mt-2 space-y-2">
                            <div>
                                <Label>columns {!allowGrid.has('gridTemplateColumns') && <DisabledHint reason={dis('gridTemplateColumns')!} />}</Label>
                                {allowGrid.has('gridTemplateColumns') ? (
                                    <div className="flex items-center gap-1 flex-wrap">
                                        <ChipBtn title="Auto" onClick={() => setCols('auto')} active={cols === null}>Auto</ChipBtn>
                                        {[1,2,3,4,5,6].map((n) => (
                                            <ChipBtn key={n} title={`${n}`} onClick={() => setCols(n)} active={cols === n}>{n}</ChipBtn>
                                        ))}
                                    </div>
                                ) : <div className="text-[12px] text-neutral-400">제한됨</div>}
                            </div>

                            <div>
                                <Label>rows {!allowGrid.has('gridTemplateRows') && <DisabledHint reason={dis('gridTemplateRows')!} />}</Label>
                                {allowGrid.has('gridTemplateRows') ? (
                                    <div className="flex items-center gap-1 flex-wrap">
                                        <ChipBtn title="Auto" onClick={() => setRows('auto')} active={rows === null}>Auto</ChipBtn>
                                        {[1,2,3,4].map((n) => (
                                            <ChipBtn key={n} title={`${n}`} onClick={() => setRows(n)} active={rows === n}>{n}</ChipBtn>
                                        ))}
                                    </div>
                                ) : <div className="text-[12px] text-neutral-400">제한됨</div>}
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <Label>gap {!allowGrid.has('gap') && <DisabledHint reason={dis('gap')!} />}</Label>
                                    {allowGrid.has('gap') ? <MiniInput value={el.gap as string | number | undefined} onChange={(v) => patch({ gap: v })} /> : <div className="text-[12px] text-neutral-400">제한됨</div>}
                                </div>
                                <div>
                                    <Label>rowGap {!allowGrid.has('rowGap') && <DisabledHint reason={dis('rowGap')!} />}</Label>
                                    {allowGrid.has('rowGap') ? <MiniInput value={el.rowGap as string | number | undefined} onChange={(v) => patch({ rowGap: v })} /> : <div className="text-[12px] text-neutral-400">제한됨</div>}
                                </div>
                                <div>
                                    <Label>columnGap {!allowGrid.has('columnGap') && <DisabledHint reason={dis('columnGap')!} />}</Label>
                                    {allowGrid.has('columnGap') ? <MiniInput value={el.columnGap as string | number | undefined} onChange={(v) => patch({ columnGap: v })} /> : <div className="text-[12px] text-neutral-400">제한됨</div>}
                                </div>
                            </div>

                            <div>
                                <Label>auto-flow {!allowGrid.has('gridAutoFlow') && <DisabledHint reason={dis('gridAutoFlow')!} />}</Label>
                                {allowGrid.has('gridAutoFlow') ? (
                                    <MiniSelect value={el.gridAutoFlow as string | undefined}
                                                options={['row','column','dense','row dense','column dense']}
                                                onChange={(v) => patch({ gridAutoFlow: v })} />
                                ) : <div className="text-[12px] text-neutral-400">제한됨</div>}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}