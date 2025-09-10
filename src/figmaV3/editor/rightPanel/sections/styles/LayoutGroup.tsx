'use client';

import React, { useMemo, useState } from 'react';
import type {
    CSSDict,
    InspectorFilter,
    TagPolicy,
    TagPolicyMap,
    NodeId,
    ComponentDefinition,
} from '../../../../core/types';

import {
    useAllowed,
    DisabledHint,
    type DisallowReason,
    PermissionLock,
    reasonForKey,
} from './common';
import { getDefinition } from '../../../../core/registry';

import {
    AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
    AlignHorizontalSpaceBetween, AlignHorizontalSpaceAround, AlignHorizontalDistributeCenter,
    AlignStartVertical, AlignCenterVertical, AlignEndVertical,
    AlignVerticalSpaceBetween, AlignVerticalSpaceAround, AlignVerticalDistributeCenter,
    StretchHorizontal, StretchVertical,
    GalleryHorizontal, GalleryVertical,
    ArrowLeftRight, ArrowUpDown,
} from 'lucide-react';

import { coerceLen } from '../../../../runtime/styleUtils';
// 레이아웃 프리미티브
import {
    SectionShellV1,
    RowV1,
    RowLeftV1,
    RowRightGridV1,
    MiniInputV1,
    MiniSelectV1,
    ChipBtnV1,
    IconBtnV1,
} from './layoutV1';

import {RightDomain, useRightControllerFactory} from '@/figmaV3/controllers/right/RightControllerFactory';

type IconCmp = React.ComponentType<{ size?: number; className?: string }>;

function isContainer(def: ComponentDefinition | undefined): boolean {
    return def?.capabilities?.canHaveChildren === true;
}

