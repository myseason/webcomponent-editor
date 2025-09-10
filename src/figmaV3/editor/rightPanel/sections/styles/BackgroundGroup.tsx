'use client';

import React from 'react';
import type {CSSDict, InspectorFilter, NodeId, TagPolicy, TagPolicyMap,} from '../../../../core/types';

import {ColorField, DisabledHint, type DisallowReason, PermissionLock, reasonForKey, useAllowed,} from './common';

// 인스펙터 공통 레이아웃 프리미티브 (라벨 80px + 우측 6그리드)
import {MiniInputV1, MiniSelectV1, RowLeftV1, RowRightGridV1, RowV1, SectionShellV1,} from './layoutV1';

import {RightDomain, useRightControllerFactory} from '@/figmaV3/controllers/right/RightControllerFactory';

// 안전 문자열 헬퍼
function s(v: unknown): string {
    if (v === undefined || v === null) return '';
    return String(v).trim();
}

type BGMode = 'color' | 'image';

function detectMode(img: string): BGMode {
    if (img && /url\(/i.test(img)) return 'image';
    return 'color';
}

export function BackgroundGroup(props: {
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
    // ✅ RightPanelController 사용
    const { reader } = useRightControllerFactory(RightDomain.Inspector);
    const R = reader;

    const { el, patch, expert, open, onToggle, nodeId, componentId } = props;
    const ui = R.getUI();
    const project = R.getProject();
    const allow = useAllowed(nodeId);
    const dis = (k: string): DisallowReason => reasonForKey(project, ui, nodeId, k, expert);

    // 현재값
    const backgroundColor = s((el as any).backgroundColor);
    const backgroundImage = s((el as any).backgroundImage);
    const backgroundRepeat = s((el as any).backgroundRepeat);
    const backgroundSize = s((el as any).backgroundSize);
    const backgroundPosition = s((el as any).backgroundPosition);

    const initialMode: BGMode = detectMode(backgroundImage);
    const [mode, setMode] = React.useState<BGMode>(initialMode);

    const renderLock = (controlKey: string) => {
        if (ui.mode === 'Component') {
            return <PermissionLock controlKey={`styles:${controlKey}`} componentId={componentId} />;
        }
        return null;
    };

    // placeholder 옵션(더미)을 포함한 배열. 더미 선택 시 undefined로 패치
    const sizeOptions = ['- size -', 'auto', 'cover', 'contain'] as const;
    const repeatOptions = ['- repeat -', 'no-repeat', 'repeat', 'repeat-x', 'repeat-y', 'space', 'round'] as const;
    const positionOptions = ['- position -', 'center', 'top left', 'top', 'right', 'bottom'] as const;

    const onChangeMode = (m: BGMode) => {
        setMode(m);
        if (m === 'color') {
            // 이미지 관련 속성 정리
            patch({
                backgroundImage: undefined,
                backgroundRepeat: undefined,
                backgroundSize: undefined,
                backgroundPosition: undefined,
            });
        } else if (m === 'image') {
            // color는 그대로 두되 필요한 값만 채움
        }
    };

    const setSize = (v: string) => {
        const next = v.startsWith('--') ? undefined : v || undefined;
        patch({ backgroundSize: next });
    };

    const setRepeat = (v: string) => {
        const next = v.startsWith('--') ? undefined : v || undefined;
        patch({ backgroundRepeat: next });
    };

    const setPosition = (v: string) => {
        const next = v.startsWith('--') ? undefined : v || undefined;
        patch({ backgroundPosition: next });
    };

    return (
        <div className="mt-4">
            <SectionShellV1 title="Background" open={open} onToggle={onToggle}>
                {/* mode */}
                <RowV1>
                    <RowLeftV1 title="mode" />
                    <RowRightGridV1>
                        <div className="col-span-3 min-w-0">
                            <MiniSelectV1
                                value={mode}
                                options={['color', 'image']}
                                onChange={(v) => onChangeMode((v as BGMode) || 'color')}
                                title="background mode"
                            />
                        </div>
                        <div className="col-span-3" />
                    </RowRightGridV1>
                </RowV1>

                {/* COLOR MODE */}
                {mode === 'color' && (
                    <RowV1>
                        <RowLeftV1 title="color" />
                        <RowRightGridV1>
                            <div className="col-span-6 min-w-0 flex items-center">
                                {renderLock('backgroundColor')}
                                {!allow.has('backgroundColor') && (
                                    <DisabledHint reason={dis('backgroundColor') ?? 'template'} />
                                )}
                                <div className="origin-left scale-90">
                                    {allow.has('backgroundColor') ? (
                                        <ColorField
                                            value={backgroundColor || '#000000'}
                                            onChange={(v) => patch({ backgroundColor: v })}
                                        />
                                    ) : (
                                        <span className="text-[11px] text-gray-500">제한됨</span>
                                    )}
                                </div>
                            </div>
                        </RowRightGridV1>
                    </RowV1>
                )}

                {/* IMAGE MODE */}
                {mode === 'image' && (
                    <>
                        {/* url */}
                        <RowV1>
                            <RowLeftV1 title="url" />
                            <RowRightGridV1>
                                <div className="col-span-6 min-w-0">
                                    {renderLock('backgroundImage')}
                                    {!allow.has('backgroundImage') && (
                                        <DisabledHint reason={dis('backgroundImage') ?? 'template'} />
                                    )}
                                    {allow.has('backgroundImage') ? (
                                        <MiniInputV1
                                            value={
                                                backgroundImage
                                                    ? backgroundImage.replace(/^url\((.*)\)$/i, '$1')
                                                    : ''
                                            }
                                            onChange={(v) => {
                                                const trimmed = s(v);
                                                const next = trimmed ? `url(${trimmed})` : undefined;
                                                patch({ backgroundImage: next });
                                            }}
                                            placeholder="/image.png"
                                            size="auto"
                                            title="background-image url"
                                        />
                                    ) : (
                                        <span className="text-[11px] text-gray-500">제한됨</span>
                                    )}
                                </div>
                            </RowRightGridV1>
                        </RowV1>

                        {/* opt: size | repeat | position */}
                        <RowV1>
                            <RowLeftV1 title="opt" />
                            <RowRightGridV1>
                                {/* size */}
                                <div className="col-span-2 min-w-0">
                                    {renderLock('backgroundSize')}
                                    {!allow.has('backgroundSize') && (
                                        <DisabledHint reason={dis('backgroundSize') ?? 'template'} />
                                    )}
                                    {allow.has('backgroundSize') ? (
                                        <MiniSelectV1
                                            value={backgroundSize || sizeOptions[0]}
                                            options={sizeOptions as unknown as string[]}
                                            onChange={(v) => setSize(v as string)}
                                            title="background-size"
                                        />
                                    ) : (
                                        <span className="text-[11px] text-gray-500">제한됨</span>
                                    )}
                                </div>

                                {/* repeat */}
                                <div className="col-span-2 min-w-0">
                                    {renderLock('backgroundRepeat')}
                                    {!allow.has('backgroundRepeat') && (
                                        <DisabledHint reason={dis('backgroundRepeat') ?? 'template'} />
                                    )}
                                    {allow.has('backgroundRepeat') ? (
                                        <MiniSelectV1
                                            value={backgroundRepeat || repeatOptions[0]}
                                            options={repeatOptions as unknown as string[]}
                                            onChange={(v) => setRepeat(v as string)}
                                            title="background-repeat"
                                        />
                                    ) : (
                                        <span className="text-[11px] text-gray-500">제한됨</span>
                                    )}
                                </div>

                                {/* position */}
                                <div className="col-span-2 min-w-0">
                                    {renderLock('backgroundPosition')}
                                    {!allow.has('backgroundPosition') && (
                                        <DisabledHint reason={dis('backgroundPosition') ?? 'template'} />
                                    )}
                                    {allow.has('backgroundPosition') ? (
                                        <MiniSelectV1
                                            value={backgroundPosition || positionOptions[0]}
                                            options={positionOptions as unknown as string[]}
                                            onChange={(v) => setPosition(v as string)}
                                            title="background-position"
                                        />
                                    ) : (
                                        <span className="text-[11px] text-gray-500">제한됨</span>
                                    )}
                                </div>
                            </RowRightGridV1>
                        </RowV1>
                    </>
                )}
            </SectionShellV1>
        </div>
    );
}