'use client';

import React, {JSX} from 'react';
import type { ComponentDefinition, Node, SupportedEvent, NodePropsWithMeta } from '../../core/types';
import { register } from '../../core/registry';
import { getBoundProps } from '../../runtime/binding';

interface ButtonProps extends Record<string, unknown> {
    as?: 'button' | 'a' | 'div' | 'span';
    content?: string;
    href?: string;
}

export const ButtonDef: ComponentDefinition = {
    id: 'button',
    title: 'Button',
    defaults: {
        props: { as: 'button', content: 'Button' },
        styles: {
            // ✅ [수정] 기본 스타일을 'base' 뷰포트 객체로 감쌌습니다.
            element: {
                base: {
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #e5e7eb'
                }
            }
        },
    },
    propsSchema: [
        {
            key: 'as',
            type: 'select',
            label: 'As',
            default: 'button',
            options: [
                { label: 'button', value: 'button' },
                { label: 'a', value: 'a' },
                { label: 'div', value: 'div' },
                { label: 'span', value: 'span' },
            ],
        },
        { key: 'content', type: 'text', label: 'Text', placeholder: 'Button', default: 'Button' },
        { key: 'href', type: 'text', label: 'Href', placeholder: 'https://', when: { as: 'a' } },
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

export function ButtonRender({
                                 node,
                                 fire,
                             }: {
    node: Node;
    fire?: (evt: SupportedEvent) => void;
}) {
    const meta = (node.props as NodePropsWithMeta) ?? {};
    const p = getBoundProps(node.props, { data: {}, node, project: null }) as ButtonProps;
    const Tag = ((meta.__tag as string) || p.as || 'button') as keyof JSX.IntrinsicElements;
    const onClick = fire ? () => fire('onClick') : undefined;
    const content = String(p.content ?? '');
    const attrs = toReactDomAttrs(meta.__tagAttrs as Record<string, unknown> | undefined);

    const domProps: Record<string, unknown> = { ...attrs, onClick };

    if (Tag === 'a' && typeof p.href === 'string' && p.href.trim()) {
        domProps.href = p.href.trim();
    }

    return React.createElement(Tag, domProps, content);
}

register(ButtonDef, ButtonRender as any);