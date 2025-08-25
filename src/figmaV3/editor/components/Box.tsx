'use client';
/**
 * Box: 기본 컨테이너 컴포넌트
 * - display:flex, flexDirection:column 의 기본 스타일을 defaults에 반영
 * - children 렌더는 Canvas 쪽에서 처리(재귀 렌더)
 */
import React from 'react';
import type { ComponentDefinition, Node } from '../../core/types';
import { register } from '../../core/registry';

type BoxProps = Record<string, unknown>;
export const BoxDef: ComponentDefinition<BoxProps> = {
    id: 'box',
    title: 'Box',
    defaults: {
        props: {},
        styles: { element: { display: 'flex', flexDirection: 'column' } },
    },
    propsSchema: [],
};

export function BoxRender({ node }: { node: Node }) {
    const style = (node.styles?.element ?? {}) as React.CSSProperties;
    return <div style={style} data-node={node.id} />;
}

// 등록
register(BoxDef, BoxRender as any);