import { ComponentDefinition, Node, NodeId, Project } from '../core/types';
import { getDefinition } from '../core/registry';

// --- ID 및 데이터 경로 유틸리티 ---
let _seq = 0;
export const genId = (prefix: string): string =>
    `${prefix}_${Date.now().toString(36)}_${++_seq}`;

export function setByPath(root: any, path: string, value: unknown) {
    const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
    const out = { ...(root ?? {}) };
    let cur: any = out;
    for (let i = 0; i < parts.length - 1; i++) {
        const k = parts[i];
        const prev = cur[k];
        cur[k] =
            Array.isArray(prev) ? [...prev]
                : (prev && typeof prev === 'object') ? { ...prev }
                    : {};
        cur = cur[k];
    }
    cur[parts[parts.length - 1]] = value;
    return out;
}

// --- 노드 및 트리 구조 유틸리티 ---

export function buildNodeWithDefaults(defId: string, id: string): Node {
    const def = getDefinition(defId);
    const defProps = def?.defaults?.props ?? {};
    const defStyles = def?.defaults?.styles?.element?.base ?? {};
    return {
        id,
        componentId: defId,
        props: { ...defProps },
        styles: { element: { base: { ...defStyles } } },
        children: [],
        locked: false,
        isVisible: true,
    };
}

export function collectSubtreeIds(nodes: Record<NodeId, Node>, rootId: NodeId): NodeId[] {
    const ids: NodeId[] = [];
    const queue: NodeId[] = [rootId];
    while (queue.length) {
        const id = queue.shift()!;
        ids.push(id);
        const n = nodes[id];
        if (n?.children) queue.push(...(n.children as NodeId[]));
    }
    return ids;
}

export function cloneSubtree(nodes: Record<NodeId, Node>, srcRootId: NodeId): { nodes: Record<NodeId, Node>; newRootId: NodeId } {
    const newNodes: Record<NodeId, Node> = {};
    const idMap = new Map<NodeId, NodeId>();

    const cloneNode = (id: NodeId): NodeId | null => {
        if (idMap.has(id)) return idMap.get(id)!;

        const oldNode = nodes[id];
        if (!oldNode) {
            console.warn(`Node not found during clone: ${id}. Skipping.`);
            return null;
        }

        const newId = genId('node');
        idMap.set(id, newId);

        const newChildren = (oldNode.children?.map(cloneNode).filter(Boolean) as NodeId[]) ?? [];

        newNodes[newId] = {
            ...JSON.parse(JSON.stringify(oldNode)),
            id: newId,
            children: newChildren,
        };
        return newId;
    };

    const newRootId = cloneNode(srcRootId);
    if (!newRootId) throw new Error("Failed to clone root node.");

    return { nodes: newNodes, newRootId };
}

export function findParentId(nodes: Record<NodeId, Node>, childId: NodeId): NodeId | null {
    for (const nid of Object.keys(nodes)) {
        const n = nodes[nid]!;
        if (n.children && n.children.includes(childId)) return nid;
    }
    return null;
}

export function isContainer(def: ComponentDefinition | undefined): boolean {
    if (!def)
        return false;
    if (def.id === 'box')
        return true;
    return false
}

export function chooseValidParentId(
    project: Project,
    desiredParentId: NodeId
): NodeId {
    let currentId: NodeId | null = desiredParentId;

    for (let i = 0; i < 100; i++) {
        if (!currentId) break;

        const node = project.nodes[currentId];
        if (node) {
            const def = getDefinition(node.componentId);
            if (isContainer(def)) {
                return currentId;
            }
        }
        currentId = findParentId(project.nodes, currentId);
    }
    return project.rootId;
}

// === Inspector Target Utilities ===
export function isDescendant(project: any, candidateId: NodeId | null, rootId: NodeId | null): boolean {
    if (!candidateId || !rootId) return false;
    let cur: NodeId | null = candidateId;
    while (cur) {
        if (cur === rootId) return true;
        const parent = project.nodes[cur]?.parent as NodeId | null | undefined; // parentId 아님, parent 맞음
        cur = (parent ?? null) as NodeId | null;
    }
    return false;
}

export function getFragmentRootId(project: any, fragments: any[], editingFragmentId: string | null): NodeId | null {
    if (!editingFragmentId) return null;
    const f = fragments.find((x) => x.id === editingFragmentId);
    return (f?.rootId ?? null) as NodeId | null;
}

/**
 * Inspector가 실제로 편집해야 할 타깃 노드 계산
 * - Page 모드: selectedId ?? rootId
 * - Component 모드: selectedId가 fragmentRoot의 하위면 selectedId, 아니면 fragmentRoot
 */
export function getInspectorTargetNodeId(state: any): NodeId | null {
    const { project, ui } = state;
    const { mode, selectedId } = ui;
    const rootId = project.rootId as NodeId;
    if (mode === 'Page') {
        return (selectedId ?? rootId) as NodeId;
    }
    // Component Dev Mode
    const fragmentRootId = getFragmentRootId(project, project.fragments ?? [], ui.editingFragmentId ?? null);
    if (!fragmentRootId)
        return null;

    return isDescendant(project, (selectedId ?? null) as NodeId | null, fragmentRootId)
        ? (selectedId as NodeId)
        : fragmentRootId;
}