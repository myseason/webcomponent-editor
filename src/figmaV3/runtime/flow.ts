import type { EditorState, FlowEdge, SupportedEvent } from '../core/types';
import { evalWhenExpr } from './expr';

/** from(nodeId,event)에 매칭되는 FlowEdge 목록 */
export function findEdges(state: EditorState, nodeId: string, event: SupportedEvent): FlowEdge[] {
    return Object.values(state.flowEdges).filter(
        (e) => e.from.nodeId === nodeId && e.from.event === event,
    );
}

/** 안전한 조건 평가기: when.expr 문자열을 evalWhenExpr로 평가 */
export function checkWhen(edge: FlowEdge, state: EditorState): boolean {
    const expr = edge.when?.expr;
    if (!expr) return true;

    const node = state.project.nodes[edge.from.nodeId] ?? null;
    return evalWhenExpr(expr, {
        data: state.data,
        node,
        project: state.project,
    });
}

export type FlowDeps = {
    navigate: (toPageId: string) => void;
    openFragment: (fragmentId: string) => void;
    closeFragment: (fragmentId?: string) => void;
};

export function applyEdge(edge: FlowEdge, deps: FlowDeps): void {
    switch (edge.to.kind) {
        case 'Navigate': deps.navigate(edge.to.toPageId); return;
        case 'OpenFragment': deps.openFragment(edge.to.fragmentId); return;
        case 'CloseFragment': deps.closeFragment(edge.to.fragmentId); return;
        default: {
            const _never: never = edge.to as never;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            void _never;
        }
    }
}