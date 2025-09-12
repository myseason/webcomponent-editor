'use client';

import React, { useMemo } from 'react';
import type { NodeId, Node, DndDropTarget, CSSDict, Fragment } from '../../core/types';
import { VOID_TAGS } from '../../core/types';
import { getDefinition, getRenderer } from '../../core/registry';
import { toReactStyle } from '../../runtime/styleUtils';
import { useDroppable } from '@dnd-kit/core';
import {useEditorControllerFactory} from "@/figmaV3/controllers/EditorControllerFactory";

function chain<A extends any[]>(...fns: (undefined | ((...args: A) => any))[]) {
    return (...args: A) => {
        for (const fn of fns) if (typeof fn === 'function') fn(...args as any);
    };
}

// RenderNode는 이제 props로 reader와 writer를 전달받습니다.
function RenderNode({ id, reader, writer }: { id: NodeId; reader: any; writer: any }) {
    const node = reader.getNode(id);
    const { setNodeRef } = useDroppable({ id, data: { current: { kind: 'canvas-node', nodeId: id, position: 'inside' } } });

    // 스타일 계산은 이제 reader를 통해 수행됩니다.
    const instanceStyle = () => {
        // getEffectiveDecl은 이제 selectors 도메인에 있습니다.
        const decl = reader.getEffectiveDecl(id) ?? {};
        return toReactStyle(decl as CSSDict);
    };

    if (!node || node.isVisible === false) return null;

    const def = getDefinition(node.componentId);
    const defaultStyle = toReactStyle(def?.defaults?.styles?.element?.base as CSSDict | undefined);

    const selected = reader.getUI().selectedId === id;
    const selectionStyle: React.CSSProperties = selected
        ? { outline: '2px solid var(--mdt-color-border-focus)', outlineOffset: 2, cursor: 'default' }
        : {};

    const renderer = getRenderer(node.componentId) as (ctx: { node: Node; fire: (evt: any) => void }) => React.ReactElement<any> | undefined;
    const fire = (_evt: any) => {};

    if (!renderer) {
        return <div style={{ padding: 8, fontSize: 12, color: 'red' }}>Unknown component: {node.componentId}</div>;
    }

    const el = renderer({ node, fire });
    const elProps: any = el?.props ?? {};

    // 자식 노드를 재귀적으로 렌더링하며 reader와 writer를 전달합니다.
    const kids = (node.children ?? []).map((cid: NodeId) => <RenderNode key={cid} id={cid} reader={reader} writer={writer} />);

    const finalStyle: React.CSSProperties = {
        ...defaultStyle,
        ...(elProps.style ?? {}),
        ...instanceStyle(),
        ...selectionStyle
    };

    const onSelect: React.MouseEventHandler = (e) => {
        e.stopPropagation();
        // 노드 선택은 writer를 통해 수행됩니다.
        writer.setSelectNodeId(id);
    };

    const finalProps: any = { ...elProps, style: finalStyle, onClick: chain(elProps.onClick, onSelect), 'data-node-id': id, ref: setNodeRef };
    const isVoid = typeof el!.type === 'string' && VOID_TAGS.has(el!.type.toLowerCase());

    return isVoid
        ? React.cloneElement(el!, finalProps)
        : React.cloneElement(el!, finalProps, <>{elProps.children}{kids}</>);
}

export function Canvas({ dropTarget }: { dropTarget: DndDropTarget | null }) {

    const { reader, writer } = useEditorControllerFactory();
    const project = reader.getProject();
    const ui = reader.getUI();
    const { mode, editingFragmentId } = ui;

    const rootId = useMemo(() => {
        if (mode === 'Page') {
            return reader.getRootNodeId();
        }
        if (mode === 'Component' && editingFragmentId) {
            return reader.getFragmentById(editingFragmentId)?.rootId ?? null;
        }
        return null;
    }, [mode, editingFragmentId, project.rootId, project.fragments]);

    const { width, height, zoom } = ui.canvas;
    const scaledW = Math.round(width * zoom);
    const scaledH = Math.round(height * zoom);

    if (!rootId || !reader.getNode(rootId)) {
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
        <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden', background: '#f7fafc' }}>
            <div style={{ paddingTop: 40, paddingBottom: 40, minHeight: '100%', display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: scaledW, height: scaledH, position: 'relative', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width, height, transform: `scale(${zoom})`, transformOrigin: 'top left', background: 'white', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
                        <RenderNode id={rootId} reader={reader} writer={writer} />
                        {dropTarget && <div className="absolute top-0 left-0 w-full h-full bg-blue-500/20 border-2 border-dashed border-blue-600 pointer-events-none" />}
                    </div>
                </div>
            </div>
        </div>
    );
}