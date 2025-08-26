'use client';

import React from 'react';
import type { CSSDict, InspectorFilter, TagPolicy, TagPolicyMap } from '../../../../core/types';
import { useAllowed, Label, MiniInput, MiniSelect, DisabledHint, DisallowReason } from './common';

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
    const allow = useAllowed(['position', 'top', 'left', 'right', 'bottom'], tf, tag, map, expert);

    const dis = (k: string): DisallowReason => {
        if (tagPolicy?.styles?.allow && !tagPolicy.styles.allow.includes(k)) return 'tag';
        if (tagPolicy?.styles?.deny && tagPolicy.styles.deny.includes(k)) return 'tag';
        if (!expert && tf?.styles) {
            if (tf.styles.allow && !tf.styles.allow.includes(k)) return 'template';
            if (tf.styles.deny && tf.styles.deny.includes(k)) return 'template';
        }
        return null;
    };

    const pos = (el.position as string) ?? 'static';
    const isStatic = pos === 'static';

    return (
        <div className="border-t border-neutral-200 pt-3 mt-3">
            <button type="button" className="w-full text-left text-[12px] uppercase tracking-wide text-neutral-500 mb-2 flex items-center gap-2" onClick={onToggle}>
                <span className="inline-block w-3">{open ? '▾' : '▸'}</span>
                <span>Position</span>
            </button>

            {open && (
                <>
                    <div>
                        <Label>
                            position {!allow.has('position') && <DisabledHint reason={dis('position')!} />}
                        </Label>
                    </div>
                    {allow.has('position') ? (
                        <MiniSelect
                            value={el.position as string | undefined}
                            options={['static', 'relative', 'absolute', 'fixed', 'sticky']}
                            onChange={(v) => patch({ position: v })}
                        />
                    ) : (
                        <div className="text-[12px] text-neutral-400">제한됨</div>
                    )}

                    {!isStatic ? (
                        <div className="grid grid-cols-4 gap-2">
                            {(['top', 'left', 'right', 'bottom'] as string[]).map((k) => (
                                <div key={k}>
                                    <Label>{k}</Label>
                                    <MiniInput value={el[k] as string | number | undefined} onChange={(v) => patch({ [k]: v } as CSSDict)} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-[12px] text-neutral-400">position:static에서는 offset을 설정할 수 없습니다.</div>
                    )}
                </>
            )}
        </div>
    );
}