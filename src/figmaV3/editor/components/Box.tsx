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
            // ✅ [수정] 기본 스타일을 'base' 뷰포트 객체로 감쌌습니다.
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