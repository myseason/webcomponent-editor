'use client';
import React, { useMemo } from 'react';
import type { NodeId, Node } from '../../core/types';
import { VOID_TAGS } from '../../core/types';
import { useEditor } from '../useEditor';
import { getRenderer } from '../../core/registry';

/** 여러 핸들러를 순서대로 실행 */
function chain<A extends any[]>(...fns: (undefined | ((...args: A) => any))[]) {
    return (...args: A) => {
        for (const fn of fns) if (typeof fn === 'function') fn(...args as any);
    };
}

type Renderer = (ctx: { node: Node; fire: (evt: any) => void }) => React.ReactElement<any>;

function RenderNode({ id }: { id: NodeId }) {
    const state = useEditor();
    const node = state.project.nodes[id];
    if (!node || node.isVisible === false) return null;

    // Base + (Independent일 때만 Active) 병합된 선언
    const effStyle = useMemo(
        () => (state.getEffectiveDecl?.(id) ?? {}) as React.CSSProperties,
        // project 또는 canvas(viewport/모드/캔버스 크기)가 바뀌면 다시 계산
        [id, state.project, state.ui.canvas]
    );

    const selected = state.ui.selectedId === id;
    const selectionStyle: React.CSSProperties = selected
        ? { outline: '2px solid #3b82f6', outlineOffset: 2, cursor: 'default' }
        : {};

    const renderer = getRenderer(node.componentId) as Renderer | undefined;

    // flow/action 실행 훅 — 런타임 연동 전까지 no-op
    const fire = (_evt: any) => {};

    if (!renderer) {
        return (
            <div style={{ padding: 8, fontSize: 12, color: 'red' }}>
                Unknown component: {node.componentId}
            </div>
        );
    }

    // 렌더러가 반환한 엘리먼트 확보(타입은 any로 완화)
    const el = renderer({ node, fire }) as React.ReactElement<any>;
    const elProps: any = (el && (el as any).props) || {};

    // 자식 트리
    const childrenFromTree = (node.children ?? []).map((cid) => (
        <RenderNode key={cid} id={cid} />
    ));

    // 스타일 병합: 렌더러 제공 → 효과 스타일 → 선택 표시
    const finalStyle: React.CSSProperties = {
        ...(elProps.style ?? {}),
        ...effStyle,
        ...selectionStyle,
    };

    // 선택 핸들러
    const onSelect: React.MouseEventHandler = (e) => {
        e.stopPropagation();
        state.select(id);
    };

    // 최종 props
    const finalProps: any = {
        ...elProps,
        style: finalStyle,
        onClick: chain(elProps.onClick, onSelect),
        'data-node-id': id,
    };

    // HTML void 요소는 children을 절대 받지 않음
    const isVoid = typeof el.type === 'string' && VOID_TAGS.has(el.type.toLowerCase());

    return isVoid
        ? React.cloneElement(el, finalProps)
        : React.cloneElement(
            el,
            finalProps,
            <>
                {elProps.children}
                {childrenFromTree}
            </>
        );
}

export function Canvas() {
    const state = useEditor();
    const { rootId } = state.project;
    const { width, height } = state.ui.canvas;

    return (
        <div className="w-full h-full overflow-auto bg-gray-100 flex items-center justify-center">
            <div className="bg-white shadow-lg relative" style={{ width, height }}>
                <RenderNode id={rootId} />
            </div>
        </div>
    );
}