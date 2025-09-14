'use client';

import React from 'react';
import type {
    CSSDict,
    InspectorFilter,
    TagPolicy,
    TagPolicyMap,
    NodeId,
    ComponentDefinition,
} from '../../../../core/types';

import { useAllowed, PermissionLock, DisallowReason, reasonForKey, renderStyleLock } from './common';
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

// ✅ 아키텍처 준수: 컨트롤러 경유
import { RightDomain, useRightControllerFactory } from '@/figmaV3/controllers/right/RightControllerFactory';

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
    // ✅ 컨트롤러 (reader)
    const { reader } = useRightControllerFactory(RightDomain.Inspector);
    const { el, patch, expert, open, onToggle, nodeId, componentId } = props;

    const ui = reader.getUI();
    const project = reader.getProject();
    const def = getDefinition(componentId);
    const allow = useAllowed(nodeId);
    const dis = (k: string): DisallowReason => reasonForKey(project, ui, nodeId, k, expert);

    const showLock = ui.mode === 'Component';
    const lockDisabled = ui.expertMode || !!ui?.inspector?.forceTagPolicy;

    const display = (el as any).display ?? 'block';
    const isInline = display === 'inline';

    const dir = (el as any).flexDirection ?? 'row';
    const isCol = dir === 'column' || dir === 'column-reverse';

    // ① 컨텍스트 판별: 부모가 flex인지, 현재 노드가 컨테이너인지
    const parentIsFlex = reader.isFlexParent?.(nodeId) ?? false;
    const isContainerNode = reader.isContainerNode?.(nodeId) ?? isContainer(def);

    // ② 표시 규칙: 노드가 컨테이너가 아닌 경우 flex/grid 옵션 자체를 노출하지 않음
    const rawDisplayOptions = isContainerNode
        ? (['block', 'inline', 'flex', 'grid'] as const)
        : (['block', 'inline'] as const);

    // ─────────────────────────────────────────────────────────
    // 메인 속성(1차) 가시성: TagPolicy 허용 + Policy(Controller) 가시성
    // ─────────────────────────────────────────────────────────
    //const policyVisible = (mainKey: 'display' | 'size' | 'overflow') =>
    //    reader.isControlVisible(nodeId, `layout.${mainKey}`);
    const policyVisible = (mainKey: 'display' | 'size' | 'overflow') => true;

    const canDisplay = allow.has('display') && policyVisible('display');
    const canSize = (allow.has('size') || allow.has('width') || allow.has('height')) && policyVisible('size');
    const canOverflow = allow.has('overflow') && policyVisible('overflow');

    // display 후보에 정책 반영
    const displayOptions = canDisplay ? rawDisplayOptions : ([] as string[]);

    // 1차 속성 전용 Lock
    const renderMainLock = (mainKey: 'display' | 'size' | 'overflow') =>
        renderStyleLock(ui, componentId, `layout.${mainKey}`);

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
        <div className="mt-4">
            <SectionShellV1 title="Layout" open={open} onToggle={onToggle}>

                {/* display (메인) */}
                {displayOptions.length > 0 && (
                    <RowV1>
                        <RowLeftV1
                            title={
                                <>
                                    display
                                    {showLock && (
                                        <span className="ml-1 inline-flex">
                                          {renderMainLock('display')}
                                        </span>
                                    )}
                                </>
                            }
                        />
                        <RowRightGridV1>
                            <div className="col-span-6 min-w-0 flex items-center gap-[2px] flex-nowrap">
                                {displayOptions.map((v) => (
                                    <ChipBtnV1
                                        key={v}
                                        title={v}
                                        onClick={() => patch({ display: v })}
                                        active={display === v}
                                    >
                                        {v}
                                    </ChipBtnV1>
                                ))}
                            </div>
                        </RowRightGridV1>
                    </RowV1>
                )}

                {/* flex 상세 옵션 (정책 대상 아님 / 기존 규칙 유지) */}
                {isContainerNode && display === 'flex' && (
                    <>
                        {/* direction */}
                        <RowV1>
                            <RowLeftV1 title="direction" />
                            <RowRightGridV1>
                                <div className="col-span-6 min-w-0 flex items-center gap-[2px] flex-nowrap">
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

                        {/* justify */}
                        <RowV1>
                            <RowLeftV1 title="justify" />
                            <RowRightGridV1>
                                <div className="col-span-6 min-w-0 flex items-center gap-[2px] flex-nowrap">
                                    {[
                                        { v: 'flex-start', title: 'flex-start', I: isCol ? AlignStartVertical : AlignStartHorizontal },
                                        { v: 'center', title: 'center', I: isCol ? AlignCenterVertical : AlignCenterHorizontal },
                                        { v: 'flex-end', title: 'flex-end', I: isCol ? AlignEndVertical : AlignEndHorizontal },
                                        { v: 'space-between', title: 'space-between', I: isCol ? AlignVerticalSpaceBetween : AlignHorizontalSpaceBetween },
                                        { v: 'space-around', title: 'space-around', I: isCol ? AlignVerticalSpaceAround : AlignHorizontalSpaceAround },
                                        { v: 'space-evenly', title: 'space-evenly', I: isCol ? AlignVerticalDistributeCenter : AlignHorizontalDistributeCenter },
                                    ].map(({ v, I, title }) => (
                                        <IconBtnV1
                                            key={v}
                                            title={title}
                                            onClick={() => patch({ justifyContent: v })}
                                            active={(el as any).justifyContent === v}
                                            square24
                                        >
                                            <I size={16} />
                                        </IconBtnV1>
                                    ))}
                                </div>
                            </RowRightGridV1>
                        </RowV1>

                        {/* align */}
                        <RowV1>
                            <RowLeftV1 title="align" />
                            <RowRightGridV1>
                                <div className="col-span-6 min-w-0 flex items-center gap-[2px] flex-nowrap">
                                    {[
                                        { v: 'flex-start', title: 'flex-start', I: isCol ? AlignStartHorizontal : AlignStartVertical },
                                        { v: 'center', title: 'center', I: isCol ? AlignCenterHorizontal : AlignCenterVertical },
                                        { v: 'flex-end', title: 'flex-end', I: isCol ? AlignEndHorizontal : AlignEndVertical },
                                        { v: 'stretch', title: 'stretch', I: isCol ? StretchHorizontal : StretchVertical },
                                    ].map(({ v, I, title }) => (
                                        <IconBtnV1
                                            key={v}
                                            title={title}
                                            onClick={() => patch({ alignItems: v })}
                                            active={(el as any).alignItems === v}
                                            square24
                                        >
                                            <I size={16} />
                                        </IconBtnV1>
                                    ))}
                                </div>
                            </RowRightGridV1>
                        </RowV1>

                        {/* gap (flex) */}
                        <RowV1>
                            <RowLeftV1 title={'gap'} />
                            <RowRightGridV1>
                                <div className="col-span-3 min-w-0">
                                    <MiniInputV1
                                        value={(el as any).gap ?? ''}
                                        onChange={(v) => patch({ gap: coerceLen(v) })}
                                        placeholder="8px"
                                        size="auto"
                                    />
                                </div>
                                <div className="col-span-3" />
                            </RowRightGridV1>
                        </RowV1>
                    </>
                )}

                {/* grid 상세 옵션 (정책 대상 아님 / 기존 규칙 유지) */}
                {isContainerNode && display === 'grid' && (
                    <>
                        {/* columns */}
                        <RowV1>
                            <RowLeftV1 title="columns" />
                            <RowRightGridV1>
                                <div className="col-span-6 min-w-0 flex items-center gap-[2px]">
                                    <div className="flex items-center gap-[2px] flex-none">
                                        <IconBtnV1
                                            title="Auto"
                                            onClick={() => setCols('auto')}
                                            active={cols === null}
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
                                                square24
                                            >
                                                <span className="text-[11px] leading-none">{n}</span>
                                            </IconBtnV1>
                                        ))}
                                    </div>

                                    <div className="flex-1 min-w-0 ml-[4px]">
                                        <MiniInputV1
                                            value={manualColsVal}
                                            onChange={handleManualCols}
                                            placeholder="n"
                                            numeric
                                            size="auto"
                                            title="columns count"
                                        />
                                    </div>
                                </div>
                            </RowRightGridV1>
                        </RowV1>

                        {/* rows */}
                        <RowV1>
                            <RowLeftV1 title="rows" />
                            <RowRightGridV1>
                                <div className="col-span-6 min-w-0 flex items-center gap-[2px]">
                                    <div className="flex items-center gap-[2px] flex-none">
                                        <IconBtnV1
                                            title="Auto"
                                            onClick={() => setRows('auto')}
                                            active={rows === null}
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
                                                square24
                                            >
                                                <span className="text-[11px] leading-none">{n}</span>
                                            </IconBtnV1>
                                        ))}
                                    </div>

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

                        {/* gap (grid) */}
                        <RowV1>
                            <RowLeftV1 title={'gap'} />
                            <RowRightGridV1>
                                <div className="col-span-3 min-w-0">
                                    <MiniInputV1
                                        value={(el as any).gap ?? ''}
                                        onChange={(v) => patch({ gap: coerceLen(v) })}
                                        placeholder="8px"
                                        size="auto"
                                    />
                                </div>
                                <div className="col-span-3" />
                            </RowRightGridV1>
                        </RowV1>
                    </>
                )}

                {/* 부모가 flex일 때 노출하는 '아이템 속성' 섹션은 (현재 그룹에 없다면) 별도 그룹으로 유지. */}
                {parentIsFlex && null}

                {/* Size (메인) */}
                {canSize && (
                    <RowV1>
                        <RowLeftV1
                            title={
                                <>
                                    size
                                    {showLock && (
                                        <span className="ml-1 inline-flex">
                      {renderMainLock('size')}
                    </span>
                                    )}
                                </>
                            }
                        />
                        <RowRightGridV1>
                            {isInline ? (
                                <div className="col-span-6 text-[11px] text-gray-500">
                                    display:inline 상태에서는 width/height가 적용되지 않습니다.
                                </div>
                            ) : (
                                <>
                                    <div className="col-span-1 flex items-center text-[11px] text-gray-600 pl-[2px]">width</div>
                                    <div className="col-span-2 min-w-0">
                                        <MiniInputV1
                                            value={(el as any).width ?? ''}
                                            onChange={(v) => patch({ width: coerceLen(v) })}
                                            placeholder="auto"
                                            size="auto"
                                        />
                                    </div>
                                    <div className="col-span-1 flex items-center text-[11px] text-gray-600 pl-[2px]">height</div>
                                    <div className="col-span-2 min-w-0">
                                        <MiniInputV1
                                            value={(el as any).height ?? ''}
                                            onChange={(v) => patch({ height: coerceLen(v) })}
                                            placeholder="auto"
                                            size="auto"
                                        />
                                    </div>
                                </>
                            )}
                        </RowRightGridV1>
                    </RowV1>
                )}

                {/* overflow (메인) */}
                {canOverflow && (
                    <RowV1>
                        <RowLeftV1
                            title={
                                <>
                                    overflow
                                    {showLock && (
                                        <span className="ml-1 inline-flex">
                      {renderMainLock('overflow')}
                    </span>
                                    )}
                                </>
                            }
                        />
                        <RowRightGridV1>
                            <div className="col-span-6 min-w-0">
                                <MiniSelectV1
                                    value={(el as any).overflow ?? ''}
                                    options={['', 'visible', 'hidden', 'auto', 'scroll']}
                                    onChange={(v) => patch({ overflow: v || undefined })}
                                    title="overflow"
                                />
                            </div>
                        </RowRightGridV1>
                    </RowV1>
                )}
            </SectionShellV1>
        </div>
    );
}