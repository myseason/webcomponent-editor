'use client';

import React from 'react';
import type { CSSDict, InspectorFilter, TagPolicy, TagPolicyMap } from '../../../../core/types';
import { ColorField, Label, MiniInput, ChipBtn, DisabledHint, useAllowed, DisallowReason } from './common';

export function TypographyGroup(props: {
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
    const allow = useAllowed(['color', 'fontSize', 'fontWeight', 'textAlign'], tf, tag, map, expert);

    const dis = (k: string): DisallowReason => {
        if (tagPolicy?.styles?.allow && !tagPolicy.styles.allow.includes(k)) return 'tag';
        if (tagPolicy?.styles?.deny && tagPolicy.styles.deny.includes(k)) return 'tag';
        if (!expert && tf?.styles) {
            if (tf.styles.allow && !tf.styles.allow.includes(k)) return 'template';
            if (tf.styles.deny && tf.styles.deny.includes(k)) return 'template';
        }
        return null;
    };

    const fw = String(el.fontWeight ?? '');
    const ta = String(el.textAlign ?? '');

    return (
        <div className="border-t border-neutral-200 pt-3 mt-3">
            <button type="button" className="w-full text-left text-[12px] uppercase tracking-wide text-neutral-500 mb-2 flex items-center gap-2" onClick={onToggle}>
                <span className="inline-block w-3">{open ? '▾' : '▸'}</span><span>Typography</span>
            </button>

            {open && (
                <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                        <Label>color {!allow.has('color') && <DisabledHint reason={dis('color')!} />}</Label>
                        {allow.has('color') ? (
                            <ColorField value={el.color as string | undefined} onChange={(v) => patch({ color: v })} />
                        ) : <div className="text-[12px] text-neutral-400">제한됨</div>}
                    </div>

                    <div>
                        <Label>fontSize {!allow.has('fontSize') && <DisabledHint reason={dis('fontSize')!} />}</Label>
                        {allow.has('fontSize') ? (
                            <MiniInput value={el.fontSize as string | number | undefined} onChange={(v) => patch({ fontSize: v })} />
                        ) : <div className="text-[12px] text-neutral-400">제한됨</div>}
                    </div>

                    <div>
                        <Label>fontWeight {!allow.has('fontWeight') && <DisabledHint reason={dis('fontWeight')!} />}</Label>
                        {allow.has('fontWeight') ? (
                            <div className="grid grid-cols-2 gap-1">
                                {['400','700'].map((w) => (
                                    <ChipBtn key={w} title={w} onClick={() => patch({ fontWeight: w })} active={fw === w}>
                                        {w === '400' ? 'Regular' : 'Bold'}
                                    </ChipBtn>
                                ))}
                            </div>
                        ) : <div className="text-[12px] text-neutral-400">제한됨</div>}
                    </div>

                    <div>
                        <Label>textAlign {!allow.has('textAlign') && <DisabledHint reason={dis('textAlign')!} />}</Label>
                        {allow.has('textAlign') ? (
                            <div className="grid grid-cols-3 gap-1">
                                {['left','center','right'].map((a) => (
                                    <ChipBtn key={a} title={a} onClick={() => patch({ textAlign: a })} active={ta === a}>{a}</ChipBtn>
                                ))}
                            </div>
                        ) : <div className="text-[12px] text-neutral-400">제한됨</div>}
                    </div>
                </div>
            )}
        </div>
    );
}