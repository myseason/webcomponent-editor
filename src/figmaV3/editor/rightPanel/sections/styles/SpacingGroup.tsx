'use client';

import React from 'react';
import type { CSSDict, InspectorFilter, TagPolicy, TagPolicyMap } from '../../../../core/types';
import { useAllowed, Label, MiniInput, DisabledHint, type DisallowReason } from './common';
import { coerceLen } from '../../../../runtime/styleUtils';

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
        ['marginTop','marginRight','marginBottom','marginLeft','paddingTop','paddingRight','paddingBottom','paddingLeft','marginInline','marginBlock','paddingInline','paddingBlock'],
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
        <section className="mt-3">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 cursor-pointer select-none" onClick={onToggle}>
                <span>{open ? '▾' : '▸'} Margin &amp; Padding</span>
            </div>

            {open && (
                <div className="mt-1 space-y-2">
                    <div className="flex items-center gap-2">
                        <Label>margin</Label>
                        {!allowSimple.has('margin') && <DisabledHint reason={dis('margin')!} />}
                        {allowSimple.has('margin') ? (
                            <MiniInput
                                value={el['margin'] as string | number | undefined}
                                onChange={(v) => patch({ margin: coerceLen(v) })}
                                placeholder="0 | 8 | 8px 16px"
                            />
                        ) : <span className="text-[11px] text-neutral-400">제한됨</span>}
                    </div>

                    <div className="flex items-center gap-2">
                        <Label>padding</Label>
                        {!allowSimple.has('padding') && <DisabledHint reason={dis('padding')!} />}
                        {allowSimple.has('padding') ? (
                            <MiniInput
                                value={el['padding'] as string | number | undefined}
                                onChange={(v) => patch({ padding: coerceLen(v) })}
                                placeholder="0 | 8 | 4px 8px"
                            />
                        ) : <span className="text-[11px] text-neutral-400">제한됨</span>}
                    </div>

                    {expert && (
                        <>
                            <div className="text-[10px] text-neutral-500 pt-1">Advanced</div>

                            <div className="flex items-center gap-2">
                                <Label>margin(T/R/B/L)</Label>
                                {(['marginTop','marginRight','marginBottom','marginLeft'] as const).map((k) => (
                                    <MiniInput
                                        key={k}
                                        value={el[k] as string | number | undefined}
                                        onChange={(v) => patch({ [k]: coerceLen(v) } as CSSDict)}
                                        placeholder={k}
                                        disabled={!allowAdvanced.has(k)}
                                    />
                                ))}
                            </div>

                            <div className="flex items-center gap-2">
                                <Label>padding(T/R/B/L)</Label>
                                {(['paddingTop','paddingRight','paddingBottom','paddingLeft'] as const).map((k) => (
                                    <MiniInput
                                        key={k}
                                        value={el[k] as string | number | undefined}
                                        onChange={(v) => patch({ [k]: coerceLen(v) } as CSSDict)}
                                        placeholder={k}
                                        disabled={!allowAdvanced.has(k)}
                                    />
                                ))}
                            </div>

                            <div className="flex items-center gap-2">
                                <Label>m-Inline / m-Block</Label>
                                <MiniInput
                                    value={el['marginInline'] as string | number | undefined}
                                    onChange={(v) => patch({ marginInline: coerceLen(v) })}
                                    placeholder="marginInline"
                                    disabled={!allowAdvanced.has('marginInline')}
                                />
                                <MiniInput
                                    value={el['marginBlock'] as string | number | undefined}
                                    onChange={(v) => patch({ marginBlock: coerceLen(v) })}
                                    placeholder="marginBlock"
                                    disabled={!allowAdvanced.has('marginBlock')}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Label>p-Inline / p-Block</Label>
                                <MiniInput
                                    value={el['paddingInline'] as string | number | undefined}
                                    onChange={(v) => patch({ paddingInline: coerceLen(v) })}
                                    placeholder="paddingInline"
                                    disabled={!allowAdvanced.has('paddingInline')}
                                />
                                <MiniInput
                                    value={el['paddingBlock'] as string | number | undefined}
                                    onChange={(v) => patch({ paddingBlock: coerceLen(v) })}
                                    placeholder="paddingBlock"
                                    disabled={!allowAdvanced.has('paddingBlock')}
                                />
                            </div>
                        </>
                    )}
                </div>
            )}
        </section>
    );
}