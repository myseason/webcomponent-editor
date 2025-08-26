// src/figmaV3/editor/centerPanel/Canvas.tsx
'use client';

/**
 * Canvas (wrapper-less host merge; void / non-container safe)
 * - 호스트 엘리먼트에 style/className/onClick만 주입
 * - 자식 노드는:
 *    • 호스트가 void/비컨테이너면  ➜ 호스트 "형제"로 렌더
 *    • 그 외엔                   ➜ 호스트 children 뒤에 렌더
 * - any 금지. HostProps로 안전 좁힘.
 */

import React from 'react';
import type {
    NodeId,
    Node,
    SupportedEvent,
    ActionStep,
} from '../../core/types';
import { useEditor } from '../useEditor';
import { editorStore } from '../../store/editStore';
import { getRenderer } from '../../core/registry';
import { evalWhenExpr } from '../../runtime/expr';
import { runActions } from '../../runtime/actions';
import { findEdges, applyEdge, checkWhen } from '../../runtime/flow';
import { toReactStyle } from '../../runtime/styleUtils';

// HTML void 요소(자식 불가)
const VOID_ELEMENTS = new Set<string>([
    'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr',
]);

// 자식을 호스트 내부에 넣지 말아야 하는 "비컨테이너" 호스트
// (중첩 시 HTML 금지/접근성 문제 유발: button, a(중첩 anchor), textarea 등)
const NON_CONTAINER_HOSTS = new Set<string>([
    'button', 'a', 'textarea', 'select', // select는 option 외 자식 금지
]);

type HostProps = Record<string, unknown> & {
    style?: React.CSSProperties;
    className?: string;
    onClick?: React.MouseEventHandler<unknown>;
    children?: React.ReactNode;
    'data-node-id'?: string;
};

function chainClick(
    a?: React.MouseEventHandler<unknown>,
    b?: React.MouseEventHandler<unknown>,
): React.MouseEventHandler<unknown> | undefined {
    if (!a && !b) return undefined;
    return (e) => { a?.(e); b?.(e); };
}

function RenderNode({ id }: { id: NodeId }) {
    const state = editorStore.getState();
    const node = state.project.nodes[id] as Node;
    const renderer = getRenderer(node.componentId);
    const selected = state.ui.selectedId === id;

    const fire = (evt: SupportedEvent) => {
        const bag = (node.props as Record<string, unknown>).__actions as
            | Record<string, { when?: { expr?: string }; steps?: ActionStep[] }>
            | undefined;

        const whenExpr = bag?.[evt]?.when?.expr;
        if (whenExpr) {
            const ok = evalWhenExpr(whenExpr, { data: state.data, node, project: state.project });
            if (!ok) return;
        }

        const steps = (bag?.[evt]?.steps ?? []) as ActionStep[];
        void runActions(steps, {
            alert: (msg) => alert(msg),
            setData: (path, value) => editorStore.getState().setData(path, value),
            setProps: (nid, patch) => editorStore.getState().updateNodeProps(nid, patch),
            navigate: (toPageId) => editorStore.getState().selectPage(toPageId),
            openFragment: (fid) => editorStore.getState().openFragment(fid),
            closeFragment: (fid) => editorStore.getState().closeFragment(fid),
            http: async (m, url, body, headers) => {
                const res = await fetch(url, { method: m, headers, body: body ? JSON.stringify(body) : undefined });
                try { return await res.json(); } catch { return await res.text(); }
            },
            emit: () => {},
        });

        const edges = findEdges(editorStore.getState(), node.id, evt);
        edges.forEach((edge) => {
            if (checkWhen(edge, editorStore.getState())) {
                applyEdge(edge, {
                    navigate: (toPageId) => editorStore.getState().selectPage(toPageId),
                    openFragment: (fragId) => editorStore.getState().openFragment(fragId),
                    closeFragment: (fragId) => editorStore.getState().closeFragment(fragId),
                });
            }
        });
    };

    if (!renderer) {
        return (
            <div className="border border-red-400 bg-red-50 text-red-700 text-xs px-2 py-1 rounded">
                Unknown component: {node.componentId}
            </div>
        );
    }

    // 1) 호스트 노드 생성
    const hostNode = renderer({ node, fire });

    // 2) 트리 자식 준비
    const childrenFromTree = (node.children ?? []).map((cid) => (
        <RenderNode key={cid} id={cid} />
    ));

    // 3) 노드 스타일 정규화
    const styleFromNode = toReactStyle(node.styles?.element);

    // 4) 선택 핸들러
    const onSelect: React.MouseEventHandler<unknown> = (e) => {
        e.stopPropagation();
        editorStore.getState().select(id);
    };

    if (React.isValidElement<HostProps>(hostNode)) {
        const el = hostNode as React.ReactElement<HostProps>;
        const prev = el.props;

        // 호스트 태그 이름 파악
        const hostName = typeof el.type === 'string' ? el.type.toLowerCase() : '';
        const isVoid = VOID_ELEMENTS.has(hostName);
        const isNonContainer = NON_CONTAINER_HOSTS.has(hostName);

        // 기존 props 병합
        const nextStyle = { ...(prev.style ?? {}), ...styleFromNode };
        const nextClass = (prev.className ?? '') + (selected ? ' outline outline-2 outline-sky-500/60' : '');
        const nextOnClick = chainClick(prev.onClick, onSelect);

        // (A) 자식 주입 금지 케이스: void 또는 비컨테이너
        if (isVoid || isNonContainer) {
            const cloned = React.cloneElement<HostProps>(
                el,
                {
                    ...prev,
                    style: nextStyle,
                    className: nextClass,
                    onClick: nextOnClick,
                    'data-node-id': id,
                },
            );
            // 호스트 뒤에 자식들을 "형제"로 렌더 (button 중첩/void children 금지 회피)
            return (
                <>
                    {cloned}
                    {childrenFromTree}
                </>
            );
        }

        // (B) 일반 케이스: 호스트 children 뒤에 트리 자식 주입
        const nextChildren = (
            <>
                {prev.children}
                {childrenFromTree}
            </>
        );
        return React.cloneElement<HostProps>(
            el,
            {
                ...prev,
                style: nextStyle,
                className: nextClass,
                onClick: nextOnClick,
                'data-node-id': id,
            },
            nextChildren,
        );
    }

    // 호스트가 엘리먼트가 아니라면(문자열 등), 최소 div에 스타일만 적용
    return (
        <div
            style={styleFromNode}
            className={selected ? 'outline outline-2 outline-sky-500/60' : undefined}
            onClick={onSelect}
            data-node-id={id}
        >
            {hostNode}
            {childrenFromTree}
        </div>
    );
}

export function Canvas() {
    void useEditor();
    const state = editorStore.getState();
    const rootId = state.project.rootId;
    const boardWidth = state.ui.canvasWidth ?? 1200;
    const boardMinHeight = 800;

    return (
        <div className="w-full h-full bg-neutral-100 dark:bg-neutral-900 overflow-auto">
            <div className="min-h-full flex justify-center items-start">
                <div
                    className="relative my-8 bg-white border border-neutral-200 shadow-sm rounded min-h-0"
                    style={{ width: boardWidth, minHeight: boardMinHeight }}
                >
                    <RenderNode id={rootId} />
                </div>
            </div>
        </div>
    );
}