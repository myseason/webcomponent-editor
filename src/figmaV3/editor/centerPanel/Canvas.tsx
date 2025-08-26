'use client';

/**
 * Canvas
 * - 중앙에서 트리 순회/선택/오버레이/플로우 트리거 담당
 * - 각 컴포넌트 렌더러에 renderChildren(slotId?)를 전달하여, 자식 배치 위치 제어를 위임
 * - 훅은 반드시 최상위에서만 호출(규칙 준수)
 */

import React from 'react';
import type {
    NodeId,
    Node,
    NodePropsWithMeta,
    SupportedEvent, ActionStep,
} from '../../core/types';
import { useEditor } from '../useEditor';
import { editorStore } from '../../store/editStore';
import { getRenderer, getDefinition } from '../../core/registry';
import { evalWhenExpr } from '../../runtime/expr';
import { findEdges, applyEdge, checkWhen } from '../../runtime/flow';
import { runActions } from '../../runtime/actions';

function RenderNode({ id }: { id: NodeId }) {
    const state = editorStore.getState();
    const { project, ui } = state;

    const node = project.nodes[id] as Node<Record<string, unknown>>;
    const def = getDefinition(node.componentId);
    const render = getRenderer(node.componentId);

    const selected = ui.selectedId === id;

    /** Canvas가 제공하는 "자식 렌더" 함수 */
    const renderChildren = (slotId?: string) => {
        const list = (node.children ?? []).filter((cid) => {
            if (!slotId) return true;
            const child = project.nodes[cid];
            const slot = (child.props as NodePropsWithMeta | undefined)?.__slotId;
            return slot === slotId;
        });
        return list.map((cid) => <RenderNode key={cid} id={cid} />);
    };

    /** 이벤트 디스패치(액션 → 플로우) */
    const fire = (evt: SupportedEvent) => {
        const bag = (node.props as Record<string, unknown>).__actions as
            | Record<string, { when?: { expr?: string }; steps?: unknown[] }>
            | undefined;

        // whenExpr 검사
        const expr = bag?.[evt]?.when?.expr;
        if (expr) {
            const ok = evalWhenExpr(expr, { data: state.data, node, project });
            if (!ok) return;
        }

        // 액션 실행
        const steps = (bag?.[evt]?.steps ?? []) as ActionStep[];
        void runActions(steps, {
            alert: (msg) => alert(msg),
            setData: (path, value) => editorStore.getState().setData(path, value),
            setProps: (nodeId, patch) =>
                editorStore.getState().updateNodeProps(nodeId, patch),
            navigate: (toPageId) => editorStore.getState().selectPage(toPageId),
            openFragment: (fragmentId) =>
                editorStore.getState().openFragment(fragmentId),
            closeFragment: (fragmentId) =>
                editorStore.getState().closeFragment(fragmentId),
            http: async (method, url, body, headers) => {
                const res = await fetch(url, {
                    method,
                    headers,
                    body: body ? JSON.stringify(body) : undefined,
                });
                try {
                    return await res.json();
                } catch {
                    return await res.text();
                }
            },
            emit: () => {},
        });

        // 플로우 적용
        const edges = findEdges(editorStore.getState(), node.id, evt);
        edges.forEach((edge) => {
            if (checkWhen(edge, editorStore.getState())) {
                applyEdge(edge, {
                    navigate: (toPageId) => editorStore.getState().selectPage(toPageId),
                    openFragment: (fragmentId) =>
                        editorStore.getState().openFragment(fragmentId),
                    closeFragment: (fragmentId) =>
                        editorStore.getState().closeFragment(fragmentId),
                });
            }
        });
    };

    // 선택 핸들러
    const onSelect = (e: React.MouseEvent) => {
        e.stopPropagation();
        editorStore.getState().select(id);
    };

    if (!render) {
        return (
            <div
                className="border border-red-400 bg-red-50 text-red-700 text-xs px-2 py-1 rounded"
                onClick={onSelect}
            >
                Unknown component: {node.componentId}
            </div>
        );
    }

    // wrapper: 선택 하이라이트/클릭 캡처 (스타일은 내부 컴포넌트 host에 적용)
    return (
        <div
            className={`relative ${
                selected ? 'outline outline-2 outline-sky-500/60' : ''
            }`}
            onClick={onSelect}
        >
            {render({ node, fire, renderChildren })}
        </div>
    );
}

export function Canvas() {
    // 전역 상태 변화 구독 → 캔버스 리렌더
    void useEditor();
    const rootId = editorStore.getState().project.rootId;

    // ⚠️ 부모 컨테이너가 min-h-0을 갖고 있어야 h-full이 정상 동작합니다(레이아웃 메모 참고).
    return (
        <div className="w-full h-full overflow-auto p-4">
            <RenderNode id={rootId} />
        </div>
    );
}