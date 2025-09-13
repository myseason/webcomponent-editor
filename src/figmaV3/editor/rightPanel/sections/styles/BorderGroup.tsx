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
    ColorField, renderStyleLock,
} from './common';

import { coerceLen } from '../../../../runtime/styleUtils';

// 인스펙터 공통 레이아웃 프리미티브 (라벨 80px + 우측 6그리드)
import {
    SectionShellV1,
    RowV1,
    RowLeftV1,
    RowRightGridV1,
    MiniInputV1,
    MiniSelectV1,
    ChipBtnV1,
} from './layoutV1';

import {RightDomain, useRightControllerFactory} from '@/figmaV3/controllers/right/RightControllerFactory';

// 안전 문자열 헬퍼
function s(v: unknown): string {
    if (v === undefined || v === null) return '';
    return String(v).trim();
}

function composeBorder(width?: unknown, style?: unknown, color?: unknown) {
    const parts = [s(width), s(style), s(color)].filter(Boolean);
    return parts.length ? parts.join(' ') : '';
}

export function BorderGroup(props: {
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
    const borderAll   = s((el as any).border);
    const borderStyle = s((el as any).borderStyle);
    const borderWidth = s((el as any).borderWidth);
    const borderColor = s((el as any).borderColor);

    const bTW = s((el as any).borderTopWidth);
    const bRW = s((el as any).borderRightWidth);
    const bBW = s((el as any).borderBottomWidth);
    const bLW = s((el as any).borderLeftWidth);

    const rAll = s((el as any).borderRadius);
    const rTL  = s((el as any).borderTopLeftRadius);
    const rTR  = s((el as any).borderTopRightRadius);
    const rBR  = s((el as any).borderBottomRightRadius);
    const rBL  = s((el as any).borderBottomLeftRadius);

    /*
    const renderLock = (controlKey: string) => {
        if (ui.mode === 'Component') {
            return <PermissionLock controlKey={`styles:${controlKey}`} componentId={componentId} />;
        }
        return null;
    };
    */

    const renderLock = (controlKey: string) => renderStyleLock(ui, componentId, controlKey);

    // style select: 기본 solid
    const styleOptions = ['solid', 'dashed', 'dotted', 'double', 'none'] as const;
    const styleValue = borderStyle || 'solid';

    // 칩 프리셋(최대 5개 정책)
    const radiusPreset = ['0', '4px', '8px', '12px', '16px'] as const;

    // Row2 변경 시 shorthand 동기화
    const syncBorderAll = (next: { width?: string; style?: string; color?: string }) => {
        const w = next.width !== undefined ? next.width : borderWidth;
        const sStyle = next.style !== undefined ? next.style : (styleValue || 'solid');
        const c = next.color !== undefined ? next.color : borderColor;
        const composed = composeBorder(w, sStyle, c);

        patch({
            border: composed || undefined,
            ...(next.width !== undefined ? { borderWidth: w || undefined } : {}),
            ...(next.style !== undefined ? { borderStyle: sStyle || undefined } : {}),
            ...(next.color !== undefined ? { borderColor: c || undefined } : {}),
        });
    };

    return (
        <div className="mt-4">
            <SectionShellV1 title="Border" open={open} onToggle={onToggle}>
                {/* ── border 1행: textfield (6칸) ───────────────────────── */}
                <RowV1>
                    <RowLeftV1 title="border" />
                    <RowRightGridV1>
                        <div className="col-span-6 min-w-0">
                            {renderLock('border')}
                            {!allow.has('border') && <DisabledHint reason={dis('border') ?? 'template'} />}
                            {allow.has('border') ? (
                                <MiniInputV1
                                    value={borderAll}
                                    onChange={(v) => {
                                        // shorthand 직접 수정 시 개별 속성은 유지(기존 로직 보존)
                                        patch({ border: v || undefined });
                                    }}
                                    placeholder="1px solid #000"
                                    size="auto"
                                    title="border (shorthand)"
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>
                    </RowRightGridV1>
                </RowV1>

                {/* ── border 2행: color-picker(3) | style(2) | width(1) ── */}
                <RowV1>
                    {/* 같은 섹션의 연장 표시를 위해 좌측 라벨 비움 */}
                    <RowLeftV1 title="" />
                    <RowRightGridV1>
                        {/* color-picker (3칸) — ColorField 자체가 버튼+입력을 포함한다고 가정 */}
                        <div className="col-span-3 min-w-0 flex items-center">
                            {renderLock('borderColor')}
                            {!allow.has('borderColor') && <DisabledHint reason={dis('borderColor') ?? 'template'} />}
                            <div className="origin-left scale-90 w-full">
                                {allow.has('borderColor') ? (
                                    <ColorField
                                        value={borderColor || '#000000'}
                                        onChange={(v) => {
                                            // v는 문자열(hex 등)이라고 가정
                                            syncBorderAll({ color: s(v) || undefined });
                                        }}
                                    />
                                ) : (
                                    <span className="text-[11px] text-gray-500">제한됨</span>
                                )}
                            </div>
                        </div>

                        {/* style select (2칸) — 기본 solid */}
                        <div className="col-span-2 min-w-0">
                            {renderLock('borderStyle')}
                            {!allow.has('borderStyle') && <DisabledHint reason={dis('borderStyle') ?? 'template'} />}
                            {allow.has('borderStyle') ? (
                                <MiniSelectV1
                                    value={styleValue}
                                    options={styleOptions as unknown as string[]}
                                    onChange={(v) => {
                                        const style = s(v) || undefined;
                                        syncBorderAll({ style });
                                    }}
                                    title="border-style"
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>

                        {/* width textfield (1칸) — 기본 1px */}
                        <div className="col-span-1 min-w-0">
                            {renderLock('borderWidth')}
                            {!allow.has('borderWidth') && <DisabledHint reason={dis('borderWidth') ?? 'template'} />}
                            {allow.has('borderWidth') ? (
                                <MiniInputV1
                                    value={borderWidth}
                                    onChange={(v) => {
                                        const w = v ? s(coerceLen(v)) : undefined;
                                        syncBorderAll({ width: w });
                                    }}
                                    placeholder="1px"
                                    size="auto"
                                    title="border-width (all)"
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>
                    </RowRightGridV1>
                </RowV1>

                {/* radius all: 칩 5개 + 수동 입력(남는 폭 전부) */}
                <RowV1>
                    <RowLeftV1 title="radius" />
                    <RowRightGridV1>
                        <div className="col-span-6 min-w-0 flex items-center gap-[2px]">
                            {renderLock('borderRadius')}
                            {!allow.has('borderRadius') && <DisabledHint reason={dis('borderRadius') ?? 'template'} />}

                            <div className="flex items-center gap-[2px] flex-none">
                                {allow.has('borderRadius') &&
                                    radiusPreset.map((v) => (
                                        <ChipBtnV1
                                            key={v}
                                            title={v}
                                            onClick={() => patch({ borderRadius: v === '0' ? '0' : v })}
                                            active={rAll === v || (v === '0' && rAll === '0')}
                                        >
                                            {v.replace('px', '')}
                                        </ChipBtnV1>
                                    ))}
                            </div>

                            {/* 수동 입력: 남는 폭 모두 사용 */}
                            <div className="flex-1 min-w-0 ml-[4px]">
                                {allow.has('borderRadius') ? (
                                    <MiniInputV1
                                        value={rAll}
                                        onChange={(v) => patch({ borderRadius: v ? s(coerceLen(v)) : undefined })}
                                        placeholder="8px"
                                        size="auto"
                                        title="border-radius (all)"
                                    />
                                ) : (
                                    <span className="text-[11px] text-gray-500">제한됨</span>
                                )}
                            </div>
                        </div>
                    </RowRightGridV1>
                </RowV1>

                {/* radius TRBL — 1행: TL | input | TR | input */}
                <RowV1>
                    <RowLeftV1 title="r-TRBL" />
                    <RowRightGridV1>
                        <div className="col-span-1 flex items-center text-[11px] text-gray-600 pl-[2px]">TL</div>
                        <div className="col-span-2 min-w-0">
                            {renderLock('borderTopLeftRadius')}
                            {!allow.has('borderTopLeftRadius') && <DisabledHint reason={dis('borderTopLeftRadius') ?? 'template'} />}
                            {allow.has('borderTopLeftRadius') ? (
                                <MiniInputV1
                                    value={rTL}
                                    onChange={(v) => patch({ borderTopLeftRadius: v ? s(coerceLen(v)) : undefined })}
                                    placeholder="auto"
                                    size="auto"
                                    title="border-top-left-radius"
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>

                        <div className="col-span-1 flex items-center text-[11px] text-gray-600 pl-[2px]">TR</div>
                        <div className="col-span-2 min-w-0">
                            {renderLock('borderTopRightRadius')}
                            {!allow.has('borderTopRightRadius') && <DisabledHint reason={dis('borderTopRightRadius') ?? 'template'} />}
                            {allow.has('borderTopRightRadius') ? (
                                <MiniInputV1
                                    value={rTR}
                                    onChange={(v) => patch({ borderTopRightRadius: v ? s(coerceLen(v)) : undefined })}
                                    placeholder="auto"
                                    size="auto"
                                    title="border-top-right-radius"
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>
                    </RowRightGridV1>
                </RowV1>

                {/* radius TRBL — 2행: BR | input | BL | input */}
                <RowV1>
                    <RowLeftV1 title="" />
                    <RowRightGridV1>
                        <div className="col-span-1 flex items-center text-[11px] text-gray-600 pl-[2px]">BR</div>
                        <div className="col-span-2 min-w-0">
                            {renderLock('borderBottomRightRadius')}
                            {!allow.has('borderBottomRightRadius') && <DisabledHint reason={dis('borderBottomRightRadius') ?? 'template'} />}
                            {allow.has('borderBottomRightRadius') ? (
                                <MiniInputV1
                                    value={rBR}
                                    onChange={(v) => patch({ borderBottomRightRadius: v ? s(coerceLen(v)) : undefined })}
                                    placeholder="auto"
                                    size="auto"
                                    title="border-bottom-right-radius"
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>

                        <div className="col-span-1 flex items-center text-[11px] text-gray-600 pl-[2px]">BL</div>
                        <div className="col-span-2 min-w-0">
                            {renderLock('borderBottomLeftRadius')}
                            {!allow.has('borderBottomLeftRadius') && <DisabledHint reason={dis('borderBottomLeftRadius') ?? 'template'} />}
                            {allow.has('borderBottomLeftRadius') ? (
                                <MiniInputV1
                                    value={rBL}
                                    onChange={(v) => patch({ borderBottomLeftRadius: v ? s(coerceLen(v)) : undefined })}
                                    placeholder="auto"
                                    size="auto"
                                    title="border-bottom-left-radius"
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>
                    </RowRightGridV1>
                </RowV1>

                {/* width per-side(TRBL) — 1행: T | input | R | input */}
                <RowV1>
                    <RowLeftV1 title="w-TRBL" />
                    <RowRightGridV1>
                        <div className="col-span-1 flex items-center text-[11px] text-gray-600 pl-[2px]">T</div>
                        <div className="col-span-2 min-w-0">
                            {renderLock('borderTopWidth')}
                            {!allow.has('borderTopWidth') && <DisabledHint reason={dis('borderTopWidth') ?? 'template'} />}
                            {allow.has('borderTopWidth') ? (
                                <MiniInputV1
                                    value={bTW}
                                    onChange={(v) => patch({ borderTopWidth: v ? s(coerceLen(v)) : undefined })}
                                    placeholder="1px"
                                    size="auto"
                                    title="border-top-width"
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>

                        <div className="col-span-1 flex items-center text-[11px] text-gray-600 pl-[2px]">R</div>
                        <div className="col-span-2 min-w-0">
                            {renderLock('borderRightWidth')}
                            {!allow.has('borderRightWidth') && <DisabledHint reason={dis('borderRightWidth') ?? 'template'} />}
                            {allow.has('borderRightWidth') ? (
                                <MiniInputV1
                                    value={bRW}
                                    onChange={(v) => patch({ borderRightWidth: v ? s(coerceLen(v)) : undefined })}
                                    placeholder="1px"
                                    size="auto"
                                    title="border-right-width"
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>
                    </RowRightGridV1>
                </RowV1>

                {/* width per-side(TRBL) — 2행: B | input | L | input */}
                <RowV1>
                    <RowLeftV1 title="" />
                    <RowRightGridV1>
                        <div className="col-span-1 flex items中心 text-[11px] text-gray-600 pl-[2px]">B</div>
                        <div className="col-span-2 min-w-0">
                            {renderLock('borderBottomWidth')}
                            {!allow.has('borderBottomWidth') && <DisabledHint reason={dis('borderBottomWidth') ?? 'template'} />}
                            {allow.has('borderBottomWidth') ? (
                                <MiniInputV1
                                    value={bBW}
                                    onChange={(v) => patch({ borderBottomWidth: v ? s(coerceLen(v)) : undefined })}
                                    placeholder="1px"
                                    size="auto"
                                    title="border-bottom-width"
                                />
                            ) : (
                                <span className="text-[11px] text-gray-500">제한됨</span>
                            )}
                        </div>

                        <div className="col-span-1 flex items-center text-[11px] text-gray-600 pl-[2px]">L</div>
                        <div className="col-span-2 min-w-0">
                            {renderLock('borderLeftWidth')}
                            {!allow.has('borderLeftWidth') && <DisabledHint reason={dis('borderLeftWidth') ?? 'template'} />}
                            {allow.has('borderLeftWidth') ? (
                                <MiniInputV1
                                    value={bLW}
                                    onChange={(v) => patch({ borderLeftWidth: v ? s(coerceLen(v)) : undefined })}
                                    placeholder="1px"
                                    size="auto"
                                    title="border-left-width"
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