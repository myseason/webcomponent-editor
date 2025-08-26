'use client';

import React from 'react';
import type { CSSDict, InspectorFilter, TagPolicy, TagPolicyMap } from '../../../../core/types';
import { useAllowed, Label, MiniInput, DisabledHint, DisallowReason } from './common';

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
    const { el, patch, tag, tf, map, expert, tagPolicy, open, onToggle } = props;

    const allowSimple = useAllowed(['margin', 'padding'], tf, tag, map, expert);
    const allowAdvanced = useAllowed(
        [
            'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
            'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
            'marginInline', 'marginBlock', 'paddingInline', 'paddingBlock',
        ],
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

    return (
        <div className="border-t border-neutral-200 pt-3 mt-3">
            <button type="button" className="w-full text-left text-[12px] uppercase tracking-wide text-neutral-500 mb-2 flex items-center gap-2" onClick={onToggle}>
                <span className="inline-block w-3">{open ? '▾' : '▸'}</span>
                <span>Margin & Padding</span>
            </button>

            {open && (
                <>
                    {/* 기본(간단) */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label>margin {!allowSimple.has('margin') && <DisabledHint reason={dis('margin')!} />}</Label>
                            {allowSimple.has('margin') ? (
                                <MiniInput value={el.margin as string | number | undefined} onChange={(v) => patch({ margin: v })} />
                            ) : (
                                <div className="text-[12px] text-neutral-400">제한됨</div>
                            )}
                        </div>
                        <div>
                            <Label>padding {!allowSimple.has('padding') && <DisabledHint reason={dis('padding')!} />}</Label>
                            {allowSimple.has('padding') ? (
                                <MiniInput value={el.padding as string | number | undefined} onChange={(v) => patch({ padding: v })} />
                            ) : (
                                <div className="text-[12px] text-neutral-400">제한됨</div>
                            )}
                        </div>
                    </div>

                    {/* 고급(전문가 모드) — 4방향 + 축 */}
                    {props.expert && (
                        <div className="mt-2 space-y-2">
                            {/* 4방향 */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label>margin(T/R/B/L)</Label>
                                    <div className="grid grid-cols-4 gap-1">
                                        {(['marginTop', 'marginRight', 'marginBottom', 'marginLeft'] as string[]).map((k) => (
                                            <MiniInput key={k} value={el[k] as string | number | undefined} onChange={(v) => patch({ [k]: v } as CSSDict)} />
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <Label>padding(T/R/B/L)</Label>
                                    <div className="grid grid-cols-4 gap-1">
                                        {(['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as string[]).map((k) => (
                                            <MiniInput key={k} value={el[k] as string | number | undefined} onChange={(v) => patch({ [k]: v } as CSSDict)} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 축 단위 */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label>m-Inline / m-Block</Label>
                                    <div className="grid grid-cols-2 gap-1">
                                        <MiniInput value={el.marginInline as string | number | undefined} onChange={(v) => patch({ marginInline: v })} />
                                        <MiniInput value={el.marginBlock as string | number | undefined} onChange={(v) => patch({ marginBlock: v })} />
                                    </div>
                                </div>
                                <div>
                                    <Label>p-Inline / p-Block</Label>
                                    <div className="grid grid-cols-2 gap-1">
                                        <MiniInput value={el.paddingInline as string | number | undefined} onChange={(v) => patch({ paddingInline: v })} />
                                        <MiniInput value={el.paddingBlock as string | number | undefined} onChange={(v) => patch({ paddingBlock: v })} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}