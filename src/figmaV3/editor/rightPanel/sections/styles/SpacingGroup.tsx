'use client';
/**
 * SpacingGroup v2
 * - margin / padding: 기본(전체) + 고급(각 방향) 입력
 * - 프리셋(0, 4, 8, 12, 16, 24)
 * - 링크 토글(전체 ↔ 개별) UI
 * - 허용 키 필터(useAllowed), 제한 배지(DisabledHint)
 */

import React from 'react';
import type {
    CSSDict,
    InspectorFilter,
    TagPolicy,
    TagPolicyMap,
} from '../../../../core/types';
import {
    Label,
    MiniInput,
    ChipBtn,
    DisabledHint,
    IconBtn,
    useAllowed,
    reasonForKey,
    type DisallowReason,
} from './common';
import { coerceLen } from '../../../../runtime/styleUtils';
import { Link as LinkIcon, Link2Off as UnlinkIcon } from 'lucide-react';

export function SpacingGroup(props: {
    el: Record<string, unknown>;
    patch: (css: CSSDict) => void;
    tag: string;
    tagPolicy: TagPolicy | undefined;
    tf: InspectorFilter | undefined;
    map: TagPolicyMap | undefined;
    expert: boolean;
    open: boolean;
    onToggle: () => void;
}) {
    const { el, patch, tag, tagPolicy, tf, map, expert, open, onToggle } = props;

    // 허용 키
    const KEYS = [
        'margin', 'padding',
        'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
        'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    ] as string[];
    const allow = useAllowed(KEYS, tf, tag, map, expert);

    const dis = (k: string): DisallowReason => reasonForKey(k, tagPolicy, tf, expert);

    // 링크(전체 ↔ 개별) 토글
    const [linkMargin, setLinkMargin] = React.useState(true);
    const [linkPadding, setLinkPadding] = React.useState(true);

    const applyMargin = (v: string) => {
        if (linkMargin) {
            patch({ margin: coerceLen(v) });
        } else {
            // 개별 입력 중 "전체" 필드 편집은 4방향 동시 갱신
            patch({
                marginTop: coerceLen(v),
                marginRight: coerceLen(v),
                marginBottom: coerceLen(v),
                marginLeft: coerceLen(v),
            });
        }
    };

    const applyPadding = (v: string) => {
        if (linkPadding) {
            patch({ padding: coerceLen(v) });
        } else {
            patch({
                paddingTop: coerceLen(v),
                paddingRight: coerceLen(v),
                paddingBottom: coerceLen(v),
                paddingLeft: coerceLen(v),
            });
        }
    };

    const presets = ['0', '4', '8', '12', '16', '24'];

    return (
        <section className="mt-3">
            <div
                className="flex items-center justify-between text-xs font-semibold text-neutral-700 cursor-pointer select-none"
                onClick={onToggle}
            >
                <span>{open ? '▾' : '▸'} Spacing</span>
            </div>

            {open && (
                <div className="mt-1 space-y-3">

                    {/* ─ margin ─ */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Label>margin</Label>

                            {/* 링크 토글 */}
                            <IconBtn
                                title={linkMargin ? 'unlink' : 'link all'}
                                onClick={() => setLinkMargin(!linkMargin)}
                            >
                                {linkMargin ? <LinkIcon size={16} /> : <UnlinkIcon size={16} />}
                            </IconBtn>

                            {!allow.has('margin') && !allow.has('marginTop') && <DisabledHint reason={dis('margin')!} />}

                            {/* 전체 입력 */}
                            {(linkMargin ? allow.has('margin') : (allow.has('marginTop') && allow.has('marginRight') && allow.has('marginBottom') && allow.has('marginLeft'))) ? (
                                <MiniInput
                                    value={(el as any).margin ?? ''}
                                    onChange={applyMargin}
                                    placeholder={linkMargin ? 'e.g. 8 | 1rem | 8px 16px' : 'apply all sides'}
                                    className="w-40"
                                />
                            ) : (
                                <span className="text-[11px] text-neutral-400">제한됨</span>
                            )}

                            {/* 프리셋 */}
                            <div className="ml-2 flex gap-1">
                                {presets.map((p) => (
                                    <ChipBtn
                                        key={`m-${p}`}
                                        title={`margin ${p}`}
                                        onClick={() => applyMargin(p)}
                                    >
                                        {p}
                                    </ChipBtn>
                                ))}
                            </div>
                        </div>

                        {/* 개별(고급) */}
                        {!linkMargin && (
                            <div className="pl-24 space-y-1">
                                {([
                                    ['marginTop', 'Top'],
                                    ['marginRight', 'Right'],
                                    ['marginBottom', 'Bottom'],
                                    ['marginLeft', 'Left'],
                                ] as [string, string][]).map(([k, label]) => (
                                    <div key={k} className="flex items-center gap-2">
                                        <Label>{label}</Label>
                                        {!allow.has(k) && <DisabledHint reason={dis(k)!} />}
                                        {allow.has(k) ? (
                                            <MiniInput
                                                value={(el as any)[k]}
                                                onChange={(v) => patch({ [k]: coerceLen(v) })}
                                                placeholder={k}
                                            />
                                        ) : (
                                            <span className="text-[11px] text-neutral-400">제한</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ─ padding ─ */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Label>padding</Label>

                            <IconBtn
                                title={linkPadding ? 'unlink' : 'link all'}
                                onClick={() => setLinkPadding(!linkPadding)}
                            >
                                {linkPadding ? <LinkIcon size={16} /> : <UnlinkIcon size={16} />}
                            </IconBtn>

                            {!allow.has('padding') && !allow.has('paddingTop') && <DisabledHint reason={dis('padding')!} />}

                            {(linkPadding ? allow.has('padding') : (allow.has('paddingTop') && allow.has('paddingRight') && allow.has('paddingBottom') && allow.has('paddingLeft'))) ? (
                                <MiniInput
                                    value={(el as any).padding ?? ''}
                                    onChange={applyPadding}
                                    placeholder={linkPadding ? 'e.g. 8 | 1rem | 8px 16px' : 'apply all sides'}
                                    className="w-40"
                                />
                            ) : (
                                <span className="text-[11px] text-neutral-400">제한됨</span>
                            )}

                            <div className="ml-2 flex gap-1">
                                {presets.map((p) => (
                                    <ChipBtn
                                        key={`p-${p}`}
                                        title={`padding ${p}`}
                                        onClick={() => applyPadding(p)}
                                    >
                                        {p}
                                    </ChipBtn>
                                ))}
                            </div>
                        </div>

                        {!linkPadding && (
                            <div className="pl-24 space-y-1">
                                {([
                                    ['paddingTop', 'Top'],
                                    ['paddingRight', 'Right'],
                                    ['paddingBottom', 'Bottom'],
                                    ['paddingLeft', 'Left'],
                                ] as [string, string][]).map(([k, label]) => (
                                    <div key={k} className="flex items-center gap-2">
                                        <Label>{label}</Label>
                                        {!allow.has(k) && <DisabledHint reason={dis(k)!} />}
                                        {allow.has(k) ? (
                                            <MiniInput
                                                value={(el as any)[k]}
                                                onChange={(v) => patch({ [k]: coerceLen(v) })}
                                                placeholder={k}
                                            />
                                        ) : (
                                            <span className="text-[11px] text-neutral-400">제한</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            )}
        </section>
    );
}