export function LayoutGroup(props: {
    el: Record<string, any>;
    tag: string;
    tagPolicy: TagPolicy | undefined;
    tf: InspectorFilter | undefined;
    map: TagPolicyMap | undefined;
    expert: boolean;
    patch: (css: CSSDict) => void;
    open: boolean;
    onToggle: () => void;
    nodeId: NodeId;
    componentId: string;
}) {
    // ✅ 컨트롤러 도입 (reader만 사용)
    const { reader } = useRightControllerFactory(RightDomain.Inspector);
    const R = reader;

    const { el, patch, expert, open, onToggle, nodeId, componentId } = props;
    const ui = R.getUI();
    const project = R.getProject();
    const def = getDefinition(componentId);
    const allow = useAllowed(nodeId);
    const dis = (k: string): DisallowReason => reasonForKey(project, ui, nodeId, k, expert);

    const display = (el as any).display ?? 'block';
    const isInline = display === 'inline';
    const container = isContainer(def);

    const dir = (el as any).flexDirection ?? 'row';
    const isCol = dir === 'column' || dir === 'column-reverse';

    const renderLock = (controlKey: string) => {
        if (ui.mode === 'Component') {
            return <PermissionLock controlKey={`styles:${controlKey}`} componentId={componentId} />;
        }
        return null;
    };

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

    // 수동 입력 핸들러 (빈 값 → auto, 숫자 → repeat(n,1fr))
    const handleManualCols = (v: string) => {
        const t = v.trim();
        if (t === '' || t.toLowerCase() === 'a' || t.toLowerCase() === 'auto') {
            setCols('auto');
            return;
        }
        const n = Number(t);
        if (Number.isFinite(n) && n >= 1) setCols(n);
    };
    const handleManualRows = (v: string) => {
        const t = v.trim();
        if (t === '' || t.toLowerCase() === 'a' || t.toLowerCase() === 'auto') {
            setRows('auto');
            return;
        }
        const n = Number(t);
        if (Number.isFinite(n) && n >= 1) setRows(n);
    };

    // 표시용 값
    const manualColsVal = cols === null ? '' : String(cols);
    const manualRowsVal = rows === null ? '' : String(rows);

    return (
        // 최상위: 요청대로 mt-4
        <div className="mt-4">
            <SectionShellV1
                title="Layout"
                open={open}
                onToggle={onToggle}
            >
                {/* display */}
                <RowV1>
                    <RowLeftV1 title="display" />
                    <RowRightGridV1>
                        <div className="col-span-6 min-w-0 flex items-center gap-[2px] flex-nowrap">
                            {renderLock('display')}
                            {!allow.has('display') && <DisabledHint reason={dis('display') ?? 'template'} />}
                            {allow.has('display') ? (
                                (['block', 'inline', 'flex', 'grid'] as const).map((v) => (
                                    <ChipBtnV1
                                        key={v}
                                        title={v}
                                        onClick={() => patch({ display: v })}
                                        active={display === v}
                                    >
                                        {v}
                                    </ChipBtnV1>
                                ))
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>
                    </RowRightGridV1>
                </RowV1>

                {/* flex 상세 옵션 (display 바로 하단) */}
                {container && display === 'flex' && (
                    <>
                        <RowV1>
                            <RowLeftV1 title="direction" />
                            <RowRightGridV1>
                                <div className="col-span-6 min-w-0 flex items-center gap-[2px] flex-nowrap">
                                    {renderLock('flexDirection')}
                                    {!allow.has('flexDirection') && <DisabledHint reason={dis('flexDirection') ?? 'template'} />}
                                    {[
                                        { v: 'row', I: GalleryHorizontal, title: 'row' },
                                        { v: 'row-reverse', I: ArrowLeftRight, title: 'row-reverse' },
                                        { v: 'column', I: GalleryVertical, title: 'column' },
                                        { v: 'column-reverse', I: ArrowUpDown, title: 'column-reverse' },
                                    ].map(({ v, I, title }) => (
                                        <IconBtnV1
                                            key={v}
                                            title={title}
                                            onClick={() => patch({ flexDirection: v })}
                                            active={dir === v}
                                            square24
                                        >
                                            <I size={16} />
                                        </IconBtnV1>
                                    ))}
                                </div>
                            </RowRightGridV1>
                        </RowV1>

                        <RowV1>
                            <RowLeftV1 title="justify" />
                            <RowRightGridV1>
                                <div className="col-span-6 min-w-0 flex items-center gap-[2px] flex-nowrap">
                                    {renderLock('justifyContent')}
                                    {!allow.has('justifyContent') && <DisabledHint reason={dis('justifyContent') ?? 'template'} />}
                                    {justifyIcons.map(({ v, I, title }) => (
                                        <IconBtnV1
                                            key={v}
                                            title={title}
                                            onClick={() => patch({ justifyContent: v })}
                                            active={(el as any).justifyContent === v}
                                            disabled={!allow.has('justifyContent')}
                                            square24
                                        >
                                            <I size={16} />
                                        </IconBtnV1>
                                    ))}
                                </div>
                            </RowRightGridV1>
                        </RowV1>

                        <RowV1>
                            <RowLeftV1 title="align" />
                            <RowRightGridV1>
                                <div className="col-span-6 min-w-0 flex items-center gap-[2px] flex-nowrap">
                                    {renderLock('alignItems')}
                                    {!allow.has('alignItems') && <DisabledHint reason={dis('alignItems') ?? 'template'} />}
                                    {alignIcons.map(({ v, I, title }) => (
                                        <IconBtnV1
                                            key={v}
                                            title={title}
                                            onClick={() => patch({ alignItems: v })}
                                            active={(el as any).alignItems === v}
                                            disabled={!allow.has('alignItems')}
                                            square24
                                        >
                                            <I size={16} />
                                        </IconBtnV1>
                                    ))}
                                </div>
                            </RowRightGridV1>
                        </RowV1>

                        <RowV1>
                            <RowLeftV1 title="gap" />
                            <RowRightGridV1>
                                <div className="col-span-3 min-w-0">
                                    {renderLock('gap')}
                                    {!allow.has('gap') && <DisabledHint reason={dis('gap') ?? 'template'} />}
                                    {allow.has('gap') ? (
                                        <MiniInputV1
                                            value={(el as any).gap ?? ''}
                                            onChange={(v) => patch({ gap: coerceLen(v) })}
                                            placeholder="8px"
                                            size="auto"
                                            // fullWidth 기본 true라 셀(3칸)을 꽉 채움
                                        />
                                    ) : (
                                        <span className="text-[11px] text-gray-500">제한됨</span>
                                    )}
                                </div>
                                <div className="col-span-3" />
                            </RowRightGridV1>
                        </RowV1>
                    </>
                )}

                {/* grid 상세 옵션 (display 바로 하단) */}
                {container && display === 'grid' && (
                    <>
                        {/* columns: A,1,2,3,4 + 맨 우측 수동입력(셀 폭 전부 사용) */}
                        <RowV1>
                            <RowLeftV1 title="columns" />
                            <RowRightGridV1>
                                <div className="col-span-6 min-w-0 flex items-center gap-[2px]">
                                    {renderLock('gridTemplateColumns')}
                                    {!allow.has('gridTemplateColumns') && (
                                        <DisabledHint reason={dis('gridTemplateColumns') ?? 'template'} />
                                    )}

                                    <div className="flex items-center gap-[2px] flex-none">
                                        <IconBtnV1
                                            title="Auto"
                                            onClick={() => setCols('auto')}
                                            active={cols === null}
                                            disabled={!allow.has('gridTemplateColumns')}
                                            square24
                                        >
                                            <span className="text-[11px] leading-none">A</span>
                                        </IconBtnV1>
                                        {[1, 2, 3, 4].map((n) => (
                                            <IconBtnV1
                                                key={n}
                                                title={`${n}`}
                                                onClick={() => setCols(n)}
                                                active={cols === n}
                                                disabled={!allow.has('gridTemplateColumns')}
                                                square24
                                            >
                                                <span className="text-[11px] leading-none">{n}</span>
                                            </IconBtnV1>
                                        ))}
                                    </div>

                                    {/* 수동 입력: 남는 셀 폭 모두 사용 */}
                                    <div className="flex-1 min-w-0 ml-[4px]">
                                        <MiniInputV1
                                            value={manualColsVal}
                                            onChange={handleManualCols}
                                            placeholder="n"
                                            numeric
                                            size="auto"
                                            title="columns count"
                                            // fullWidth 기본 true → w-full
                                        />
                                    </div>
                                </div>
                            </RowRightGridV1>
                        </RowV1>

                        {/* rows: A,1,2,3,4 + 맨 우측 수동입력(셀 폭 전부 사용) */}
                        <RowV1>
                            <RowLeftV1 title="rows" />
                            <RowRightGridV1>
                                <div className="col-span-6 min-w-0 flex items-center gap-[2px]">
                                    {renderLock('gridTemplateRows')}
                                    {!allow.has('gridTemplateRows') && (
                                        <DisabledHint reason={dis('gridTemplateRows') ?? 'template'} />
                                    )}

                                    <div className="flex items-center gap-[2px] flex-none">
                                        <IconBtnV1
                                            title="Auto"
                                            onClick={() => setRows('auto')}
                                            active={rows === null}
                                            disabled={!allow.has('gridTemplateRows')}
                                            square24
                                        >
                                            <span className="text-[11px] leading-none">A</span>
                                        </IconBtnV1>
                                        {[1, 2, 3, 4].map((n) => (
                                            <IconBtnV1
                                                key={n}
                                                title={`${n}`}
                                                onClick={() => setRows(n)}
                                                active={rows === n}
                                                disabled={!allow.has('gridTemplateRows')}
                                                square24
                                            >
                                                <span className="text-[11px] leading-none">{n}</span>
                                            </IconBtnV1>
                                        ))}
                                    </div>

                                    {/* 수동 입력: 남는 셀 폭 모두 사용 */}
                                    <div className="flex-1 min-w-0 ml-[4px]">
                                        <MiniInputV1
                                            value={manualRowsVal}
                                            onChange={handleManualRows}
                                            placeholder="n"
                                            numeric
                                            size="auto"
                                            title="rows count"
                                        />
                                    </div>
                                </div>
                            </RowRightGridV1>
                        </RowV1>

                        {/* gap */}
                        <RowV1>
                            <RowLeftV1 title="gap" />
                            <RowRightGridV1>
                                <div className="col-span-3 min-w-0">
                                    {renderLock('gap')}
                                    {!allow.has('gap') && <DisabledHint reason={dis('gap') ?? 'template'} />}
                                    {allow.has('gap') ? (
                                        <MiniInputV1
                                            value={(el as any).gap ?? ''}
                                            onChange={(v) => patch({ gap: coerceLen(v) })}
                                            placeholder="8px"
                                            size="auto"
                                        />
                                    ) : (
                                        <span className="text-[11px] text-gray-500">제한됨</span>
                                    )}
                                </div>
                                <div className="col-span-3" />
                            </RowRightGridV1>
                        </RowV1>
                    </>
                )}

                {/* W/H (W 1 | input 2 | H 1 | input 2) */}
                <RowV1>
                    <RowLeftV1 title="W/H" />
                    <RowRightGridV1>
                        {isInline ? (
                            <div className="col-span-6 text-[11px] text-gray-500">
                                display:inline 상태에서는 width/height가 적용되지 않습니다.
                            </div>
                        ) : (
                            <>
                                <div className="col-span-1 flex items-center text-[11px] text-gray-600 pl-[2px]">W</div>
                                <div className="col-span-2 min-w-0">
                                    {renderLock('width')}
                                    {!allow.has('width') && <DisabledHint reason={dis('width') ?? 'template'} />}
                                    {allow.has('width') ? (
                                        <MiniInputV1
                                            value={(el as any).width ?? ''}
                                            onChange={(v) => patch({ width: coerceLen(v) })}
                                            placeholder="auto"
                                            size="auto"
                                        />
                                    ) : (
                                        <span className="text-[11px] text-gray-500">제한됨</span>
                                    )}
                                </div>
                                <div className="col-span-1 flex items-center text-[11px] text-gray-600 pl-[2px]">H</div>
                                <div className="col-span-2 min-w-0">
                                    {renderLock('height')}
                                    {!allow.has('height') && <DisabledHint reason={dis('height') ?? 'template'} />}
                                    {allow.has('height') ? (
                                        <MiniInputV1
                                            value={(el as any).height ?? ''}
                                            onChange={(v) => patch({ height: coerceLen(v) })}
                                            placeholder="auto"
                                            size="auto"
                                        />
                                    ) : (
                                        <span className="text-[11px] text-gray-500">제한됨</span>
                                    )}
                                </div>
                            </>
                        )}
                    </RowRightGridV1>
                </RowV1>

                {/* overflow */}
                <RowV1>
                    <RowLeftV1 title="overflow" />
                    <RowRightGridV1>
                        <div className="col-span-6 min-w-0">
                            {renderLock('overflow')}
                            {!allow.has('overflow') && <DisabledHint reason={dis('overflow') ?? 'template'} />}
                            {allow.has('overflow') ? (
                                <MiniSelectV1
                                    value={(el as any).overflow ?? ''}
                                    options={['', 'visible', 'hidden', 'auto', 'scroll']}
                                    onChange={(v) => patch({ overflow: v || undefined })}
                                    title="overflow"
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>
                    </RowRightGridV1>
                </RowV1>
            </SectionShellV1>
        </div>
    );
}