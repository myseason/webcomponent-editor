'use client';

/**
 * Image
 * - src === "" → undefined 로 치환하여 브라우저 경고 방지
 * - host 요소(IMG)를 반드시 반환
 */

import React from 'react';
import type { ComponentDefinition, Node } from '../../core/types';
import { register } from '../../core/registry';

interface ImageProps extends Record<string, unknown> {
    src?: string;
    alt?: string;
}

export const ImageDef: ComponentDefinition<ImageProps> = {
    id: 'image',
    title: 'Image',
    defaults: {
        props: { src: '', alt: '' },
        styles: {
            element: { display: 'block', width: 200, height: 120, objectFit: 'cover' },
        },
    },
    propsSchema: [
        { key: 'src', type: 'text', label: 'Src', placeholder: 'https://...' },
        { key: 'alt', type: 'text', label: 'Alt', placeholder: '설명' },
    ],
};

export function ImageRender({ node }: { node: Node<ImageProps> }) {
    const rawSrc = (node.props as Record<string, unknown>).src;
    const rawAlt = (node.props as Record<string, unknown>).alt;

    const src = typeof rawSrc === 'string' && rawSrc.trim().length > 0 ? rawSrc : undefined;
    const alt = typeof rawAlt === 'string' ? rawAlt : undefined;

    // ✅ IMG 반환
    return <img src={src} alt={alt} />;
}

// 등록
register(ImageDef, ImageRender as any);