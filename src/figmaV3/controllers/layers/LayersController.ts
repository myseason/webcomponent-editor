'use client';

import { useMemo } from 'react';
import { EditorEngine } from '../../engine/EditorEngine';
import type { NodeId, Node } from '../../core/types';
import { getDefinition } from '../../core/registry';

/** 내부 헬퍼: 스토어에서 parentId 안전 조회 */
function getParentIdSafe(id: NodeId): NodeId | null {
    const st = EditorEngine.getState() as any;
    const n = st?.project?.nodes?.[id];
    const p: NodeId | undefined = n?.parentId as NodeId | undefined;
    return p ?? null;
}

export interface LayersReader {
    useSelectedNodeId(): NodeId | null;
    getSelectedNodeId(): NodeId | null;

    getNodeById(id: NodeId): Node | undefined;
    /** 과거 호출 호환 */
    getNode(id: NodeId): Node | undefined;

    getChildrenIds(id: NodeId): ReadonlyArray<NodeId>;
    /** 과거 호출 호환 */
    getChildren(id: NodeId): ReadonlyArray<NodeId>;

    isContainer(id: NodeId): boolean;

    /** 리렌더 토큰 */
    nodesToken(): string;
    /** 과거 호출 호환 */
    selectedNodeId(): NodeId | null;

    /** 프래그먼트/프로젝트 정보 (기존 레이어 패널 의존) */
    editingFragmentId(): string | null;
    getFragmentById(id: string | null): any | null;
    getProjectRootId(): NodeId | null;

    /** 컨테이너 탐색 */
    nearestContainer(id: NodeId): NodeId | null;
}

export interface LayersWriter {
    setSelectedNodeId(id: NodeId | null): void;
    toggleHidden(id: NodeId): void;
    toggleLocked(id: NodeId): void;

    moveNode(nodeId: NodeId, newParentId: NodeId, index?: number): void;
    appendChild(parentId: NodeId, childId: NodeId, index?: number): void;

    /** 과거 호출 호환 */
    removeNode(nodeId: NodeId): void;
    removeCascade(nodeId: NodeId): void;
}

export interface LayersController {
    reader(): LayersReader;
    writer(): LayersWriter;
}

function buildReader(): LayersReader {
    return {
        useSelectedNodeId(): NodeId | null {
            const sel = EditorEngine.nodes.getSelectedNodeId();
            return sel ?? null;
        },
        getSelectedNodeId(): NodeId | null {
            const sel = EditorEngine.nodes.getSelectedNodeId();
            return sel ?? null;
        },

        getNodeById(id: NodeId): Node | undefined {
            return EditorEngine.nodes.getNodeById(id);
        },
        getNode(id: NodeId): Node | undefined {
            return EditorEngine.nodes.getNodeById(id);
        },

        getChildrenIds(id: NodeId): ReadonlyArray<NodeId> {
            // Engine에 전용 API가 있으면 교체; 없으면 store에서 안전 조회
            const st = EditorEngine.getState() as any;
            const node = st?.project?.nodes?.[id];
            const children: ReadonlyArray<NodeId> = (node?.children as NodeId[] | undefined) ?? [];
            return children;
        },
        getChildren(id: NodeId): ReadonlyArray<NodeId> {
            return this.getChildrenIds(id);
        },

        isContainer(id: NodeId): boolean {
            const n = EditorEngine.nodes.getNodeById(id) as any;
            if (!n) return false;
            const def = getDefinition(n.componentId);
            if (!def) return false;
            // 정책: capabilities 우선, 보조로 'Box' id/title
            return !!def.capabilities?.canHaveChildren || def.id === 'Box' || def.title === 'Box';
        },

        nodesToken(): string {
            const st = EditorEngine.getState() as any;
            const sel: string = (st?.ui?.selectedId as string | undefined) ?? '';
            const ver: string = (st?.__version__ as string | undefined) ?? '';
            return `${sel}|${ver}`;
        },
        selectedNodeId(): NodeId | null {
            const sel = EditorEngine.nodes.getSelectedNodeId();
            return sel ?? null;
        },

        editingFragmentId(): string | null {
            const st = EditorEngine.getState() as any;
            const id: string | undefined = st?.ui?.editingFragmentId as string | undefined;
            return id ?? null;
        },
        getFragmentById(id: string | null): any | null {
            if (!id) return null;
            const st = EditorEngine.getState() as any;
            const frags: any[] = (st?.project?.fragments as any[]) ?? [];
            const found: any | undefined = frags.find((f) => f?.id === id);
            return found ?? null;
        },
        getProjectRootId(): NodeId | null {
            const st = EditorEngine.getState() as any;
            const rid: NodeId | undefined = st?.project?.rootId as NodeId | undefined;
            return rid ?? null;
        },

        nearestContainer(startId: NodeId): NodeId | null {
            let cur: NodeId | null = startId;
            while (cur) {
                if (this.isContainer(cur)) return cur;
                const parentId: NodeId | null = getParentIdSafe(cur);
                cur = parentId;
            }
            return null;
        },
    };
}

