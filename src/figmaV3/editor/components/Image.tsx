'use client';

import React, {JSX} from 'react';
import type { ComponentDefinition, Node, NodePropsWithMeta } from '../../core/types';
import { register } from '../../core/registry';

interface ImageProps extends Record<string, unknown> {
    src?: string;
    alt?: string;
}

export const ImageDef: ComponentDefinition = {
    id: 'image',
    title: 'Image',
    defaults: {
        props: { src: '', alt: '' },
        styles: {
            // ✅ [수정] 기본 스타일을 'base' 뷰포트 객체로 감쌌습니다.
            element: {
                base: {
                    display: 'block',
                    width: 200,
                    height: 120,
                    objectFit: 'cover'
                }
            }
        },
    },
    propsSchema: [
        { key: 'src', type: 'text', label: 'Src', placeholder: 'https://...' },
        { key: 'alt', type: 'text', label: 'Alt', placeholder: 'Image description' },
    ],
};

function toReactDomAttrs(raw?: Record<string, unknown>): Record<string, unknown> {
    if (!raw) return {};
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
        if (k === 'class') out.className = v;
        else if (k === 'for') out.htmlFor = v;
        else if (k === 'readonly') out.readOnly = v;
        else if (k === 'tabindex') out.tabIndex = v as number;
        else out[k] = v;
    }
    return out;
}

export function ImageRender({ node }: { node: Node }) {
    const p = (node.props as NodePropsWithMeta) ?? {};
    const Tag = ((p.__tag as string) || 'img') as keyof JSX.IntrinsicElements;

    const srcRaw = (node.props as Record<string, unknown>).src;
    const altRaw = (node.props as Record<string, unknown>).alt;
    const src = typeof srcRaw === 'string' && srcRaw.trim() ? srcRaw.trim() : undefined;
    const alt = typeof altRaw === 'string' ? altRaw : undefined;

    const attrs = toReactDomAttrs(p.__tagAttrs as Record<string, unknown> | undefined);

    return React.createElement(Tag, { ...attrs, src, alt });
}

register(ImageDef, ImageRender as any);