'use client';
import React, { useMemo } from 'react';
import type { NodeId, Node } from '../../core/types';
import { VOID_TAGS, CSSDict } from '../../core/types';
import { useEditor } from '../useEditor';
import { getRenderer } from '../../core/registry';
import type { EditorStoreState } from '../../store/editStore';
import { toReactStyle } from '../../runtime/styleUtils';

/** 여러 핸들러를 순서대로 실행 */
function chain<A extends any[]>(...fns: (undefined | ((...args: A) => any))[]) {
    return (...args: A) => {
        for (const fn of fns) if (typeof fn === 'function') fn(...args as any);
    };
}

/** store가 계산한 최종 선언 사용 (Unified/Independent, baseViewport 반영) */
function getEffectiveStyle(state: EditorStoreState, id: NodeId): React.CSSProperties {
    const decl = state.getEffectiveDecl?.(id) ?? {};
    return toReactStyle(decl as CSSDict);
}

type Renderer = (ctx: { node: Node; fire: (evt: any) => void }) => React.ReactElement<any>;

function RenderNode({ id }: { id: NodeId }) {
    const state = useEditor();
    const node = state.project.nodes[id];
    if (!node || node.isVisible === false) return null;

    const effStyle = useMemo(() => getEffectiveStyle(state, id), [state, id, state.project, state.ui.canvas]);

    const selected = state.ui.selectedId === id;
    const selectionStyle: React.CSSProperties = selected
        ? { outline: '2px solid #3b82f6', outlineOffset: 2, cursor: 'default' }
        : {};

    const renderer = getRenderer(node.componentId) as Renderer | undefined;

    // 런타임 액션 훅(현 시점 no-op)
    const fire = (_evt: any) => {};

    if (!renderer) {
        return (
            <div style={{ padding: 8, fontSize: 12, color: 'red' }}>
                Unknown component: {node.componentId}
            </div>
        );
    }

    const el = renderer({ node, fire }) as React.ReactElement<any>;
    const elProps: any = el?.props ?? {};

    // 자식 트리
    const kids = (node.children ?? []).map((cid) => <RenderNode key={cid} id={cid} />);

    // 렌더러 스타일 → 효과 스타일 → 선택 표시 순 병합
    const finalStyle: React.CSSProperties = {
        ...(elProps.style ?? {}),
        ...effStyle,
        ...selectionStyle,
    };

    const onSelect: React.MouseEventHandler = (e) => {
        e.stopPropagation();
        state.select(id);
    };

    const finalProps: any = {
        ...elProps,
        style: finalStyle,
        onClick: chain(elProps.onClick, onSelect),
        'data-node-id': id,
    };

    const isVoid = typeof el.type === 'string' && VOID_TAGS.has(el.type.toLowerCase());

    return isVoid
        ? React.cloneElement(el, finalProps) // void 요소는 children 금지
        : React.cloneElement(el, finalProps, <>
            {elProps.children}
            {kids}
        </>);
}

export function Canvas() {
    const state = useEditor();
    const { rootId } = state.project;
    const { width, height, zoom } = state.ui.canvas;

    // 스케일 반영된 레일 크기(스크롤 영역에서 중앙 정렬 기준)
    const scaledW = Math.round(width * zoom);
    const scaledH = Math.round(height * zoom);

    return (
        <div
            // 스크롤 컨테이너: 상단 여백(≈60px), 전체 스크롤, 배경으로 경계 확보
            style={{
                position: 'relative',
                overflow: 'auto',
                height: '100%',
                paddingTop: 40,
                background: '#f7fafc', // 연한 회색
            }}
        >
            {/* 가로 중앙 정렬 레일: zoom에 맞춘 실제 스크롤바/히트 영역 */}
            <div
                style={{
                    width: scaledW,
                    height: scaledH,
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    position: 'relative',
                }}
            >
                {/* 실제 보드 (디자인 캔버스): 여기만 scale 적용, 좌상단 기준 */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width,
                        height,
                        transform: `scale(${zoom})`,
                        transformOrigin: 'top left', // 좌상단 기준 스케일
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        // borderRadius 제거 (요청 사항)
                        boxShadow: '0 1px 4px rgba(0,0,0,.06)',
                    }}
                >
                    <RenderNode id={rootId} />
                </div>
            </div>
        </div>
    );
}