// src/figmaV3/editor/components/Box.tsx
'use client';

import React, {JSX} from 'react';
import type { ComponentDefinition, Node, NodePropsWithMeta } from '../../core/types';
import { register } from '../../core/registry';

type BoxProps = Record<string, unknown>;

export const BoxDef: ComponentDefinition<BoxProps> = {
    id: 'box',
    title: 'Box',
    defaults: {
        props: {},
        styles: {
            element: { display: 'flex', flexDirection: 'column', width: '100%', minHeight: 40 },
        },
    },
    propsSchema: [],
};

export function BoxRender({ node }: { node: Node<BoxProps> }) {
    const p = (node.props as NodePropsWithMeta) ?? {};
    const Tag = (p.__tag as keyof JSX.IntrinsicElements) ?? 'div';
    // ✅ 호스트만 반환 (스타일/선택/자식은 Canvas에서 merge)
    return <Tag />;
}

register(BoxDef, BoxRender);