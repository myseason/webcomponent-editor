'use client';
import React, { useMemo } from 'react';
import type { NodeId, Node, DndDropTarget, CSSDict } from '../../core/types';
import { VOID_TAGS } from '../../core/types';
import { useEditor } from '../useEditor';
import { getDefinition, getRenderer } from '../../core/registry';
import type { EditorStoreState } from '../../store/editStore';
import { toReactStyle } from '../../runtime/styleUtils';
import { useDroppable } from '@dnd-kit/core';

function chain<A extends any[]>(...fns: (undefined | ((...args: A) => any))[]) {
    return (...args: A) => {
        for (const fn of fns) if (typeof fn === 'function') fn(...args as any);
    };
}

function getEffectiveStyle(state: EditorStoreState, id: NodeId): React.CSSProperties {
    const decl = state.getEffectiveDecl?.(id) ?? {};
    return toReactStyle(decl as CSSDict);
}

type Renderer = (ctx: { node: Node; fire: (evt: any) => void }) => React.ReactElement<any>;

function RenderNode({ id }: { id: NodeId }) {
    // 훅 호출을 컴포넌트 최상단으로 이동하여 규칙 위반 오류 해결
    const state = useEditor();
    const node = state.project.nodes[id];
    const { setNodeRef } = useDroppable({ id, data: { current: { kind: 'canvas-node', nodeId: id, position: 'inside' } } });

    // 훅 호출이 모두 끝난 후에 조건부 조기 반환(early return) 실행
    if (!node || node.isVisible === false) return null;

    // 기본 스타일과 인스턴스 스타일을 명확하게 병합하여 스타일 누락 문제 해결
    const def = getDefinition(node.componentId);
    const defaultStyle = toReactStyle(def?.defaults?.styles?.element?.base as CSSDict | undefined);
    const instanceStyle = useMemo(() => getEffectiveStyle(state, id), [state, id, state.project, state.ui.canvas]);

    const selected = state.ui.selectedId === id;
    const selectionStyle: React.CSSProperties = selected
        ? { outline: '2px solid #3b82f6', outlineOffset: 2, cursor: 'default' }
        : {};

    const renderer = getRenderer(node.componentId) as Renderer | undefined;
    const fire = (_evt: any) => {};

    if (!renderer) {
        return <div style={{ padding: 8, fontSize: 12, color: 'red' }}>Unknown component: {node.componentId}</div>;
    }

    const el = renderer({ node, fire });
    const elProps: any = el?.props ?? {};
    const kids = (node.children ?? []).map((cid) => <RenderNode key={cid} id={cid} />);

    const finalStyle: React.CSSProperties = {
        ...defaultStyle,
        ...(elProps.style ?? {}),
        ...instanceStyle,
        ...selectionStyle
    };

    const onSelect: React.MouseEventHandler = (e) => { e.stopPropagation(); state.select(id); };
    const finalProps: any = { ...elProps, style: finalStyle, onClick: chain(elProps.onClick, onSelect), 'data-node-id': id, ref: setNodeRef };
    const isVoid = typeof el.type === 'string' && VOID_TAGS.has(el.type.toLowerCase());

    return isVoid
        ? React.cloneElement(el, finalProps)
        : React.cloneElement(el, finalProps, <>{elProps.children}{kids}</>);
}

export function Canvas({ dropTarget }: { dropTarget: DndDropTarget | null }) {
    const state = useEditor();
    const { mode, editingFragmentId } = state.ui;

    // ✨ [수정] 모드에 따라 렌더링할 루트 노드를 결정하는 로직 개선
    const rootId = useMemo(() => {
        if (mode === 'Page') {
            return state.project.rootId;
        }
        if (mode === 'Component' && editingFragmentId) {
            return state.project.fragments.find(f => f.id === editingFragmentId)?.rootId ?? null;
        }
        // 컴포넌트 모드이지만 편집 대상이 없으면 null 반환
        return null;
    }, [mode, editingFragmentId, state.project.rootId, state.project.fragments]);


    const { width, height, zoom } = state.ui.canvas;
    const scaledW = Math.round(width * zoom);
    const scaledH = Math.round(height * zoom);

    // ✨ [수정] 렌더링할 대상이 없을 경우 안내 메시지 표시
    if (!rootId || !state.project.nodes[rootId]) {
        const message = mode === 'Component'
            ? "Select a component to start editing."
            : "Select a page to start editing.";
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500">
                {message}
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', overflow: 'auto', height: '100%', paddingTop: 40, background: '#f7fafc' }}>
            <div style={{ width: scaledW, height: scaledH, marginLeft: 'auto', marginRight: 'auto', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width, height, transform: `scale(${zoom})`, transformOrigin: 'top left', background: 'white', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
                    <RenderNode id={rootId} />
                    {dropTarget && <div className="absolute top-0 left-0 w-full h-full bg-blue-500/20 border-2 border-dashed border-blue-600 pointer-events-none" />}
                </div>
            </div>
        </div>
    );
}