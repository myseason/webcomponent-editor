'use client';
/**
 * BorderGroup v2
 * - border: width/style/color (기본)
 * - radius: 전체 + (전문가) 개별 모서리
 * - (전문가) outline: width/style/color
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
    MiniSelect,
    ColorField,
    ChipBtn,
    DisabledHint,
    useAllowed,
    reasonForKey,
    type DisallowReason,
} from './common';
import { coerceLen } from '../../../../runtime/styleUtils';

export function BorderGroup(props: {
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
        'borderWidth', 'borderStyle', 'borderColor',
        'borderRadius',
        'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius',
        'outlineWidth', 'outlineStyle', 'outlineColor',
    ] as string[];
    const allow = useAllowed(KEYS, tf, tag, map, expert);
    const dis = (k: string): DisallowReason => reasonForKey(k, tagPolicy, tf, expert);

    const borderStyles = ['none', 'solid', 'dashed', 'dotted', 'double'];

    // 전문가 모드: 모서리 개별 입력 보이기 토글
    const [corners, setCorners] = React.useState(false);

    return (
        <section className="mt-3">
            <div
                className="flex items-center justify-between text-xs font-semibold text-neutral-700 cursor-pointer select-none"
                onClick={onToggle}
            >
                <span>{open ? '▾' : '▸'} Border</span>
            </div>

            {open && (
                <div className="mt-1 space-y-3">

                    {/* width/style/color */}
                    <div className="flex items-center gap-2">
                        <Label>width / style / color</Label>

                        {!allow.has('borderWidth') && <DisabledHint reason={dis('borderWidth')!} />}
                        {allow.has('borderWidth') ? (
                            <MiniInput
                                value={(el as any).borderWidth}
                                onChange={(v) => patch({ borderWidth: coerceLen(v) })}
                                placeholder="1 | 1px"
                            />
                        ) : <span className="text-[11px] text-neutral-400">제한</span>}

                        {!allow.has('borderStyle') && <DisabledHint reason={dis('borderStyle')!} />}
                        {allow.has('borderStyle') ? (
                            <MiniSelect
                                value={(el as any).borderStyle as string | undefined}
                                options={borderStyles}
                                onChange={(v) => patch({ borderStyle: v })}
                            />
                        ) : <span className="text-[11px] text-neutral-400">제한</span>}

                        {!allow.has('borderColor') && <DisabledHint reason={dis('borderColor')!} />}
                        {allow.has('borderColor') ? (
                            <ColorField
                                value={(el as any).borderColor as string | undefined}
                                onChange={(v) => patch({ borderColor: v })}
                            />
                        ) : <span className="text-[11px] text-neutral-400">제한</span>}
                    </div>

                    {/* radius: 전체 + 프리셋 */}
                    <div className="flex items-center gap-2">
                        <Label>radius</Label>
                        {!allow.has('borderRadius') && <DisabledHint reason={dis('borderRadius')!} />}
                        {allow.has('borderRadius') ? (
                            <>
                                <MiniInput
                                    value={(el as any).borderRadius}
                                    onChange={(v) => patch({ borderRadius: coerceLen(v) })}
                                    placeholder="0 | 4 | 8 | 12"
                                />
                                <div className="flex gap-1">
                                    {[0, 4, 8, 12, 16, 24].map((n) => (
                                        <ChipBtn
                                            key={n}
                                            title={`${n}`}
                                            onClick={() => patch({ borderRadius: n })}
                                            active={(el as any).borderRadius === n}
                                        >
                                            {n}
                                        </ChipBtn>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <span className="text-[11px] text-neutral-400">제한</span>
                        )}

                        {/* 전문가: 모서리 개별 */}
                        {expert && (
                            <ChipBtn
                                title={corners ? 'All corners' : 'Per-corner'}
                                onClick={() => setCorners(!corners)}
                                active={corners}
                            >
                                {corners ? 'Per-corner' : 'All corners'}
                            </ChipBtn>
                        )}
                    </div>

                    {/* 모서리 개별(전문가) */}
                    {expert && corners && (
                        <div className="pl-24 grid grid-cols-2 gap-2">
                            {([
                                ['borderTopLeftRadius', 'Top-Left'],
                                ['borderTopRightRadius', 'Top-Right'],
                                ['borderBottomRightRadius', 'Bottom-Right'],
                                ['borderBottomLeftRadius', 'Bottom-Left'],
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

                    {/* outline(전문가) */}
                    {expert && (
                        <div className="flex items-center gap-2">
                            <Label>outline</Label>

                            {!allow.has('outlineWidth') && <DisabledHint reason={dis('outlineWidth')!} />}
                            {allow.has('outlineWidth') ? (
                                <MiniInput
                                    value={(el as any).outlineWidth}
                                    onChange={(v) => patch({ outlineWidth: coerceLen(v) })}
                                    placeholder="1 | 1px"
                                />
                            ) : <span className="text-[11px] text-neutral-400">제한</span>}

                            {!allow.has('outlineStyle') && <DisabledHint reason={dis('outlineStyle')!} />}
                            {allow.has('outlineStyle') ? (
                                <MiniSelect
                                    value={(el as any).outlineStyle as string | undefined}
                                    options={borderStyles}
                                    onChange={(v) => patch({ outlineStyle: v })}
                                />
                            ) : <span className="text-[11px] text-neutral-400">제한</span>}

                            {!allow.has('outlineColor') && <DisabledHint reason={dis('outlineColor')!} />}
                            {allow.has('outlineColor') ? (
                                <ColorField
                                    value={(el as any).outlineColor as string | undefined}
                                    onChange={(v) => patch({ outlineColor: v })}
                                />
                            ) : <span className="text-[11px] text-neutral-400">제한</span>}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}