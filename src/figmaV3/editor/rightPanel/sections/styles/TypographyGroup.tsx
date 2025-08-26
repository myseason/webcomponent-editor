'use client';

/**
 * TypographyGroup
 * - 레포 표준 인터페이스(el/patch/tag/tagPolicy/tf/map/expert/open/onToggle)
 * - 허용 키 필터: useAllowed
 * - 제한 시 배지: DisabledHint
 * - lucide 아이콘은(원본 기준) 본 그룹에서는 사용하지 않음 — LayoutGroup에서 아이콘 사용
 */

import React from 'react';
import type {
    CSSDict,
    InspectorFilter,
    TagPolicy,
    TagPolicyMap,
} from '../../../../core/types';
import {
    ColorField,
    Label,
    MiniInput,
    ChipBtn,
    DisabledHint,
    useAllowed,
    type DisallowReason,
} from './common';

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

    // 허용 키(원본과 동일)
    const allow = useAllowed(
        ['color', 'fontSize', 'fontWeight', 'textAlign'],
        tf,
        tag,
        map,
        expert
    );

    // 제한 사유 계산(원본과 동일한 로직)
    const dis = (k: string): DisallowReason => {
        if (tagPolicy?.styles?.allow && !tagPolicy.styles.allow.includes(k)) return 'tag';
        if (tagPolicy?.styles?.deny && tagPolicy.styles.deny.includes(k)) return 'tag';
        if (!expert && tf?.styles) {
            if (tf.styles.allow && !tf.styles.allow.includes(k)) return 'template';
            if (tf.styles.deny && tf.styles.deny.includes(k)) return 'template';
        }
        return null;
    };

    const fw = String((el as any).fontWeight ?? '');
    const ta = String((el as any).textAlign ?? '');

    return (
        <section className="mt-3">
            <div
                className="flex items-center justify-between text-xs font-semibold text-neutral-700 cursor-pointer select-none"
                onClick={onToggle}
            >
                <span>{open ? '▾' : '▸'} Typography</span>
            </div>

            {open && (
                <div className="mt-1 space-y-2">
                    {/* color */}
                    <div className="flex items-center gap-2">
                        <Label>color</Label>
                        {!allow.has('color') && <DisabledHint reason={dis('color')!} />}
                        {allow.has('color') ? (
                            <ColorField
                                value={(el as any)['color'] as string | undefined}
                                onChange={(v) => patch({ color: v })}
                            />
                        ) : (
                            <span className="text-[11px] text-neutral-400">제한됨</span>
                        )}
                    </div>

                    {/* fontSize */}
                    <div className="flex items-center gap-2">
                        <Label>fontSize</Label>
                        {!allow.has('fontSize') && <DisabledHint reason={dis('fontSize')!} />}
                        {allow.has('fontSize') ? (
                            <MiniInput
                                value={(el as any)['fontSize'] as string | number | undefined}
                                onChange={(v) => patch({ fontSize: v })}
                                placeholder="14 | 14px | 1rem"
                            />
                        ) : (
                            <span className="text-[11px] text-neutral-400">제한됨</span>
                        )}
                    </div>

                    {/* fontWeight(레포 그대로: Regular/Bold Chip) */}
                    <div className="flex items-center gap-2">
                        <Label>fontWeight</Label>
                        {!allow.has('fontWeight') && <DisabledHint reason={dis('fontWeight')!} />}
                        {allow.has('fontWeight') ? (
                            <div className="flex gap-1">
                                {(['400', '700'] as const).map((w) => (
                                    <ChipBtn
                                        key={w}
                                        title={w === '400' ? 'Regular' : 'Bold'}
                                        onClick={() => patch({ fontWeight: w })}
                                        active={fw === w}
                                    >
                                        {w === '400' ? 'Regular' : 'Bold'}
                                    </ChipBtn>
                                ))}
                            </div>
                        ) : (
                            <span className="text-[11px] text-neutral-400">제한됨</span>
                        )}
                    </div>

                    {/* textAlign(레포 그대로: left/center/right Chip) */}
                    <div className="flex items-center gap-2">
                        <Label>textAlign</Label>
                        {!allow.has('textAlign') && <DisabledHint reason={dis('textAlign')!} />}
                        {allow.has('textAlign') ? (
                            <div className="flex gap-1">
                                {(['left', 'center', 'right'] as const).map((a) => (
                                    <ChipBtn
                                        key={a}
                                        title={a}
                                        onClick={() => patch({ textAlign: a })}
                                        active={ta === a}
                                    >
                                        {a}
                                    </ChipBtn>
                                ))}
                            </div>
                        ) : (
                            <span className="text-[11px] text-neutral-400">제한됨</span>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}