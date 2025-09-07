'use client';
import type { Node, NodeId, CSSDict } from '../../core/types';
import { EditorEngineCore } from '../EditorEngineCore';

export function nodesDomain() {
    const R = {
        getNode(id: NodeId | null | undefined): Node | null {
            if (!id) return null;
            return EditorEngineCore.getState().project?.nodes?.[id] ?? null;
        },
        getNodes(ids?: NodeId[] | null): Node[] {
            const map = EditorEngineCore.getState().project?.nodes ?? {};
            return Array.isArray(ids) ? ids.map(id => map[id]).filter(Boolean) as Node[] : [];
        },
        getCurrentNode(): Node | null {
            const id = EditorEngineCore.getState().ui?.selectedId ?? null;
            return R.getNode(id);
        },
        getRootNodeId: (): NodeId | null => {
            return EditorEngineCore.getState().project?.rootId ?? null;
        },
        getRootNode: (): Node | null => {
            const rootId = R.getRootNodeId();
            return rootId ? R.getNode(rootId) : null;
        },
    };

    const W = {
        setCurrentNode(id: NodeId | null) {
            const s = EditorEngineCore.getState() as any;
            if (s.select) return s.select(id);
            EditorEngineCore.updatePatch(({ patchUI, get }) => patchUI({ ...get().ui, selectedId: id } as any));
        },
        setNodeVisibility(id: NodeId, visible: boolean) {
            const s = EditorEngineCore.getState() as any;
            if (s.setNodeVisibility) return s.setNodeVisibility(id, visible);
            const n = R.getNode(id); if (!n) return;
            const next = { ...n, isVisible: visible };
            EditorEngineCore.updatePatch(({ get, patchProject }) => {
                const prev = get(); patchProject({ nodes: { ...prev.project.nodes, [id]: next } });
            });
        },
        setNodeLocked(id: NodeId, locked: boolean) {
            const s = EditorEngineCore.getState() as any;
            if (s.setNodeLocked) return s.setNodeLocked(id, locked);
            const n = R.getNode(id); if (!n) return;
            const next = { ...n, locked };
            EditorEngineCore.updatePatch(({ get, patchProject }) => {
                const prev = get(); patchProject({ nodes: { ...prev.project.nodes, [id]: next } });
            });
        },
        moveNode(nodeId: NodeId, newParentId: NodeId, newIndex = 0) {
            const s = EditorEngineCore.getState() as any;
            if (s.moveNode) return s.moveNode(nodeId, newParentId, newIndex);
            EditorEngineCore.updatePatch(({ get, patchProject }) => {
                const prev = get();
                const nodes = { ...prev.project.nodes };
                const node = nodes[nodeId];
                const parent = nodes[newParentId];
                if (!node || !parent) return;
                // 모든 부모에서 제거
                Object.keys(nodes).forEach((k) => {
                    const nk = nodes[k];
                    if (Array.isArray(nk.children) && nk.children.includes(nodeId)) {
                        nodes[k] = { ...nk, children: nk.children.filter((cid: string) => cid !== nodeId) };
                    }
                });
                const kids = Array.isArray(parent.children) ? [...parent.children] : [];
                const idx = Math.max(0, Math.min(newIndex ?? kids.length, kids.length));
                kids.splice(idx, 0, nodeId);
                nodes[newParentId] = { ...parent, children: kids };
                patchProject({ nodes });
            });
        },
        removeNode(nodeId: NodeId) {
            const n = R.getNode(nodeId); if (!n) return;
            EditorEngineCore.updatePatch(({ get, patchProject }) => {
                const prev = get();
                const nodes = { ...prev.project.nodes };
                // 부모들에서 분리
                Object.keys(nodes).forEach((k) => {
                    const nk = nodes[k];
                    if (Array.isArray(nk.children) && nk.children.includes(nodeId)) {
                        nodes[k] = { ...nk, children: nk.children.filter((cid: string) => cid !== nodeId) };
                    }
                });
                delete nodes[nodeId];
                patchProject({ nodes });
            });
        },
        removeNodeCascade(nodeId: NodeId) {
            EditorEngineCore.updatePatch(({ get, patchProject }) => {
                const prev = get();
                const nodes = { ...prev.project.nodes };
                const detach = (id: NodeId) => {
                    Object.keys(nodes).forEach((k) => {
                        const nk = nodes[k];
                        if (Array.isArray(nk.children) && nk.children.includes(id)) {
                            nodes[k] = { ...nk, children: nk.children.filter((cid: string) => cid !== id) };
                        }
                    });
                };
                const removeDeep = (id: NodeId) => {
                    const n = nodes[id]; if (!n) return;
                    if (Array.isArray(n.children)) n.children.forEach(removeDeep);
                    delete nodes[id];
                };
                detach(nodeId); removeDeep(nodeId);
                patchProject({ nodes });
            });
        },
        updateNodeProps(nodeId: NodeId, props: Record<string, unknown>) {
            const s = EditorEngineCore.getState() as any;
            if (s.updateNodeProps) return s.updateNodeProps(nodeId, props);
            const n = R.getNode(nodeId); if (!n) return;
            const next = { ...n, props: { ...n.props, ...props } };
            EditorEngineCore.updatePatch(({ get, patchProject }) => {
                const prev = get(); patchProject({ nodes: { ...prev.project.nodes, [nodeId]: next } });
            });
        },
        updateNodeStyles(nodeId: NodeId, styles: CSSDict) {
            const s = EditorEngineCore.getState() as any;
            if (s.updateNodeStyles) return s.updateNodeStyles(nodeId, styles);
            const n = R.getNode(nodeId); if (!n) return;
            const next = { ...n, styles: { ...n.styles, ...(styles as any) } };
            EditorEngineCore.updatePatch(({ get, patchProject }) => {
                const prev = get(); patchProject({ nodes: { ...prev.project.nodes, [nodeId]: next } });
            });
        },
    };

    return { reader: R, writer: W } as const;
}