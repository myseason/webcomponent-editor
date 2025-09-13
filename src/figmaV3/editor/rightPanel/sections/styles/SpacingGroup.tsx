'use client';

import React from 'react';
import type {
    CSSDict,
    InspectorFilter,
    TagPolicy,
    TagPolicyMap,
    NodeId,
} from '../../../../core/types';

import {
    useAllowed,
    DisabledHint,
    type DisallowReason,
    PermissionLock,
    reasonForKey, renderStyleLock,
} from './common';

import { coerceLen } from '../../../../runtime/styleUtils';

// 인스펙터 공통 레이아웃 프리미티브 (라벨 80px + 우측 6그리드)
import {
    SectionShellV1,
    RowV1,
    RowLeftV1,
    RowRightGridV1,
    MiniInputV1,
    ChipBtnV1,
} from './layoutV1';

import {RightDomain, useRightControllerFactory} from '@/figmaV3/controllers/right/RightControllerFactory';

export function SpacingGroup(props: {
    el: Record<string, any>;
    patch: (css: CSSDict) => void;
    tag: string;
    tagPolicy: TagPolicy | undefined;
    tf: InspectorFilter | undefined;
    map: TagPolicyMap | undefined;
    expert: boolean;
    open: boolean;
    onToggle: () => void;
    nodeId: NodeId;
    componentId: string;
}) {
    const { reader } = useRightControllerFactory(RightDomain.Inspector);
    const R = reader;

    const { el, patch, expert, open, onToggle, nodeId, componentId } = props;
    const ui = R.getUI();
    const project = R.getProject();
    const allow = useAllowed(nodeId);
    const dis = (k: string): DisallowReason => reasonForKey(project, ui, nodeId, k, expert);

    const margin = String((el as any).margin ?? '');
    const mT = String((el as any).marginTop ?? '');
    const mR = String((el as any).marginRight ?? '');
    const mB = String((el as any).marginBottom ?? '');
    const mL = String((el as any).marginLeft ?? '');

    const padding = String((el as any).padding ?? '');
    const pT = String((el as any).paddingTop ?? '');
    const pR = String((el as any).paddingRight ?? '');
    const pB = String((el as any).paddingBottom ?? '');
    const pL = String((el as any).paddingLeft ?? '');

    /*
    const renderLock = (controlKey: string) => {
        if (ui.mode === 'Component') {
            return <PermissionLock controlKey={`styles:${controlKey}`} componentId={componentId} />;
        }
        return null;
    };
    */
    const renderLock = (controlKey: string) => renderStyleLock(ui, componentId, controlKey);

    // 칩 프리셋(최대 5개 정책): 0/4/8/12/16
    const presetVals = ['0', '4px', '8px', '12px', '16px'] as const;

    return (
        <div className="mt-4">
            <SectionShellV1 title="Spacing" open={open} onToggle={onToggle}>
                {/* margin 전체: 칩 5개 + 수동 입력 */}
                <RowV1>
                    <RowLeftV1 title="margin" />
                    <RowRightGridV1>
                        <div className="col-span-6 min-w-0 flex items-center gap-[2px]">
                            {renderLock('margin')}
                            {!allow.has('margin') && <DisabledHint reason={dis('margin') ?? 'template'} />}

                            <div className="flex items-center gap-[2px] flex-none">
                                {allow.has('margin') &&
                                    presetVals.map((v) => (
                                        <ChipBtnV1
                                            key={v}
                                            title={v}
                                            onClick={() => patch({ margin: v === '0' ? '0' : v })}
                                            active={margin === v || (v === '0' && margin === '0')}
                                        >
                                            {v.replace('px', '')}
                                        </ChipBtnV1>
                                    ))}
                            </div>

                            {/* 수동 입력: 남는 폭 모두 사용, 빈 값이면 해제 */}
                            <div className="flex-1 min-w-0 ml-[4px]">
                                {allow.has('margin') ? (
                                    <MiniInputV1
                                        value={margin}
                                        onChange={(v) => patch({ margin: v ? coerceLen(v) : undefined })}
                                        placeholder="auto"
                                        size="auto"
                                        title="margin (all)"
                                    />
                                ) : (
                                    <span className="text-[11px] text-gray-500">제한됨</span>
                                )}
                            </div>
                        </div>
                    </RowRightGridV1>
                </RowV1>

                {/* margin TRBL — 1행: T | input | R | input */}
                <RowV1>
                    <RowLeftV1 title="m-TRBL" />
                    <RowRightGridV1>
                        <div className="col-span-1 flex items-center text-[11px] text-gray-600 pl-[2px]">T</div>
                        <div className="col-span-2 min-w-0">
                            {renderLock('marginTop')}
                            {!allow.has('marginTop') && <DisabledHint reason={dis('marginTop') ?? 'template'} />}
                            {allow.has('marginTop') ? (
                                <MiniInputV1
                                    value={mT}
                                    onChange={(v) => patch({ marginTop: v ? coerceLen(v) : undefined })}
                                    placeholder="auto"
                                    size="auto"
                                    title="margin-top"
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>

                        <div className="col-span-1 flex items-center text-[11px] text-gray-600 pl-[2px]">R</div>
                        <div className="col-span-2 min-w-0">
                            {renderLock('marginRight')}
                            {!allow.has('marginRight') && <DisabledHint reason={dis('marginRight') ?? 'template'} />}
                            {allow.has('marginRight') ? (
                                <MiniInputV1
                                    value={mR}
                                    onChange={(v) => patch({ marginRight: v ? coerceLen(v) : undefined })}
                                    placeholder="auto"
                                    size="auto"
                                    title="margin-right"
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>
                    </RowRightGridV1>
                </RowV1>

                {/* margin TRBL — 2행: B | input | L | input */}
                <RowV1>
                    <RowLeftV1 title="" />
                    <RowRightGridV1>
                        <div className="col-span-1 flex items-center text-[11px] text-gray-600 pl-[2px]">B</div>
                        <div className="col-span-2 min-w-0">
                            {renderLock('marginBottom')}
                            {!allow.has('marginBottom') && <DisabledHint reason={dis('marginBottom') ?? 'template'} />}
                            {allow.has('marginBottom') ? (
                                <MiniInputV1
                                    value={mB}
                                    onChange={(v) => patch({ marginBottom: v ? coerceLen(v) : undefined })}
                                    placeholder="auto"
                                    size="auto"
                                    title="margin-bottom"
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>

                        <div className="col-span-1 flex items-center text-[11px] text-gray-600 pl-[2px]">L</div>
                        <div className="col-span-2 min-w-0">
                            {renderLock('marginLeft')}
                            {!allow.has('marginLeft') && <DisabledHint reason={dis('marginLeft') ?? 'template'} />}
                            {allow.has('marginLeft') ? (
                                <MiniInputV1
                                    value={mL}
                                    onChange={(v) => patch({ marginLeft: v ? coerceLen(v) : undefined })}
                                    placeholder="auto"
                                    size="auto"
                                    title="margin-left"
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>
                    </RowRightGridV1>
                </RowV1>

                {/* padding 전체: 칩 5개 + 수동 입력 */}
                <RowV1>
                    <RowLeftV1 title="padding" />
                    <RowRightGridV1>
                        <div className="col-span-6 min-w-0 flex items-center gap-[2px]">
                            {renderLock('padding')}
                            {!allow.has('padding') && <DisabledHint reason={dis('padding') ?? 'template'} />}

                            <div className="flex items-center gap-[2px] flex-none">
                                {allow.has('padding') &&
                                    presetVals.map((v) => (
                                        <ChipBtnV1
                                            key={v}
                                            title={v}
                                            onClick={() => patch({ padding: v === '0' ? '0' : v })}
                                            active={padding === v || (v === '0' && padding === '0')}
                                        >
                                            {v.replace('px', '')}
                                        </ChipBtnV1>
                                    ))}
                            </div>

                            {/* 수동 입력: 남는 폭 모두 사용, 빈 값이면 해제 */}
                            <div className="flex-1 min-w-0 ml-[4px]">
                                {allow.has('padding') ? (
                                    <MiniInputV1
                                        value={padding}
                                        onChange={(v) => patch({ padding: v ? coerceLen(v) : undefined })}
                                        placeholder="auto"
                                        size="auto"
                                        title="padding (all)"
                                    />
                                ) : (
                                    <span className="text-[11px] text-gray-500">제한됨</span>
                                )}
                            </div>
                        </div>
                    </RowRightGridV1>
                </RowV1>

                {/* padding TRBL — 1행: T | input | R | input */}
                <RowV1>
                    <RowLeftV1 title="p-TRBL" />
                    <RowRightGridV1>
                        <div className="col-span-1 flex items-center text-[11px] text-gray-600 pl-[2px]">T</div>
                        <div className="col-span-2 min-w-0">
                            {renderLock('paddingTop')}
                            {!allow.has('paddingTop') && <DisabledHint reason={dis('paddingTop') ?? 'template'} />}
                            {allow.has('paddingTop') ? (
                                <MiniInputV1
                                    value={pT}
                                    onChange={(v) => patch({ paddingTop: v ? coerceLen(v) : undefined })}
                                    placeholder="auto"
                                    size="auto"
                                    title="padding-top"
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>

                        <div className="col-span-1 flex items-center text-[11px] text-gray-600 pl-[2px]">R</div>
                        <div className="col-span-2 min-w-0">
                            {renderLock('paddingRight')}
                            {!allow.has('paddingRight') && <DisabledHint reason={dis('paddingRight') ?? 'template'} />}
                            {allow.has('paddingRight') ? (
                                <MiniInputV1
                                    value={pR}
                                    onChange={(v) => patch({ paddingRight: v ? coerceLen(v) : undefined })}
                                    placeholder="auto"
                                    size="auto"
                                    title="padding-right"
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>
                    </RowRightGridV1>
                </RowV1>

                {/* padding TRBL — 2행: B | input | L | input */}
                <RowV1>
                    <RowLeftV1 title="" />
                    <RowRightGridV1>
                        <div className="col-span-1 flex items-center text-[11px] text-gray-600 pl-[2px]">B</div>
                        <div className="col-span-2 min-w-0">
                            {renderLock('paddingBottom')}
                            {!allow.has('paddingBottom') && <DisabledHint reason={dis('paddingBottom') ?? 'template'} />}
                            {allow.has('paddingBottom') ? (
                                <MiniInputV1
                                    value={pB}
                                    onChange={(v) => patch({ paddingBottom: v ? coerceLen(v) : undefined })}
                                    placeholder="auto"
                                    size="auto"
                                    title="padding-bottom"
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>

                        <div className="col-span-1 flex items-center text-[11px] text-gray-600 pl-[2px]">L</div>
                        <div className="col-span-2 min-w-0">
                            {renderLock('paddingLeft')}
                            {!allow.has('paddingLeft') && <DisabledHint reason={dis('paddingLeft') ?? 'template'} />}
                            {allow.has('paddingLeft') ? (
                                <MiniInputV1
                                    value={pL}
                                    onChange={(v) => patch({ paddingLeft: v ? coerceLen(v) : undefined })}
                                    placeholder="auto"
                                    size="auto"
                                    title="padding-left"
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