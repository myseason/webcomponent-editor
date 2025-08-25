'use client';
/**
 * Image: src/alt 지원. 잘못된 URL은 브라우저 에러로 위임.
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
        styles: { element: { display: 'block', width: 200, height: 120, objectFit: 'cover' } },
    },
    propsSchema: [
        { key: 'src', type: 'text', label: 'Src', placeholder: 'https://...' },
        { key: 'alt', type: 'text', label: 'Alt', placeholder: '설명' },
    ],
};

export function ImageRender({ node }: { node: Node<ImageProps> }) {
    const style = (node.styles?.element ?? {}) as React.CSSProperties;
    const { src, alt } = node.props;
    return <img style={style} src={String(src ?? '')} alt={String(alt ?? '')} />;
}

// 등록
register(ImageDef, ImageRender as any);