function buildWriter(): LayersWriter {
    return {
        setSelectedNodeId(id: NodeId | null): void {
            EditorEngine.nodes.setSelectedNodeId(id ?? null);
        },
        toggleHidden(id: NodeId): void {
            EditorEngine.update((draft) => {
                const n = draft.project.nodes[id] as any;
                if (!n) return;
                n.hidden = !n.hidden;
            }, true);
        },
        toggleLocked(id: NodeId): void {
            EditorEngine.update((draft) => {
                const n = draft.project.nodes[id] as any;
                if (!n) return;
                n.locked = !n.locked;
            }, true);
        },

        moveNode(nodeId: NodeId, newParentId: NodeId, index?: number): void {
            // Engine에 moveNode가 있으면 사용, 없으면 간단 구현
            if (typeof (EditorEngine.nodes as any).moveNode === 'function') {
                (EditorEngine.nodes as any).moveNode(nodeId, newParentId, index);
                return;
            }

            // 간이 구현: 기존 부모에서 제거 → 새 부모 children에 삽입
            const prevParentId: NodeId | null = getParentIdSafe(nodeId);

            EditorEngine.update((draft) => {
                // 1) 기존 부모에서 분리
                if (prevParentId) {
                    const p: any = draft.project.nodes[prevParentId];
                    if (p?.children) {
                        const arr: NodeId[] = (p.children as NodeId[]).slice();
                        const idx = arr.indexOf(nodeId);
                        if (idx >= 0) arr.splice(idx, 1);
                        p.children = arr as any;
                    }
                }

                // 2) 새 부모에 삽입
                const newParent: any = draft.project.nodes[newParentId];
                if (newParent) {
                    const arr: NodeId[] = ((newParent.children as NodeId[] | undefined) ?? []).slice();
                    const at: number = typeof index === 'number' ? Math.max(0, Math.min(index, arr.length)) : arr.length;
                    arr.splice(at, 0, nodeId);
                    newParent.children = arr as any;
                }

                // 3) 노드 parentId 갱신
                const n: any = draft.project.nodes[nodeId];
                if (n) n.parentId = newParentId;
            }, true);
        },

        appendChild(parentId: NodeId, childId: NodeId, index?: number): void {
            // append = move로 에뮬레이트
            this.moveNode(childId, parentId, index);
        },

        removeNode(nodeId: NodeId): void {
            // 호환용: removeCascade와 동일 처리
            this.removeCascade(nodeId);
        },
        removeCascade(nodeId: NodeId): void {
            // 간단 제거: 부모 children에서 끊고, 노드 삭제(하위는 단순 삭제)
            const parentId: NodeId | null = getParentIdSafe(nodeId);

            EditorEngine.update((draft) => {
                // 부모에서 제거
                if (parentId) {
                    const p: any = draft.project.nodes[parentId];
                    const arr: NodeId[] = ((p?.children as NodeId[] | undefined) ?? []).slice();
                    const idx = arr.indexOf(nodeId);
                    if (idx >= 0) {
                        arr.splice(idx, 1);
                        if (p) p.children = arr as any;
                    }
                }

                // 해당 노드 및 하위 삭제(간단 재귀)
                const removeRecursive = (id: NodeId) => {
                    const n: any = draft.project.nodes[id];
                    if (!n) return;
                    const kids: NodeId[] = ((n.children as NodeId[] | undefined) ?? []).slice();
                    for (const cid of kids) removeRecursive(cid);
                    delete (draft.project.nodes as any)[id];
                };
                removeRecursive(nodeId);
            }, true);
        },
    };
}

export function useLayersController(): LayersController {
    const R: LayersReader = useMemo(() => buildReader(), []);
    const W: LayersWriter = useMemo(() => buildWriter(), []);
    return useMemo<LayersController>(() => ({ reader: () => R, writer: () => W }), [R, W]);
}