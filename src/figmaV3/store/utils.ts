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