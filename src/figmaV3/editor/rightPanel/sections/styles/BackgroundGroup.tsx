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

    const mode: BgMode = (() => {
        if (typeof el.backgroundImage === 'string' && el.backgroundImage.trim() !== '') return 'image';
        if (el.backgroundColor === 'transparent') return 'transparent';
        if (typeof el.backgroundColor === 'string') return 'color';
        return 'none';
    })();

    const setMode = (m: BgMode) => {
        const css: CSSDict = {};
        if (m === 'none') {
            css.backgroundColor = undefined; css.backgroundImage = undefined;
        } else if (m === 'color') {
            css.backgroundImage = undefined;
            if (typeof el.backgroundColor !== 'string' || el.backgroundColor === 'transparent') css.backgroundColor = '#ffffff';
        } else if (m === 'image') {
            css.backgroundColor = undefined;
            if (typeof el.backgroundImage !== 'string') css.backgroundImage = 'url("")';
        } else if (m === 'transparent') {
            css.backgroundImage = undefined; css.backgroundColor = 'transparent';
        }
        patch(css);
    };

    const [url, setUrl] = React.useState('');
    const applyUrl = () => {
        const v = url.trim();
        if (!v) return;
        patch({ backgroundImage: `url("${v}")` }); setUrl('');
    };

    const onUpload: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        const f = e.target.files?.[0]; if (!f) return;
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
        <div className="border-t border-neutral-200 pt-3 mt-3">
            <button type="button" className="w-full text-left text-[12px] uppercase tracking-wide text-neutral-500 mb-2 flex items-center gap-2" onClick={onToggle}>
                <span className="inline-block w-3">{open ? '▾' : '▸'}</span><span>Background</span>
            </button>

            {open && (
                <div className="space-y-2">
                    {/* mode (active 표시) */}
                    <div>
                        <Label>mode</Label>
                        <div className="flex items-center gap-1 flex-wrap">
                            {(['none', 'color', 'image', 'transparent'] as BgMode[]).map((m) => (
                                <ChipBtn key={m} title={m} onClick={() => setMode(m)} active={mode === m}>{m}</ChipBtn>
                            ))}
                        </div>
                    </div>

                    {/* color */}
                    {mode === 'color' && (
                        <div>
                            <Label>backgroundColor {!allow.has('backgroundColor') && <DisabledHint reason={dis('backgroundColor')!} />}</Label>
                            {allow.has('backgroundColor') ? (
                                <div className="flex items-center gap-2">
                                    <ColorField value={el.backgroundColor as string | undefined} onChange={(v) => patch({ backgroundColor: v })} />
                                    <button type="button" className="px-2 py-1 border rounded text-[12px]" onClick={() => patch({ backgroundColor: undefined })}>Clear</button>
                                </div>
                            ) : <div className="text-[12px] text-neutral-400">제한됨</div>}
                        </div>
                    )}

                    {/* image */}
                    {mode === 'image' && (
                        <div className="space-y-2">
                            <div>
                                <Label>gradient presets</Label>
                                <div className="flex items-center gap-1 flex-wrap">
                                    {gradients.map((g) => (
                                        <ChipBtn key={g.name} title={g.name} onClick={() => patch({ backgroundImage: g.css })} disabled={!allow.has('backgroundImage')}>
                                            {g.name}
                                        </ChipBtn>
                                    ))}
                                    <button type="button" className="px-2 py-1 border rounded text-[12px]" onClick={() => patch({ backgroundImage: undefined })} disabled={!allow.has('backgroundImage')}>Clear</button>
                                </div>
                            </div>

                            <div>
                                <Label>URL</Label>
                                {allow.has('backgroundImage') ? (
                                    <div className="flex items-center gap-2">
                                        <MiniInput value={url} onChange={setUrl} placeholder="https://… or data:image/…" />
                                        <button type="button" className="px-2 py-1 border rounded text-[12px]" onClick={applyUrl}>Apply</button>
                                    </div>
                                ) : <div className="text-[12px] text-neutral-400">제한됨</div>}
                            </div>

                            <div>
                                <Label>Upload</Label>
                                {allow.has('backgroundImage') ? (
                                    <input className="block w-full text-[12px]" type="file" accept="image/*" onChange={onUpload} />
                                ) : <div className="text-[12px] text-neutral-400">제한됨</div>}
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <Label>backgroundSize {!allow.has('backgroundSize') && <DisabledHint reason={dis('backgroundSize')!} />}</Label>
                                    {allow.has('backgroundSize') ? (
                                        <MiniSelect value={el.backgroundSize as string | undefined} options={['cover','contain','auto']} onChange={(v) => patch({ backgroundSize: v })} />
                                    ) : <div className="text-[12px] text-neutral-400">제한됨</div>}
                                </div>
                                <div>
                                    <Label>backgroundRepeat {!allow.has('backgroundRepeat') && <DisabledHint reason={dis('backgroundRepeat')!} />}</Label>
                                    {allow.has('backgroundRepeat') ? (
                                        <MiniSelect value={el.backgroundRepeat as string | undefined} options={['no-repeat','repeat','repeat-x','repeat-y']} onChange={(v) => patch({ backgroundRepeat: v })} />
                                    ) : <div className="text-[12px] text-neutral-400">제한됨</div>}
                                </div>
                                <div>
                                    <Label>backgroundPosition {!allow.has('backgroundPosition') && <DisabledHint reason={dis('backgroundPosition')!} />}</Label>
                                    {allow.has('backgroundPosition') ? (
                                        <MiniSelect value={el.backgroundPosition as string | undefined} options={['left top','center center','right bottom']} onChange={(v) => patch({ backgroundPosition: v })} />
                                    ) : <div className="text-[12px] text-neutral-400">제한됨</div>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}