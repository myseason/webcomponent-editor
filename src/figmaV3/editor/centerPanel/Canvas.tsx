'use client';
import React, { useMemo } from 'react';
import type { NodeId, Node, DndDropTarget, CSSDict, Fragment } from '../../core/types';
import { VOID_TAGS } from '../../core/types';
import { useEditor } from '../useEditor';
import { getDefinition, getRenderer } from '../../core/registry';
import type { EditorStoreState } from '../../store/types';
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
    const state = useEditor();
    const node = state.project.nodes[id];
    const { setNodeRef } = useDroppable({ id, data: { current: { kind: 'canvas-node', nodeId: id, position: 'inside' } } });
    const instanceStyle = useMemo(() => getEffectiveStyle(state, id), [state, id, state.project, state.ui.canvas]);

    if (!node || node.isVisible === false) return null;

    const def = getDefinition(node.componentId);
    const defaultStyle = toReactStyle(def?.defaults?.styles?.element?.base as CSSDict | undefined);

    const selected = state.ui.selectedId === id;
    const selectionStyle: React.CSSProperties = selected
        ? { outline: '2px solid var(--mdt-color-border-focus)', outlineOffset: 2, cursor: 'default' }
        : {};

    const renderer = getRenderer(node.componentId) as Renderer | undefined;
    const fire = (_evt: any) => {};

    if (!renderer) {
        return <div style={{ padding: 8, fontSize: 12, color: 'red' }}>Unknown component: {node.componentId}</div>;
    }

    const el = renderer({ node, fire });
    const elProps: any = el?.props ?? {};
    const kids = (node.children ?? []).map((cid: NodeId) => <RenderNode key={cid} id={cid} />);

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

    const rootId = useMemo(() => {
        if (mode === 'Page') {
            return state.project.rootId;
        }
        if (mode === 'Component' && editingFragmentId) {
            return state.project.fragments.find((f: Fragment) => f.id === editingFragmentId)?.rootId ?? null;
        }
        return null;
    }, [mode, editingFragmentId, state.project.rootId, state.project.fragments]);


    const { width, height, zoom } = state.ui.canvas;
    const scaledW = Math.round(width * zoom);
    const scaledH = Math.round(height * zoom);

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

    // ✅ [수정] overflow-y는 auto로, overflow-x는 hidden으로 설정하여 좌우 스크롤을 완전히 제거합니다.
    return (
        <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden', background: '#f7fafc' }}>
            <div style={{ paddingTop: 40, paddingBottom: 40, minHeight: '100%', display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: scaledW, height: scaledH, position: 'relative', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width, height, transform: `scale(${zoom})`, transformOrigin: 'top left', background: 'white', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
                        <RenderNode id={rootId} />
                        {dropTarget && <div className="absolute top-0 left-0 w-full h-full bg-blue-500/20 border-2 border-dashed border-blue-600 pointer-events-none" />}
                    </div>
                </div>
            </div>
        </div>
    );
}