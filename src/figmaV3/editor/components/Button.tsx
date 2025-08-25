'use client';
/**
 * Button: 다양한 태그로 렌더 가능한 버튼
 * - props: as(button|a|div|span), content, href(when as='a')
 * - onClick 이벤트는 Canvas에서 fire('onClick')으로 연결
 */
import React, {JSX} from 'react';
import type { ComponentDefinition, Node, SupportedEvent } from '../../core/types';
import { register } from '../../core/registry';
import { getBoundProps } from '../../runtime/binding';

interface ButtonProps extends Record<string, unknown>{
    as?: 'button' | 'a' | 'div' | 'span';
    content?: string;
    href?: string;
}

export const ButtonDef: ComponentDefinition<ButtonProps> = {
    id: 'button',
    title: 'Button',
    defaults: {
        props: { as: 'button', content: 'Button' },
        styles: { element: { padding: '8px 12px', borderRadius: 6, border: '1px solid #e5e7eb' } },
    },
    propsSchema: [
        { key: 'as', type: 'select', label: 'As', default: 'button',
            options: [
                { label: 'button', value: 'button' },
                { label: 'a', value: 'a' },
                { label: 'div', value: 'div' },
                { label: 'span', value: 'span' },
            ] },
        { key: 'content', type: 'text', label: 'Text', placeholder: 'Button', default: 'Button' },
        { key: 'href', type: 'text', label: 'Href', placeholder: 'https://', when: { as: 'a' } },
    ],
};

export function ButtonRender({ node, fire }: { node: Node<ButtonProps>; fire?: (evt: SupportedEvent) => void }) {
    const p = getBoundProps(node.props, { data: {}, node, project: null });
    const style = (node.styles?.element ?? {}) as React.CSSProperties;
    const Tag = (p.as ?? 'button') as keyof JSX.IntrinsicElements;
    const onClick = fire ? () => fire('onClick') : undefined;
    const content = String(p.content ?? '');
    const href = p.as === 'a' ? (String(p.href ?? '') || undefined) : undefined;

    return <Tag style={style} onClick={onClick} href={href}>{content}</Tag>;
}

// 등록
register(ButtonDef, ButtonRender as any);