'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { NodeId, Node, SupportedEvent, ActionStep, CSSDict, Viewport } from '../../core/types';
import type { EditorStoreState } from '../../store/editStore';
import { useEditor } from '../useEditor';
import { getRenderer } from '../../core/registry';
import { evalWhenExpr } from '../../runtime/expr';
import { runActions } from '../../runtime/actions';
import { findEdges, applyEdge, checkWhen } from '../../runtime/flow';
import { toReactStyle } from '../../runtime/styleUtils';

// --- 유틸리티 상수 및 함수 ---
const VOID_ELEMENTS = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);

type HostProps = Record<string, unknown> & {
    style?: React.CSSProperties;
    className?: string;
    onClick?: React.MouseEventHandler;
    children?: React.ReactNode;
    'data-node-id'?: string;
};

function chainClick(a?: React.MouseEventHandler, b?: React.MouseEventHandler): React.MouseEventHandler | undefined {
    if (!a && !b) return undefined;
    return (e) => {
        e.stopPropagation();
        a?.(e);
        b?.(e);
    };
}

function getResponsiveStyles(node: Node, activeViewport: Viewport): React.CSSProperties {
    const baseStyle = node.styles?.element?.base ?? {};
    const tabletStyle = node.styles?.element?.tablet ?? {};
    const mobileStyle = node.styles?.element?.mobile ?? {};
    let merged: CSSDict = { ...baseStyle };
    if (activeViewport === 'tablet') merged = { ...merged, ...tabletStyle };
    if (activeViewport === 'mobile') merged = { ...merged, ...tabletStyle, ...mobileStyle };
    return toReactStyle(merged);
}

// --- 렌더링 컴포넌트 ---
function RenderNode({ id, state }: { id: NodeId; state: EditorStoreState }) {
    const node = state.project.nodes[id];
    if (!node || node.isVisible === false) return null;

    const renderer = getRenderer(node.componentId);
    const selected = state.ui.selectedId === id;

    const fire = (evt: SupportedEvent) => { /* ... (구현 생략) ... */ };

    if (!renderer) {
        return <div style={{ padding: '8px', fontSize: '12px', color: 'red' }}>Unknown component: {node.componentId}</div>;
    }

    const childrenFromTree = (node.children ?? []).map((cid) => <RenderNode key={cid} id={cid} state={state} />);
    const hostNode = renderer({ node, fire });

    // ✅ [수정] 1. 기본 스타일과 반응형 스타일을 가져옵니다.
    const styleFromNode = getResponsiveStyles(node, state.ui.canvas.activeViewport);

    // ✅ [수정] 2. 선택 상태에 따라 outline 스타일 객체를 생성합니다.
    const selectionStyle: React.CSSProperties = selected ? {
        outline: '2px solid #3b82f6', // 파란색 외곽선
        outlineOffset: '-2px',
    } : {};

    // ✅ [수정] 3. 잠금 상태에 따라 box-shadow 스타일을 추가합니다.
    if (node.locked) {
        selectionStyle.boxShadow = 'inset 0 0 0 2px #ef4444'; // 빨간색 내부 링
    }

    // ✅ [수정] 4. 모든 스타일을 병합합니다.
    const finalStyle = { ...styleFromNode, ...selectionStyle };

    const onSelect: React.MouseEventHandler = (e) => {
        e.stopPropagation();
        if (!node.locked) state.select(id);
    };

    if (React.isValidElement<HostProps>(hostNode)) {
        const el = hostNode;
        const finalProps: HostProps = {
            ...el.props,
            style: { ...(el.props.style ?? {}), ...finalStyle }, // 최종 스타일 적용
            onClick: chainClick(el.props.onClick, onSelect),
            'data-node-id': id,
        };

        const isContainer = node.componentId === 'box';
        const isVoid = VOID_ELEMENTS.has(typeof el.type === 'string' ? el.type : '');
        if (!isContainer || isVoid) {
            return <>{React.cloneElement(el, finalProps)}{childrenFromTree}</>;
        }
        return React.cloneElement(el, finalProps, <>{el.props.children}{childrenFromTree}</>);
    }

    return (
        <div data-node-id={id} onClick={onSelect} style={finalStyle}>
            {hostNode}{childrenFromTree}
        </div>
    );
}

export function Canvas() {
    const state = useEditor();
    const { rootId } = state.project;
    const { width: canvasWidth, height: canvasHeight, zoom } = state.ui.canvas;

    const hostRef = useRef<HTMLDivElement | null>(null);
    const rootElRef = useRef<HTMLElement | null>(null);
    const [isReady, setIsReady] = useState(false);

    useLayoutEffect(() => {
        if (hostRef.current && !rootElRef.current) {
            const sr = hostRef.current.attachShadow({ mode: 'open' });

            // ✅ [수정] 더 이상 외부 CSS를 로드하지 않습니다. 기본 리셋만 적용합니다.
            const baseStyle = document.createElement('style');
            baseStyle.textContent = `
                .wcd-canvas-root { width: 100%; height: 100%; }
                * { box-sizing: border-box; }
            `;
            sr.appendChild(baseStyle);

            const root = document.createElement('div');
            root.className = 'wcd-canvas-root';
            sr.appendChild(root);
            rootElRef.current = root;
            setIsReady(true);
        }
    }, []);

    return (
        <div
            className="w-full h-full overflow-auto bg-neutral-200 p-8 flex items-start justify-center"
            onClick={() => state.select(null)}
        >
            <div
                className="transition-transform duration-100"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className="bg-white shadow-lg relative"
                    style={{ width: canvasWidth, height: canvasHeight }}
                >
                    <div ref={hostRef} className="absolute inset-0" />
                    {isReady && rootElRef.current && createPortal(
                        <RenderNode id={rootId} state={state} />,
                        rootElRef.current
                    )}
                </div>
            </div>
        </div>
    );
}