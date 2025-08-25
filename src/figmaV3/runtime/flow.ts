import type { EditorState, FlowEdge, SupportedEvent } from '../core/types';

/** from(nodeId,event)에 매칭되는 FlowEdge 목록 */
export function findEdges(state: EditorState, nodeId: string, event: SupportedEvent): FlowEdge[] {
  return Object.values(state.flowEdges).filter((e) => e.from.nodeId === nodeId && e.from.event === event);
}

/** 간단 조건 평가기(안전): expr은 "data.key == 'x'" 형태 권장 — 여기선 존재 체크만 샘플 */
export function checkWhen(edge: FlowEdge, _state: EditorState): boolean {
  if (!edge.when || !edge.when.expr) return true;
  // TODO: 안전 파서 도입 — 샘플로 항상 true 반환
  return true;
}

export type FlowDeps = {
  navigate: (toPageId: string) => void;
  openFragment: (fragmentId: string) => void;
  closeFragment: (fragmentId?: string) => void;
};

export function applyEdge(edge: FlowEdge, deps: FlowDeps): void {
  switch (edge.to.kind) {
    case 'Navigate':
      deps.navigate(edge.to.toPageId);
      return;
    case 'OpenFragment':
      deps.openFragment(edge.to.fragmentId);
      return;
    case 'CloseFragment':
      deps.closeFragment(edge.to.fragmentId);
      return;
    default: {
      const _never: never = edge.to as never;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      void _never;
    }
  }
}