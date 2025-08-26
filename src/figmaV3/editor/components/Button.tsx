'use client';

/**
 * Button: host 요소를 반드시 반환해야 한다.
 * - props: as(button|a|div|span), content, href(when as='a')
 * - onClick → fire('onClick')
 */

import React, {JSX} from 'react';
import type { ComponentDefinition, Node, SupportedEvent } from '../../core/types';
import { register } from '../../core/registry';
import { getBoundProps } from '../../runtime/binding';

interface ButtonProps extends Record<string, unknown> {
    as?: 'button' | 'a' | 'div' | 'span';
    content?: string;
    href?: string;
}

export const ButtonDef: ComponentDefinition<ButtonProps> = {
    id: 'button',
    title: 'Button',
    defaults: {
        props: { as: 'button', content: 'Button' },
        styles: {
            element: { padding: '8px 12px', borderRadius: 6, border: '1px solid #e5e7eb' },
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

export function ButtonRender({
                                 node,
                                 fire,
                             }: {
    node: Node<ButtonProps>;
    fire?: (evt: SupportedEvent) => void;
}) {
    const p = getBoundProps(node.props, { data: {}, node, project: null }) as ButtonProps;

    const Tag = (p.as ?? 'button') as keyof JSX.IntrinsicElements;
    const onClick = fire ? () => fire('onClick') : undefined;
    const content = String(p.content ?? '');
    const href = p.as === 'a' ? (String(p.href ?? '') || undefined) : undefined;

    // ✅ 반드시 실제 DOM 요소 반환
    return (
        <Tag onClick={onClick} href={href}>
            {content}
        </Tag>
    );
}

// 등록
register(ButtonDef, ButtonRender as any);