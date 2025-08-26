'use client';
import React from 'react';
import type { CSSDict, InspectorFilter, TagPolicy, TagPolicyMap } from '../../../../core/types';
import { ColorField, ChipBtn, Label, MiniInput, MiniSelect, DisabledHint, useAllowed, DisallowReason } from './common';

type BgMode = 'none' | 'color' | 'image' | 'transparent';

export function BackgroundGroup(props: {
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

    const allow = useAllowed(
        ['backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundRepeat', 'backgroundPosition'],
        tf,
        tag,
        map,
        expert
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

    const mode: BgMode = (() => {
        if (typeof (el as any).backgroundImage === 'string' && String((el as any).backgroundImage).trim() !== '') return 'image';
        if ((el as any).backgroundColor === 'transparent') return 'transparent';
        if (typeof (el as any).backgroundColor === 'string') return 'color';
        return 'none';
    })();

    const setMode = (m: BgMode) => {
        const css: CSSDict = {};
        if (m === 'none') {
            css.backgroundColor = undefined;
            css.backgroundImage = undefined;
        } else if (m === 'color') {
            css.backgroundImage = undefined;
            if (typeof (el as any).backgroundColor !== 'string' || (el as any).backgroundColor === 'transparent') css.backgroundColor = '#ffffff';
        } else if (m === 'image') {
            css.backgroundColor = undefined;
            if (typeof (el as any).backgroundImage !== 'string') css.backgroundImage = 'url("")';
        } else if (m === 'transparent') {
            css.backgroundImage = undefined;
            css.backgroundColor = 'transparent';
        }
        patch(css);
    };

    const [url, setUrl] = React.useState('');
    const applyUrl = () => {
        const v = url.trim();
        if (!v) return;
        patch({ backgroundImage: `url("${v}")` });
        setUrl('');
    };

    const onUpload: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = typeof reader.result === 'string' ? reader.result : '';
            if (dataUrl) patch({ backgroundImage: `url("${dataUrl}")` });
        };
        reader.readAsDataURL(f);
        e.currentTarget.value = '';
    };

    const gradients = [
        { name: 'Sunset', css: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)' },
        { name: 'Ocean', css: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)' },
        { name: 'Midnight', css: 'linear-gradient(135deg, #232526 0%, #414345 100%)' },
        { name: 'Candy', css: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' },
    ] as const;

    return (
        <div>
            {/* 통일된 타이틀 */}
            <div
                className="flex items-center justify-between text-xs font-semibold text-neutral-700 cursor-pointer select-none px-1 py-1 mt-2"
                onClick={onToggle}
            >
                <span>{open ? '▾' : '▸'} Background</span>
            </div>

            {open && (
                <div className="mt-2 space-y-3 px-1">
                    {/* mode */}
                    <div className="flex items-center gap-2">
                        <Label>mode</Label>
                        {(['none', 'color', 'image', 'transparent'] as BgMode[]).map((m) => (
                            <ChipBtn key={m} onClick={() => setMode(m)} active={mode === m} title={m}>
                                {m}
                            </ChipBtn>
                        ))}
                    </div>

                    {/* color */}
                    {mode === 'color' && (
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Label>backgroundColor</Label>
                                {!allow.has('backgroundColor') && <DisabledHint reason={dis('backgroundColor')!} />}
                                {allow.has('backgroundColor') ? (
                                    <>
                                        <ColorField
                                            value={(el as any).backgroundColor as string | undefined}
                                            onChange={(v) => patch({ backgroundColor: v })}
                                        />
                                        <ChipBtn title="clear" onClick={() => patch({ backgroundColor: undefined })}>
                                            Clear
                                        </ChipBtn>
                                    </>
                                ) : (
                                    <span className="text-xs text-neutral-500">제한됨</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* image */}
                    {mode === 'image' && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Label>gradient presets</Label>
                                {gradients.map((g) => (
                                    <ChipBtn
                                        key={g.name}
                                        onClick={() => patch({ backgroundImage: g.css })}
                                        disabled={!allow.has('backgroundImage')}
                                        title={g.name}
                                    >
                                        {g.name}
                                    </ChipBtn>
                                ))}
                                <ChipBtn
                                    title="clear"
                                    onClick={() => patch({ backgroundImage: undefined })}
                                    disabled={!allow.has('backgroundImage')}
                                >
                                    Clear
                                </ChipBtn>
                            </div>

                            <div className="flex items-center gap-2">
                                <Label>URL</Label>
                                {allow.has('backgroundImage') ? (
                                    <>
                                        <MiniInput value={url} onChange={setUrl} placeholder="https://…" />
                                        <ChipBtn title="apply" onClick={applyUrl}>
                                            Apply
                                        </ChipBtn>
                                    </>
                                ) : (
                                    <span className="text-xs text-neutral-500">제한됨</span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <Label>Upload</Label>
                                {allow.has('backgroundImage') ? (
                                    <input type="file" accept="image/*" onChange={onUpload} />
                                ) : (
                                    <span className="text-xs text-neutral-500">제한됨</span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <Label>backgroundSize</Label>
                                {!allow.has('backgroundSize') && <DisabledHint reason={dis('backgroundSize')!} />}
                                {allow.has('backgroundSize') ? (
                                    <MiniInput
                                        value={(el as any).backgroundSize as string | undefined}
                                        onChange={(v) => patch({ backgroundSize: v })}
                                    />
                                ) : (
                                    <span className="text-xs text-neutral-500">제한됨</span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <Label>backgroundRepeat</Label>
                                {!allow.has('backgroundRepeat') && <DisabledHint reason={dis('backgroundRepeat')!} />}
                                {allow.has('backgroundRepeat') ? (
                                    <MiniInput
                                        value={(el as any).backgroundRepeat as string | undefined}
                                        onChange={(v) => patch({ backgroundRepeat: v })}
                                    />
                                ) : (
                                    <span className="text-xs text-neutral-500">제한됨</span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <Label>backgroundPosition</Label>
                                {!allow.has('backgroundPosition') && <DisabledHint reason={dis('backgroundPosition')!} />}
                                {allow.has('backgroundPosition') ? (
                                    <MiniInput
                                        value={(el as any).backgroundPosition as string | undefined}
                                        onChange={(v) => patch({ backgroundPosition: v })}
                                    />
                                ) : (
                                    <span className="text-xs text-neutral-500">제한됨</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}