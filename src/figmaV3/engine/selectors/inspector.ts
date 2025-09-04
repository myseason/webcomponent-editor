import type { NodeId } from '../../core/types';
import { EditorEngine } from '../EditorEngine';

/**
 * Component Dev Mode에서 fragment root 하위인지 검사 (children 기반).
 * 베이스 타입에 parent 포인터가 없으므로, children 트리를 내려가며 검사한다.
 */
export function isDescendant(project: any, rootId: NodeId | null, candidateId: NodeId | null): boolean {
    if (!rootId || !candidateId) return false;
    const stack: NodeId[] = [rootId];
    const visited = new Set<NodeId>();
    while (stack.length) {
        const id = stack.pop()!;
        if (id === candidateId) return true;
        if (visited.has(id)) continue;
        visited.add(id);
        const kids = (project?.nodes?.[id]?.children ?? []) as NodeId[];
        for (const c of kids) stack.push(c);
    }
    return false;
}

/**
 * 현재 Inspector가 바라봐야 할 대상 nodeId 계산
 * - Page Mode: selectedId ?? rootId
 * - Component Dev Mode:
 *     selectedId가 fragmentRoot 하위면 selectedId, 아니면 fragmentRoot
 */
export function computeInspectorTargetNodeId(engine: EditorEngine): NodeId | null {
    const ui = engine.getUI();
    const project = engine.getProject();
    const rootId = project?.rootId as NodeId | undefined;
    if (!project || !rootId) return null;

    if (ui?.mode === 'Page') {
        return (ui?.selectedId ?? rootId) as NodeId;
    }

    // Component Dev Mode
    const fragment = (project?.fragments ?? []).find((f: any) => f.id === ui?.editingFragmentId);
    const fragRoot: NodeId | null = (fragment?.rootId ?? null) as NodeId | null;
    if (!fragRoot) return null;

    const sel = (ui?.selectedId ?? null) as NodeId | null;
    return isDescendant(project, fragRoot, sel) ? (sel as NodeId) : fragRoot;
}