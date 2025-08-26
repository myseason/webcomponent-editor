'use client';

import React from 'react';
import type { CSSDict, InspectorFilter, TagPolicy, TagPolicyMap } from '../../../../core/types';
import { Label, MiniInput, DisabledHint, useAllowed, DisallowReason } from './common';

export function CustomGroup(props: {
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

    // 기존 알려진 키 집합 (여기 나열된 키는 Custom 리스트에서 숨김)
    const KNOWN_KEYS: string[] = [
        'display', 'overflow', 'width', 'height',
        'color', 'fontSize', 'fontWeight', 'textAlign',
        'position', 'top', 'left', 'right', 'bottom',
        'margin', 'padding',
        'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
        'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
        'marginInline', 'marginBlock', 'paddingInline', 'paddingBlock',
        'border', 'borderRadius',
        'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundRepeat', 'backgroundPosition',
        'boxShadow', 'filter', 'opacity',
        'flexDirection', 'justifyContent', 'alignItems', 'gap',
        'gridTemplateColumns', 'gridTemplateRows', 'gridAutoFlow',
        'rowGap', 'columnGap', 'justifyItems', 'alignItems', 'justifyContent', 'alignContent',
    ];

    const allowAll = new Set(
        useAllowed(
            // Custom은 가능한 폭넓게 허용: el에 이미 존재하는 키 + 입력한 키
            Object.keys(el as Record<string, unknown>).concat(KNOWN_KEYS),
            tf, tag, map, expert
        )
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

    const [k, setK] = React.useState('');
    const [v, setV] = React.useState('');

    const onAdd = () => {
        const key = k.trim();
        if (!key) return;
        const reason = dis(key);
        if (reason) {
            alert(`'${key}' 사용 불가: ${reason === 'tag' ? 'TagPolicy' : 'Template 제한'}`);
            return;
        }
        patch({ [key]: v } as CSSDict);
        setK('');
        setV('');
    };

    return (
        <div className="border-t border-neutral-200 pt-3 mt-3">
            <button type="button" className="w-full text-left text-[12px] uppercase tracking-wide text-neutral-500 mb-2 flex items-center gap-2" onClick={onToggle}>
                <span className="inline-block w-3">{open ? '▾' : '▸'}</span>
                <span>Custom</span>
            </button>

            {open && (
                <>
                    <div className="text-[12px] text-neutral-500 mb-1">
                        허용된 CSS 키만 추가/편집됩니다. (템플릿/TagPolicy 반영)
                    </div>

                    {/* 기존 값 나열(알려진 키 제외) */}
                    <div className="space-y-1">
                        {Object.entries(el as Record<string, unknown>)
                            .filter(([key]) => !KNOWN_KEYS.includes(key))
                            .map(([key, val]) => (
                                <div key={key} className="flex items-center gap-2">
                                    <div className="w-40 text-[12px]">{key}</div>
                                    {allowAll.has(key) ? (
                                        <MiniInput value={val as string | number | undefined} onChange={(nv) => patch({ [key]: nv } as CSSDict)} />
                                    ) : (
                                        <div className="text-[12px] text-neutral-400 flex items-center">
                                            <span className="mr-2">{String(val ?? '')}</span>
                                            <DisabledHint reason={dis(key)!} />
                                        </div>
                                    )}
                                    <button type="button" className="px-2 py-1 border rounded text-[12px]" onClick={() => patch({ [key]: undefined } as CSSDict)}>
                                        ✕
                                    </button>
                                </div>
                            ))}
                    </div>

                    {/* key/value 추가 입력 */}
                    <div className="mt-2 grid grid-cols-5 gap-2 items-center">
                        <Label>key</Label>
                        <input className="col-span-1 px-2 py-1 border rounded text-[12px]" value={k} onChange={(e) => setK(e.target.value)} placeholder="css-key" />
                        <Label>value</Label>
                        <input className="col-span-2 px-2 py-1 border rounded text-[12px]" value={v} onChange={(e) => setV(e.target.value)} placeholder="value" />
                        <button type="button" className="px-2 py-1 border rounded text-[12px]" onClick={onAdd}>
                            Add
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}