'use client';

/**
 * Text
 * - host 요소(SPAN)를 반드시 반환
 * - content는 머스태시 바인딩 지원
 */

import React from 'react';
import type { ComponentDefinition, Node } from '../../core/types';
import { register } from '../../core/registry';
import { getBoundProps } from '../../runtime/binding';

interface TextProps extends Record<string, unknown> {
    content?: string;
}

export const TextDef: ComponentDefinition<TextProps> = {
    id: 'text',
    title: 'Text',
    defaults: {
        props: { content: '텍스트' },
        styles: { element: { fontSize: 14 } },
    },
    propsSchema: [{ key: 'content', type: 'text', label: 'Text', placeholder: '내용을 입력' }],
};

export function TextRender({ node }: { node: Node<TextProps> }) {
    const p = getBoundProps(node.props, { data: {}, node, project: null }) as TextProps;
    const content = String(p.content ?? '');
    // ✅ SPAN 반환
    return <span>{content}</span>;
}

// 등록
register(TextDef, TextRender as any);