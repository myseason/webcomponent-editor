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

    // 알려진 키(여기 있는 키는 리스트에서 숨김)
    const KNOWN_KEYS: string[] = [
        'display','overflow','width','height',
        'color','fontSize','fontWeight','textAlign',
        'position','top','left','right','bottom','zIndex','overflowX','overflowY',
        'margin','padding','marginTop','marginRight','marginBottom','marginLeft',
        'paddingTop','paddingRight','paddingBottom','paddingLeft',
        'marginInline','marginBlock','paddingInline','paddingBlock',
        'border','borderWidth','borderStyle','borderColor','borderRadius',
        'backgroundColor','backgroundImage','backgroundSize','backgroundRepeat','backgroundPosition',
        'boxShadow','filter','opacity',
        'flexDirection','justifyContent','alignItems','gap',
        'gridTemplateColumns','gridTemplateRows','gridAutoFlow','rowGap','columnGap',
        'justifyItems','alignContent'
    ];

    const allowAll = new Set(
        useAllowed(
            // Custom은 가능한 폭넓게: el의 기존 키 + KNOWN_KEYS
            Object.keys(el as Record<string, unknown>).concat(KNOWN_KEYS),
            tf,
            tag,
            map,
            expert
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
        <div>
            {/* 통일된 타이틀 */}
            <div
                className="flex items-center justify-between text-xs font-semibold text-neutral-700 cursor-pointer select-none px-1 py-1 mt-2"
                onClick={onToggle}
            >
                <span>{open ? '▾' : '▸'} Custom</span>
            </div>

            {open && (
                <div className="mt-2 space-y-3 px-1">
                    <div className="text-[11px] text-neutral-500">허용된 CSS 키만 추가/편집됩니다. (Template/TagPolicy 반영)</div>

                    {/* 기존 값 나열(알려진 키 제외) */}
                    <div className="space-y-2">
                        {Object.entries(el as Record<string, unknown>)
                            .filter(([key]) => !KNOWN_KEYS.includes(key))
                            .map(([key, val]) => (
                                <div key={key} className="flex items-center gap-2">
                                    <Label>{key}</Label>
                                    {allowAll.has(key) ? (
                                        <MiniInput
                                            value={String(val ?? '')}
                                            onChange={(nv) => patch({ [key]: nv } as CSSDict)}
                                            placeholder={key}
                                        />
                                    ) : (
                                        <>
                                            <DisabledHint reason={dis(key)!} />
                                            <span className="text-xs text-neutral-500">{String(val ?? '')}</span>
                                        </>
                                    )}
                                    <button
                                        className="text-xs text-neutral-500 hover:text-red-600"
                                        title="remove"
                                        onClick={() => patch({ [key]: undefined } as CSSDict)}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                    </div>

                    {/* key/value 추가 입력 */}
                    <div className="flex items-center gap-2">
                        <Label>key</Label>
                        <MiniInput value={k} onChange={setK} placeholder="css-key" />
                        <Label>value</Label>
                        <MiniInput value={v} onChange={setV} placeholder="value" />
                        <button className="px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-xs" onClick={onAdd}>
                            Add
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}