'use client';

import React, { JSX } from 'react';
import type { ComponentDefinition, Node, NodePropsWithMeta } from '../../core/types';
import { register } from '../../core/registry';

type BoxProps = Record<string, unknown>;

export const BoxDef: ComponentDefinition = {
    id: 'box',
    title: 'Box',
    defaults: {
        props: {},
        styles: {
            element: {
                base: {
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    minHeight: 40
                }
            },
        },
    },
    propsSchema: [],
    // ✅ [수정] capabilities 속성을 추가하여 컨테이너임을 명시합니다.
    capabilities: {
        canHaveChildren: true,
        defaultTag: 'div',
        allowedTags: ['div', 'section', 'article', 'nav', 'header', 'footer', 'form'],
    },
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

export function BoxRender({ node }: { node: Node }) {
    const p = (node.props as NodePropsWithMeta) ?? {};
    const Tag = ((p.__tag as string) || 'div') as keyof JSX.IntrinsicElements;

    const attrs = toReactDomAttrs(p.__tagAttrs as Record<string, unknown> | undefined);
    return React.createElement(Tag, attrs);
}

register(BoxDef, BoxRender);