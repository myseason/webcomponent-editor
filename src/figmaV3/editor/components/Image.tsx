'use client';

/**
 * Image
 * - src가 빈 문자열("")이면 undefined로 치환하여 브라우저의 재요청 경고 방지
 * - 스타일은 node.styles.element를 그대로 host(img)에 적용
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
    const style = (node.styles?.element ?? {}) as React.CSSProperties;
    const rawSrc = (node.props as Record<string, unknown>).src;
    const rawAlt = (node.props as Record<string, unknown>).alt;

    // "" → undefined 로 치환
    const src = typeof rawSrc === 'string' && rawSrc.trim().length > 0 ? rawSrc : undefined;
    const alt = typeof rawAlt === 'string' ? rawAlt : undefined;

    return <img style={style} src={src} alt={alt} />;
}

register(ImageDef, ImageRender);