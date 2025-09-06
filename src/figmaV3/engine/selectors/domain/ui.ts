'use client';

import { EditorEngine } from '../../EditorEngine';

type State = ReturnType<typeof EditorEngine.getState>;

/** 현재 hover 중인 노드 id */
export function selectHoverNodeIdFrom(s: State): string | null {
    return (s.ui as any)?.hoverNodeId ?? null;
}

/** 현재 선택된 노드 id */
export function selectSelectedNodeIdFrom(s: State): string | null {
    return (s.ui as any)?.selectedId ?? null;
}

/** 편의형(무상태): 파사드에서 바로 읽기 */
export function selectHoverNodeId(): string | null {
    return selectHoverNodeIdFrom(EditorEngine.getState());
}
export function selectSelectedNodeId(): string | null {
    return selectSelectedNodeIdFrom(EditorEngine.getState());
}