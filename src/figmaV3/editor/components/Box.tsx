'use client';

/**
 * Box: 컨테이너 컴포넌트
 * - host 요소(Tag)에 스타일 적용
 * - 원하는 위치에서 renderChildren(slot?) 호출하여 자식 배치
 */

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
            element: { display: 'flex', flexDirection: 'column', width: 320, minHeight: 40 },
        },
    },
    propsSchema: [],
};

export function BoxRender({
                              node,
                              renderChildren,
                          }: {
    node: Node<BoxProps>;
    renderChildren?: (slotId?: string) => React.ReactNode;
}) {
    const style = (node.styles?.element ?? {}) as React.CSSProperties;

    // Common meta: __tag 지원 (허용 태그는 TagPolicy에서 관리)
    const p = (node.props as NodePropsWithMeta) ?? {};
    const Tag = (p.__tag as keyof JSX.IntrinsicElements) ?? 'div';

    return (
        <Tag style={style}>
            {/* 기본 단일 슬롯: 모든 직계 자식 */}
            {renderChildren?.()}
        </Tag>
    );
}

register(BoxDef, BoxRender);