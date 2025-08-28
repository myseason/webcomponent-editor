'use client';

import React, {JSX} from 'react';
import type { ComponentDefinition, Node, NodePropsWithMeta } from '../../core/types';
import { register } from '../../core/registry';
import { getBoundProps } from '../../runtime/binding';

interface TextProps extends Record<string, unknown> {
    content?: string;
}

export const TextDef: ComponentDefinition = {
    id: 'text',
    title: 'Text',
    defaults: {
        props: { content: 'Enter text here' },
        styles: {
            // ✅ [수정] 기본 스타일을 'base' 뷰포트 객체로 감쌌습니다.
            element: {
                base: {
                    fontSize: 14
                }
            }
        }
    },
    propsSchema: [{ key: 'content', type: 'text', label: 'Text', placeholder: 'Enter content' }],
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

export function TextRender({ node }: { node: Node }) {
    const pMeta = (node.props as NodePropsWithMeta) ?? {};
    const Tag = ((pMeta.__tag as string) || 'span') as keyof JSX.IntrinsicElements;

    const p = getBoundProps(node.props, { data: {}, node, project: null }) as TextProps;
    const content = String(p.content ?? '');

    const attrs = toReactDomAttrs(pMeta.__tagAttrs as Record<string, unknown> | undefined);
    return React.createElement(Tag, attrs, content);
}

register(TextDef, TextRender as any);