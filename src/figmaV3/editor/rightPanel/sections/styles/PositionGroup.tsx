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
    reasonForKey,
} from './common';

import { useEditor } from '../../../useEditor';
import { coerceLen } from '../../../../runtime/styleUtils';

// 인스펙터 공통 레이아웃 프리미티브 (라벨 80px + 우측 6그리드)
import {
    SectionShellV1,
    RowV1,
    RowLeftV1,
    RowRightGridV1,
    MiniInputV1,
    MiniSelectV1,
} from './layoutV1';

export function PositionGroup(props: {
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
    const { el, patch, expert, open, onToggle, nodeId, componentId } = props;
    const { ui, project } = useEditor();
    const allow = useAllowed(nodeId);
    const dis = (k: string): DisallowReason => reasonForKey(project, ui, nodeId, k, expert);

    const position = String((el as any).position ?? 'static');
    const top = String((el as any).top ?? '');
    const right = String((el as any).right ?? '');
    const bottom = String((el as any).bottom ?? '');
    const left = String((el as any).left ?? '');
    const zIndex = String((el as any).zIndex ?? '');

    const renderLock = (controlKey: string) => {
        if (ui.mode === 'Component') {
            return <PermissionLock controlKey={`styles:${controlKey}`} componentId={componentId} />;
        }
        return null;
    };

    const zIndexOptions = ['', 'auto', '0', '10', '100', '1000'];

    const offsetsDisabledHint =
        position === 'static'
            ? 'position: static 상태에서는 좌표가 레이아웃에 영향을 주지 않습니다.'
            : undefined;

    return (
        // 현 기조: 최상단 여백만 주고(좌/우 패딩은 상위에서 관리)
        <div className="mt-4">
            <SectionShellV1 title="Position" open={open} onToggle={onToggle}>
                {/* position: Select Box 로 교체 (우측 6칸 전체 사용) */}
                <RowV1>
                    <RowLeftV1 title="position" />
                    <RowRightGridV1>
                        <div className="col-span-6 min-w-0">
                            {renderLock('position')}
                            {!allow.has('position') && <DisabledHint reason={dis('position') ?? 'template'} />}
                            {allow.has('position') ? (
                                <MiniSelectV1
                                    value={position}
                                    options={['static', 'relative', 'absolute', 'fixed', 'sticky']}
                                    onChange={(v) => patch({ position: v || undefined })}
                                    title="position"
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>
                    </RowRightGridV1>
                </RowV1>

                {/* offsets 1행: T | input | R | input */}
                <RowV1>
                    <RowLeftV1 title="offsets" />
                    <RowRightGridV1>
                        {/* T 라벨 (1칸) */}
                        <div className="col-span-1 flex items-center text-[11px] text-gray-600 pl-[2px]">T</div>
                        {/* T 입력 (2칸) */}
                        <div className="col-span-2 min-w-0">
                            {renderLock('top')}
                            {!allow.has('top') && <DisabledHint reason={dis('top') ?? 'template'} />}
                            {allow.has('top') ? (
                                <MiniInputV1
                                    value={top}
                                    onChange={(v) => patch({ top: v ? coerceLen(v) : undefined })}
                                    placeholder="auto"
                                    size="auto"
                                    title="top"
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>
                        {/* R 라벨 (1칸) */}
                        <div className="col-span-1 flex items-center text-[11px] text-gray-600 pl-[2px]">R</div>
                        {/* R 입력 (2칸) */}
                        <div className="col-span-2 min-w-0">
                            {renderLock('right')}
                            {!allow.has('right') && <DisabledHint reason={dis('right') ?? 'template'} />}
                            {allow.has('right') ? (
                                <MiniInputV1
                                    value={right}
                                    onChange={(v) => patch({ right: v ? coerceLen(v) : undefined })}
                                    placeholder="auto"
                                    size="auto"
                                    title="right"
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>
                    </RowRightGridV1>
                </RowV1>

                {/* offsets 2행: B | input | L | input */}
                <RowV1>
                    {/* 좌측 라벨은 비워 동일 섹션임을 암시 */}
                    <RowLeftV1 title="" />
                    <RowRightGridV1>
                        {/* B 라벨 (1칸) */}
                        <div className="col-span-1 flex items-center text-[11px] text-gray-600 pl-[2px]">B</div>
                        {/* B 입력 (2칸) */}
                        <div className="col-span-2 min-w-0">
                            {renderLock('bottom')}
                            {!allow.has('bottom') && <DisabledHint reason={dis('bottom') ?? 'template'} />}
                            {allow.has('bottom') ? (
                                <MiniInputV1
                                    value={bottom}
                                    onChange={(v) => patch({ bottom: v ? coerceLen(v) : undefined })}
                                    placeholder="auto"
                                    size="auto"
                                    title="bottom"
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>
                        {/* L 라벨 (1칸) */}
                        <div className="col-span-1 flex items-center text-[11px] text-gray-600 pl-[2px]">L</div>
                        {/* L 입력 (2칸) */}
                        <div className="col-span-2 min-w-0">
                            {renderLock('left')}
                            {!allow.has('left') && <DisabledHint reason={dis('left') ?? 'template'} />}
                            {allow.has('left') ? (
                                <MiniInputV1
                                    value={left}
                                    onChange={(v) => patch({ left: v ? coerceLen(v) : undefined })}
                                    placeholder="auto"
                                    size="auto"
                                    title="left"
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>
                    </RowRightGridV1>
                </RowV1>

                {/* static 안내 (필요 시) */}
                {offsetsDisabledHint && (
                    <RowV1>
                        <RowLeftV1 title="" />
                        <RowRightGridV1>
                            <div className="col-span-6 text-[11px] text-gray-500">
                                {offsetsDisabledHint}
                            </div>
                        </RowRightGridV1>
                    </RowV1>
                )}

                {/* z-index: select (4칸) | input (2칸) */}
                <RowV1>
                    <RowLeftV1 title="z-index" />
                    <RowRightGridV1>
                        <div className="col-span-4 min-w-0">
                            {renderLock('zIndex')}
                            {!allow.has('zIndex') && <DisabledHint reason={dis('zIndex') ?? 'template'} />}
                            {allow.has('zIndex') ? (
                                <MiniSelectV1
                                    value={zIndex}
                                    options={zIndexOptions}
                                    onChange={(v) => patch({ zIndex: v || undefined })}
                                    title="z-index"
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>
                        <div className="col-span-2 min-w-0">
                            {allow.has('zIndex') ? (
                                <MiniInputV1
                                    value={zIndex}
                                    onChange={(v) => patch({ zIndex: v || undefined })}
                                    placeholder="0"
                                    size="auto"
                                    title="z-index (custom)"
                                />
                            ) : null}
                        </div>
                    </RowRightGridV1>
                </RowV1>
            </SectionShellV1>
        </div>
    );
}