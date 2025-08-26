// src/figmaV3/editor/centerPanel/Canvas.tsx
'use client';

/**
 * Canvas (스냅샷 소비 + 안전한 컨테이너 주입)
 * - 반드시 useEditor()의 반환값을 "값"으로 받아 렌더 경로에서 소비합니다.
 * - Box(컨테이너) 내부에만 트리 자식을 주입하고, void/비컨테이너는 형제로 렌더합니다.
 * - any 금지, HostProps로 안전 타입 가드.
 */

import React from 'react';
import type { NodeId, Node, SupportedEvent, ActionStep } from '../../core/types';
import type { EditorStoreState } from '../../store/editStore';
import { useEditor } from '../useEditor';
import { getRenderer } from '../../core/registry';
import { evalWhenExpr } from '../../runtime/expr';
import { runActions } from '../../runtime/actions';
import { findEdges, applyEdge, checkWhen } from '../../runtime/flow';
import { toReactStyle } from '../../runtime/styleUtils';

const VOID_ELEMENTS = new Set<string>([
    'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr',
]);

const NON_CONTAINER_HOSTS = new Set<string>(['button','a','textarea','select']);

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

function RenderNode({ id, state }: { id: NodeId; state: EditorStoreState }) {
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
            setData: state.setData,
            setProps: state.updateNodeProps,
            navigate: (toPageId) => state.selectPage(toPageId),
            openFragment: (fid) => state.openFragment(fid),
            closeFragment: (fid) => state.closeFragment(fid),
            http: async (m, url, body, headers) => {
                const res = await fetch(url, { method: m, headers, body: body ? JSON.stringify(body) : undefined });
                try { return await res.json(); } catch { return await res.text(); }
            },
            emit: () => {},
        });

        const edges = findEdges(state, node.id, evt);
        edges.forEach((edge) => {
            if (checkWhen(edge, state)) {
                applyEdge(edge, {
                    navigate: (toPageId) => state.selectPage(toPageId),
                    openFragment: (fragId) => state.openFragment(fragId),
                    closeFragment: (fragId) => state.closeFragment(fragId),
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

    // 트리 자식
    const childrenFromTree = (node.children ?? []).map((cid) => (
        <RenderNode key={cid} id={cid} state={state} />
    ));

    // 렌더러 호출 (레포 시그니처: { node, fire } 만)
    const hostNode = renderer({ node, fire });

    // 스타일/선택 상태 병합
    const styleFromNode = toReactStyle(node.styles?.element);
    const onSelect: React.MouseEventHandler<unknown> = (e) => {
        e.stopPropagation();
        state.select(id);
    };

    if (React.isValidElement<HostProps>(hostNode)) {
        const el = hostNode as React.ReactElement<HostProps>;
        const prev = el.props;

        const hostName = typeof el.type === 'string' ? el.type.toLowerCase() : '';
        const isVoid = hostName ? VOID_ELEMENTS.has(hostName) : false;
        const isNonContainer = hostName ? NON_CONTAINER_HOSTS.has(hostName) : false;
        const isContainer = node.componentId === 'box'; // Box만 컨테이너

        const nextStyle = { ...(prev.style ?? {}), ...styleFromNode };
        const nextClass = (prev.className ?? '') + (selected ? ' outline outline-2 outline-sky-500/60' : '');
        const nextOnClick = chainClick(prev.onClick, onSelect);

        if (!isContainer || isVoid || isNonContainer) {
            // 호스트 뒤에 트리 자식들을 형제로 렌더
            const cloned = React.cloneElement<HostProps>(el, {
                ...prev, style: nextStyle, className: nextClass, onClick: nextOnClick, 'data-node-id': id,
            });
            return (
                <>
                    {cloned}
                    {childrenFromTree}
                </>
            );
        }

        // 컨테이너(Box): 호스트 children 뒤에 주입
        return React.cloneElement<HostProps>(
            el,
            { ...prev, style: nextStyle, className: nextClass, onClick: nextOnClick, 'data-node-id': id },
            <>
                {prev.children}
                {childrenFromTree}
            </>,
        );
    }

    // 호스트가 엘리먼트가 아니면 최소 div로 감싸기
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
    // ✅ 스냅샷을 "값"으로 소비 (구독 + 값 사용)
    const state = useEditor();

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
                    <RenderNode id={rootId} state={state} />
                </div>
            </div>
        </div>
    );
}