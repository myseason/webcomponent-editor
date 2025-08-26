'use client';

import React from 'react';
import type { CSSDict, InspectorFilter, TagPolicy, TagPolicyMap } from '../../../../core/types';
import { useAllowed, Label, MiniInput, DisabledHint, DisallowReason } from './common';

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
        <div className="border-t border-neutral-200 pt-3 mt-3">
            <button type="button" className="w-full text-left text-[12px] uppercase tracking-wide text-neutral-500 mb-2 flex items-center gap-2" onClick={onToggle}>
                <span className="inline-block w-3">{open ? '▾' : '▸'}</span>
                <span>Border</span>
            </button>

            {open && (
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label>border {!allow.has('border') && <DisabledHint reason={dis('border')!} />}</Label>
                        {allow.has('border') ? (
                            <MiniInput value={el.border as string | number | undefined} onChange={(v) => patch({ border: v })} />
                        ) : (
                            <div className="text-[12px] text-neutral-400">제한됨</div>
                        )}
                    </div>
                    <div>
                        <Label>borderRadius {!allow.has('borderRadius') && <DisabledHint reason={dis('borderRadius')!} />}</Label>
                        {allow.has('borderRadius') ? (
                            <MiniInput value={el.borderRadius as string | number | undefined} onChange={(v) => patch({ borderRadius: v })} />
                        ) : (
                            <div className="text-[12px] text-neutral-400">제한됨</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}