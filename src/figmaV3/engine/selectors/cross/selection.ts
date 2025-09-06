'use client';

import { EditorEngine } from '../../EditorEngine';
import type { Node, NodeId } from '../../../core/types';

type State = ReturnType<typeof EditorEngine.getState>;

/**
 * 현재 인터랙션 컨텍스트의 타겟 노드 id
 * v1.3.1 UI 모델에서는 hover 필드가 없으므로 selectedId만 사용합니다.
 */
export function selectTargetNodeIdFrom(s: State): NodeId | null {
  return (s.ui.selectedId ?? null) as NodeId | null;
}

/** 편의형(무상태) */
export function selectTargetNodeId(): NodeId | null {
  return selectTargetNodeIdFrom(EditorEngine.getState());
}

/** 타겟 노드 객체(없으면 null) */
export function selectTargetNodeFrom(s: State): Node | null {
  const id = selectTargetNodeIdFrom(s);
  return id ? (s.project.nodes[id] as Node | undefined) ?? null : null;
}
export function selectTargetNode(): Node | null {
  return selectTargetNodeFrom(EditorEngine.getState());
}
