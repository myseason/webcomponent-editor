'use client';
import React from 'react';
import type { CSSDict, InspectorFilter, TagPolicy, TagPolicyMap } from '../../../../core/types';
import { useAllowed, Label, MiniInput, MiniSelect, DisabledHint, type DisallowReason } from './common';

import { coerceLen } from '../../../../runtime/styleUtils';

export function PositionGroup(props: {
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

    const allow = useAllowed(['position','top','left','right','bottom','zIndex'], tf, tag, map, expert);

    const dis = (k: string): DisallowReason => {
        if (tagPolicy?.styles?.allow && !tagPolicy.styles.allow.includes(k)) return 'tag';
        if (tagPolicy?.styles?.deny && tagPolicy.styles.deny.includes(k)) return 'tag';
        if (!expert && tf?.styles) {
            if (tf.styles.allow && !tf.styles.allow.includes(k)) return 'template';
            if (tf.styles.deny && tf.styles.deny.includes(k)) return 'template';
        }
        return null;
    };

    const pos = (el['position'] as string) ?? 'static';
    const isStatic = pos === 'static';

    return (
        <section className="mt-3">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 cursor-pointer select-none" onClick={onToggle}>
                <span>{open ? '▾' : '▸'} Position</span>
            </div>

            {open && (
                <>
                    <div className="flex items-center gap-2 mt-1">
                        <Label>position</Label>
                        {!allow.has('position') && <DisabledHint reason={dis('position')!} />}
                        {allow.has('position') ? (
                            <MiniSelect
                                value={pos}
                                options={['static', 'relative', 'absolute', 'fixed', 'sticky']}
                                onChange={(v) => patch({ position: v })}
                            />
                        ) : <span className="text-[11px] text-neutral-400">제한됨</span>}

                        <Label>zIndex</Label>
                        {!allow.has('zIndex') && <DisabledHint reason={dis('zIndex')!} />}
                        {allow.has('zIndex') ? (
                            <MiniInput
                                value={el['zIndex'] as string | number | undefined}
                                onChange={(v) => {
                                    const n = typeof v === 'number' ? v : Number(String(v));
                                    patch({ zIndex: Number.isFinite(n) ? n : undefined });
                                }}
                                placeholder="0"
                            />
                        ) : <span className="text-[11px] text-neutral-400">제한됨</span>}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                        <Label>offset</Label>
                        {(['top','right','bottom','left'] as const).map((k) => (
                            <div key={k} className="flex items-center gap-1">
                                {!allow.has(k) && <DisabledHint reason={dis(k)!} />}
                                {allow.has(k) ? (
                                    <MiniInput
                                        value={el[k] as string | number | undefined}
                                        onChange={(v) => patch({ [k]: isStatic ? undefined : coerceLen(v) })}
                                        placeholder={k}
                                        disabled={isStatic}
                                    />
                                ) : <span className="text-[11px] text-neutral-400">제한</span>}
                            </div>
                        ))}
                    </div>

                    {isStatic && <div className="text-[11px] text-neutral-500 mt-1">position:static에서는 offset을 설정할 수 없습니다.</div>}
                </>
            )}
        </section>
    );
}