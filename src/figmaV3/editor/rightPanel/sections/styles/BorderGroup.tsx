'use client';
import React from 'react';
import type { CSSDict, InspectorFilter, TagPolicy, TagPolicyMap } from '../../../../core/types';
import { useAllowed, Label, MiniInput, DisabledHint, type DisallowReason } from './common';

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
    const { el, patch, tag, tf, map, expert, tagPolicy, open, onToggle } = props;
    const allow = useAllowed(['border', 'borderRadius'], tf, tag, map, expert);

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
                <span>{open ? '▾' : '▸'} Border</span>
            </div>

            {open && (
                <div className="mt-1 space-y-2">
                    <div className="flex items-center gap-2">
                        <Label>border</Label>
                        {!allow.has('border') && <DisabledHint reason={dis('border')!} />}
                        {allow.has('border') ? (
                            <MiniInput
                                value={el['border'] as string | number | undefined}
                                onChange={(v) => patch({ border: v })}   // border는 문자열(shorthand) 사용
                                placeholder="1px solid #000"
                            />
                        ) : <span className="text-[11px] text-neutral-400">제한됨</span>}
                    </div>

                    <div className="flex items-center gap-2">
                        <Label>borderRadius</Label>
                        {!allow.has('borderRadius') && <DisabledHint reason={dis('borderRadius')!} />}
                        {allow.has('borderRadius') ? (
                            <MiniInput
                                value={el['borderRadius'] as string | number | undefined}
                                onChange={(v) => patch({ borderRadius: coerceLen(v) })}  // ← 숫자 보정
                                placeholder="8 | 8px"
                            />
                        ) : <span className="text-[11px] text-neutral-400">제한됨</span>}
                    </div>
                </div>
            )}
        </section>
    );
}