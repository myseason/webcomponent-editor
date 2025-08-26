'use client';

/**
 * LayoutGroup
 * - display, overflow, width/height
 * - Flex 컨테이너: direction / justify / align / gap
 * - Grid 컨테이너: columns/rows preset + gap/rowGap/columnGap + auto-flow
 * - 허용 키 필터(useAllowed), 제한 배지(DisabledHint)
 * - lucide-react 아이콘(원본과 동일한 매핑) 유지
 */

import React from 'react';
import type {
    CSSDict,
    InspectorFilter,
    TagPolicy,
    TagPolicyMap,
} from '../../../../core/types';
import {
    useAllowed,
    Label,
    MiniSelect,
    MiniInput,
    ChipBtn,
    DisabledHint,
    type DisallowReason,
    IconBtn,
} from './common';
import { isContainerTag } from '../../../../runtime/capabilities';
import {
    AlignStartHorizontal,
    AlignCenterHorizontal,
    AlignEndHorizontal,
    AlignHorizontalSpaceBetween,
    AlignHorizontalSpaceAround,
    AlignHorizontalDistributeCenter,
    AlignStartVertical,
    AlignCenterVertical,
    AlignEndVertical,
    AlignVerticalSpaceBetween,
    AlignVerticalSpaceAround,
    AlignVerticalDistributeCenter,
    StretchHorizontal,
    StretchVertical,
    GalleryHorizontal,
    GalleryVertical,
    ArrowLeftRight,
    ArrowUpDown,
} from 'lucide-react';
import { coerceLen } from '../../../../runtime/styleUtils';

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

    // 허용 키(원본 키셋 유지)
    const allowLayout = useAllowed(
        ['display', 'overflow', 'width', 'height'],
        tf,
        tag,
        map,
        expert
    );
    const allowFlex = useAllowed(
        ['flexDirection', 'justifyContent', 'alignItems', 'gap'],
        tf,
        tag,
        map,
        expert
    );
    const allowGrid = useAllowed(
        [
            'gridTemplateColumns',
            'gridTemplateRows',
            'gridAutoFlow',
            'gap',
            'rowGap',
            'columnGap',
            'justifyItems',
            'alignItems',
            'justifyContent',
            'alignContent',
        ],
        tf,
        tag,
        map,
        expert
    );

    // 제한 사유(원본과 동일한 규칙)
    const dis = (k: string): DisallowReason => {
        if (tagPolicy?.styles?.allow && !tagPolicy.styles.allow.includes(k)) return 'tag';
        if (tagPolicy?.styles?.deny && tagPolicy.styles.deny.includes(k)) return 'tag';
        if (!expert && tf?.styles) {
            if (tf.styles.allow && !tf.styles.allow.includes(k)) return 'template';
            if (tf.styles.deny && tf.styles.deny.includes(k)) return 'template';
        }
        return null;
    };

    const display = ((el as any).display as string) ?? 'block';
    const isInline = display === 'inline';
    const container = isContainerTag(tag, tagPolicy);

    const dir = ((el as any).flexDirection as string) ?? 'row';
    const isCol = dir === 'column' || dir === 'column-reverse';

    // 주축/교차축 아이콘 매핑(원본과 동일)
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

    // grid preset 유틸(원본 유지)
    const parseRepeat = (v: unknown): number | null => {
        if (typeof v !== 'string') return null;
        const m = v.trim().match(/^repeat\((\d+),\s*1fr\)$/);
        return m ? Number(m[1]) : null;
    };
    const cols = parseRepeat((el as any).gridTemplateColumns);
    const rows = parseRepeat((el as any).gridTemplateRows);
    const setCols = (n: number | 'auto') =>
        n === 'auto'
            ? patch({ gridTemplateColumns: undefined })
            : patch({ gridTemplateColumns: `repeat(${n}, 1fr)` });
    const setRows = (n: number | 'auto') =>
        n === 'auto'
            ? patch({ gridTemplateRows: undefined })
            : patch({ gridTemplateRows: `repeat(${n}, 1fr)` });

    return (
        <section className="mt-3">
            <div
                className="flex items-center justify-between text-xs font-semibold text-neutral-700 cursor-pointer select-none"
                onClick={onToggle}
            >
                <span>{open ? '▾' : '▸'} Layout</span>
            </div>

            {open && (
                <div className="mt-1 space-y-2">
                    {/* display */}
                    <div className="flex items-center gap-2">
                        <Label>display</Label>
                        {!allowLayout.has('display') && <DisabledHint reason={dis('display')!} />}
                        {allowLayout.has('display') ? (
                            <div className="flex gap-1">
                                {(['block', 'inline', 'flex', 'grid'] as const).map((v) => (
                                    <ChipBtn
                                        key={v}
                                        title={v}
                                        onClick={() => patch({ display: v })}
                                        active={display === v}
                                    >
                                        {v}
                                    </ChipBtn>
                                ))}
                            </div>
                        ) : (
                            <span className="text-[11px] text-neutral-400">제한됨</span>
                        )}
                    </div>

                    {/* overflow */}
                    <div className="flex items-center gap-2">
                        <Label>overflow</Label>
                        {!allowLayout.has('overflow') && <DisabledHint reason={dis('overflow')!} />}
                        {allowLayout.has('overflow') ? (
                            <MiniSelect
                                value={(el as any).overflow as string | undefined}
                                options={['visible', 'hidden', 'scroll', 'auto', 'clip']}
                                onChange={(v) => patch({ overflow: v })}
                            />
                        ) : (
                            <span className="text-[11px] text-neutral-400">제한됨</span>
                        )}
                    </div>

                    {/* width/height (display:inline이면 브라우저가 무시 → 안내) */}
                    {!isInline ? (
                        <>
                            <div className="flex items-center gap-2">
                                <Label>width / height</Label>
                                {!allowLayout.has('width') && <DisabledHint reason={dis('width')!} />}
                                {allowLayout.has('width') ? (
                                    <MiniInput
                                        value={(el as any)['width'] as string | number | undefined}
                                        onChange={(v) => patch({ width: coerceLen(v) })}
                                        placeholder="auto | 640 | 50%"
                                    />
                                ) : (
                                    <span className="text-[11px] text-neutral-400">제한됨</span>
                                )}
                                {!allowLayout.has('height') && <DisabledHint reason={dis('height')!} />}
                                {allowLayout.has('height') ? (
                                    <MiniInput
                                        value={(el as any)['height'] as string | number | undefined}
                                        onChange={(v) => patch({ height: coerceLen(v) })}
                                        placeholder="auto | 480 | 50%"
                                    />
                                ) : (
                                    <span className="text-[11px] text-neutral-400">제한됨</span>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="text-[11px] text-neutral-500">
                            display:inline에서는 width/height 설정이 적용되지 않을 수 있습니다.
                        </div>
                    )}

                    {/* Flex 컨테이너 */}
                    {container && (el as any).display === 'flex' && (
                        <>
                            <div className="text-[10px] text-neutral-500 pt-1">Flex Container</div>

                            {/* direction */}
                            <div className="flex items-center gap-2">
                                <Label>direction</Label>
                                {!allowFlex.has('flexDirection') && (
                                    <DisabledHint reason={dis('flexDirection')!} />
                                )}
                                <div className="flex gap-1">
                                    {[
                                        { v: 'row', I: GalleryHorizontal, title: 'row' },
                                        { v: 'row-reverse', I: ArrowLeftRight, title: 'row-reverse' },
                                        { v: 'column', I: GalleryVertical, title: 'column' },
                                        { v: 'column-reverse', I: ArrowUpDown, title: 'column-reverse' },
                                    ].map(({ v, I, title }) => (
                                        <IconBtn
                                            key={v}
                                            title={title}
                                            onClick={() => patch({ flexDirection: v })}
                                            disabled={!allowFlex.has('flexDirection')}
                                            active={dir === v}
                                        >
                                            <I size={16} />
                                        </IconBtn>
                                    ))}
                                </div>
                            </div>

                            {/* justify */}
                            <div className="flex items-center gap-2">
                                <Label>justify</Label>
                                {!allowFlex.has('justifyContent') && (
                                    <DisabledHint reason={dis('justifyContent')!} />
                                )}
                                <div className="flex gap-1">
                                    {justifyIcons.map(({ v, I, title }) => (
                                        <IconBtn
                                            key={v}
                                            title={title}
                                            onClick={() => patch({ justifyContent: v })}
                                            disabled={!allowFlex.has('justifyContent')}
                                            active={(el as any).justifyContent === v}
                                        >
                                            <I size={16} />
                                        </IconBtn>
                                    ))}
                                </div>
                            </div>

                            {/* align */}
                            <div className="flex items-center gap-2">
                                <Label>align</Label>
                                {!allowFlex.has('alignItems') && (
                                    <DisabledHint reason={dis('alignItems')!} />
                                )}
                                <div className="flex gap-1">
                                    {alignIcons.map(({ v, I, title }) => (
                                        <IconBtn
                                            key={v}
                                            title={title}
                                            onClick={() => patch({ alignItems: v })}
                                            disabled={!allowFlex.has('alignItems')}
                                            active={(el as any).alignItems === v}
                                        >
                                            <I size={16} />
                                        </IconBtn>
                                    ))}
                                </div>
                            </div>

                            {/* gap */}
                            <div className="flex items-center gap-2">
                                <Label>gap</Label>
                                {!allowFlex.has('gap') && <DisabledHint reason={dis('gap')!} />}
                                {allowFlex.has('gap') ? (
                                    <MiniInput
                                        value={(el as any)['gap'] as string | number | undefined}
                                        onChange={(v) => patch({ gap: coerceLen(v) })}
                                        placeholder="0 | 8 | 0.5rem"
                                    />
                                ) : (
                                    <span className="text-[11px] text-neutral-400">제한됨</span>
                                )}
                            </div>
                        </>
                    )}

                    {/* Grid 컨테이너 */}
                    {container && (el as any).display === 'grid' && (
                        <>
                            <div className="text-[10px] text-neutral-500 pt-1">Grid Container</div>

                            {/* columns */}
                            <div className="flex items-center gap-2">
                                <Label>columns</Label>
                                {!allowGrid.has('gridTemplateColumns') && (
                                    <DisabledHint reason={dis('gridTemplateColumns')!} />
                                )}
                                {allowGrid.has('gridTemplateColumns') ? (
                                    <div className="flex gap-1">
                                        <ChipBtn
                                            title="Auto"
                                            onClick={() => setCols('auto')}
                                            active={cols === null}
                                        >
                                            Auto
                                        </ChipBtn>
                                        {[1, 2, 3, 4, 5, 6].map((n) => (
                                            <ChipBtn
                                                key={n}
                                                title={`${n}`}
                                                onClick={() => setCols(n)}
                                                active={cols === n}
                                            >
                                                {n}
                                            </ChipBtn>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-[11px] text-neutral-400">제한됨</span>
                                )}
                            </div>

                            {/* rows */}
                            <div className="flex items-center gap-2">
                                <Label>rows</Label>
                                {!allowGrid.has('gridTemplateRows') && (
                                    <DisabledHint reason={dis('gridTemplateRows')!} />
                                )}
                                {allowGrid.has('gridTemplateRows') ? (
                                    <div className="flex gap-1">
                                        <ChipBtn
                                            title="Auto"
                                            onClick={() => setRows('auto')}
                                            active={rows === null}
                                        >
                                            Auto
                                        </ChipBtn>
                                        {[1, 2, 3, 4].map((n) => (
                                            <ChipBtn
                                                key={n}
                                                title={`${n}`}
                                                onClick={() => setRows(n)}
                                                active={rows === n}
                                            >
                                                {n}
                                            </ChipBtn>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-[11px] text-neutral-400">제한됨</span>
                                )}
                            </div>

                            {/* gaps */}
                            <div className="flex items-center gap-2">
                                <Label>gap</Label>
                                {!allowGrid.has('gap') && <DisabledHint reason={dis('gap')!} />}
                                {allowGrid.has('gap') ? (
                                    <MiniInput
                                        value={(el as any)['gap'] as string | number | undefined}
                                        onChange={(v) => patch({ gap: coerceLen(v) })}
                                        placeholder="0 | 8 | 0.5rem"
                                    />
                                ) : (
                                    <span className="text-[11px] text-neutral-400">제한됨</span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <Label>rowGap</Label>
                                {!allowGrid.has('rowGap') && <DisabledHint reason={dis('rowGap')!} />}
                                {allowGrid.has('rowGap') ? (
                                    <MiniInput
                                        value={(el as any)['rowGap'] as string | number | undefined}
                                        onChange={(v) => patch({ rowGap: coerceLen(v) })}
                                        placeholder="0 | 8 | 0.5rem"
                                    />
                                ) : (
                                    <span className="text-[11px] text-neutral-400">제한됨</span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <Label>columnGap</Label>
                                {!allowGrid.has('columnGap') && <DisabledHint reason={dis('columnGap')!} />}
                                {allowGrid.has('columnGap') ? (
                                    <MiniInput
                                        value={(el as any)['columnGap'] as string | number | undefined}
                                        onChange={(v) => patch({ columnGap: coerceLen(v) })}
                                        placeholder="0 | 8 | 0.5rem"
                                    />
                                ) : (
                                    <span className="text-[11px] text-neutral-400">제한됨</span>
                                )}
                            </div>

                            {/* auto-flow */}
                            <div className="flex items-center gap-2">
                                <Label>auto-flow</Label>
                                {!allowGrid.has('gridAutoFlow') && (
                                    <DisabledHint reason={dis('gridAutoFlow')!} />
                                )}
                                {allowGrid.has('gridAutoFlow') ? (
                                    <MiniSelect
                                        value={(el as any).gridAutoFlow as string | undefined}
                                        options={['row', 'column', 'dense', 'row dense', 'column dense']}
                                        onChange={(v) => patch({ gridAutoFlow: v })}
                                    />
                                ) : (
                                    <span className="text-[11px] text-neutral-400">제한됨</span>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </section>
    );
}