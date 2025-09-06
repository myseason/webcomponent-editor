'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { EditorEngine } from '../../engine/EditorEngine';
import type { NodeId, Node } from '../../core/types';
import { getDefinition } from '../../core/registry';

/** Layers 패널이 기대하는 Outline 아이템 */
export type OutlineItem = {
    id: NodeId;
    name: string;
    depth: number;
    parentId: NodeId | null;
    children: ReadonlyArray<NodeId>;
    hasChildren: boolean;
    componentId: string;
    hidden?: boolean;
    locked?: boolean;
    selected?: boolean;
};

export interface LayersReader {

    useNodesToken(): string;

    useOutline(): ReadonlyArray<OutlineItem>;
    useSelectedNodeId(): NodeId | null;

    selectedNodeId(): NodeId | null;
    getSelectedNodeId(): NodeId | null;
    getNodeById(id: NodeId): Node | undefined;
    getNode(id: NodeId): Node | undefined;
    getChildrenIds(id: NodeId): ReadonlyArray<NodeId>;
    getChildren(id: NodeId): ReadonlyArray<NodeId>;
    isContainer(id: NodeId): boolean;
    editingFragmentId(): string | null;
    getFragmentById(id: string | null): any | null;
    getProjectRootId(): NodeId | null;
    nearestContainer(id: NodeId): NodeId | null;

    /** 변경 감지용 초경량 토큰 */
    nodesToken(): string;
}

export interface LayersWriter {
    setSelectedNodeId(id: NodeId | null): void;
    toggleHidden(id: NodeId): void; // isVisible 기준 토글(+ hidden 동기화)
    toggleLocked(id: NodeId): void;
    moveNode(nodeId: NodeId, newParentId: NodeId, index?: number): void;
    appendChild(parentId: NodeId, childId: NodeId, index?: number): void;
    removeNode(nodeId: NodeId): void;
    removeCascade(nodeId: NodeId): void;
}

export interface LayersController {
    reader(): LayersReader;
    writer(): LayersWriter;
}

/* ---------------- 내부 유틸 ---------------- */

function S(): any {
    return EditorEngine.getState() as any;
}
function parentIdOf(id: NodeId): NodeId | null {
    const n = S()?.project?.nodes?.[id];
    return (n?.parentId as NodeId | undefined) ?? null;
}
function isContainerByDef(n: any): boolean {
    if (!n) return false;
    const def = getDefinition(n.componentId);
    if (!def) return false;
    return !!def.capabilities?.canHaveChildren || def.id === 'Box' || def.title === 'Box';
}
function outlineRootId(): NodeId | null {
    const st = S();
    const fragId: string | null = (st?.ui?.editingFragmentId as string | undefined) ?? null;
    if (fragId) {
        const frag = (st?.project?.fragments as any[] | undefined)?.find((f) => f?.id === fragId);
        return frag?.rootId ?? null;
    }
    return (st?.project?.rootId as NodeId | undefined) ?? null;
}

/** 🔑 초경량 신호: draft.ui.__layersTick 을 증가시키고 토큰은 그 값만 본다 */
function bumpLayersTick(draft: any) {
    draft.ui = draft.ui ?? {};
    const cur = (draft.ui.__layersTick as number | undefined) ?? 0;
    draft.ui.__layersTick = cur + 1;
}
function layersToken(): string {
    const st = S();
    const tick = (st?.ui?.__layersTick as number | undefined) ?? 0;
    const sel = String(st?.ui?.selectedId ?? '');
    const root = String(outlineRootId() ?? '');
    // 선택/루트가 바뀌면 토큰도 바뀌도록 포함
    return `${tick}|${sel}|${root}`;
}

/* ---------------- Outline 계산 (필요 시에만) ---------------- */

function buildOutline(): ReadonlyArray<OutlineItem> {
    const st = S();
    const nodes: Record<string, any> = st?.project?.nodes ?? {};
    const selectedId: string | null = (st?.ui?.selectedId as string | undefined) ?? null;
    const rootId = outlineRootId();
    if (!rootId || !nodes[rootId]) return [];

    const out: OutlineItem[] = [];
    const visit = (id: string, depth: number, parentId: string | null) => {
        const n = nodes[id];
        if (!n) return;
        const children: string[] = (n.children ?? []) as string[];
        out.push({
            id: id as NodeId,
            name: String(n.name ?? n.componentId ?? 'Node'),
            depth,
            parentId: parentId as NodeId | null,
            children: children as ReadonlyArray<NodeId>,
            hasChildren: children.length > 0,
            componentId: String(n.componentId ?? ''),
            hidden: !!n.hidden,
            locked: !!n.locked,
            selected: selectedId === id,
        });
        for (const cid of children) visit(cid, depth + 1, id);
    };
    visit(rootId, 0, null);
    return out;
}

/* ---------------- 구독기 ---------------- */

function createSubscribe(onChange: () => void) {
    // 엔진 스토어 변경 시 tick/token만 체크 (전수 스캔 없음)
    return EditorEngine.subscribe(() => {
        // tick 변화 또는 선택/루트 변화만 보면 된다
        onChange();
    });
}

export function useLayersController(): LayersController {
    /* ---------- Reader ---------- */
    const reader: LayersReader = useMemo(() => {
        // 캐시된 참조를 유지하기 위해 ref 대신 클로저 + useSyncExternalStore 조합
        let outlineCache = buildOutline();
        let selectedCache: NodeId | null = (S()?.ui?.selectedId as NodeId | undefined) ?? null;
        let tokenCache = layersToken();

        const subscribe = (notify: () => void) =>
            createSubscribe(() => {
                const nextToken = layersToken();
                if (nextToken !== tokenCache) {
                    tokenCache = nextToken;
                    // 필요한 시점에만 재계산 (빠름)
                    outlineCache = buildOutline();
                    selectedCache = (S()?.ui?.selectedId as NodeId | undefined) ?? null;
                    notify();
                }
            });

        const useOutlineHook = (): ReadonlyArray<OutlineItem> =>
            useSyncExternalStore(
                subscribe,
                () => outlineCache,
                () => outlineCache
            );

        const useSelectionHook = (): NodeId | null =>
            useSyncExternalStore(
                subscribe,
                () => selectedCache,
                () => selectedCache
            );

        const useNodesTokenHook = (): string =>
            useSyncExternalStore(subscribe, () => tokenCache, () => tokenCache);

        return {
            useOutline: useOutlineHook,
            useSelectedNodeId: useSelectionHook,
            useNodesToken: useNodesTokenHook, // ✅ 추가

            selectedNodeId(): NodeId | null {
                return (S()?.ui?.selectedId as NodeId | undefined) ?? null;
            },
            getSelectedNodeId(): NodeId | null {
                return this.selectedNodeId();
            },

            getNodeById(id: NodeId): Node | undefined {
                return (S()?.project?.nodes?.[id] as Node | undefined) ?? undefined;
            },
            getNode(id: NodeId): Node | undefined {
                return this.getNodeById(id);
            },

            getChildrenIds(id: NodeId): ReadonlyArray<NodeId> {
                const node = S()?.project?.nodes?.[id];
                return ((node?.children as NodeId[] | undefined) ?? []) as ReadonlyArray<NodeId>;
            },
            getChildren(id: NodeId): ReadonlyArray<NodeId> {
                return this.getChildrenIds(id);
            },

            isContainer(id: NodeId): boolean {
                const n = this.getNodeById(id) as any;
                return isContainerByDef(n);
            },

            editingFragmentId(): string | null {
                return (S()?.ui?.editingFragmentId as string | undefined) ?? null;
            },
            getFragmentById(id: string | null): any | null {
                if (!id) return null;
                const frags: any[] = (S()?.project?.fragments as any[]) ?? [];
                return frags.find((f) => f?.id === id) ?? null;
            },
            getProjectRootId(): NodeId | null {
                return (S()?.project?.rootId as NodeId | undefined) ?? null;
            },

            nearestContainer(startId: NodeId): NodeId | null {
                let cur: NodeId | null = startId;
                while (cur) {
                    if (this.isContainer(cur)) return cur;
                    cur = parentIdOf(cur);
                }
                return null;
            },

            nodesToken(): string {
                return tokenCache;
            },
        };
    }, []);

    /* ---------- Writer ---------- */
    const writer: LayersWriter = useMemo(() => {
        return {
            setSelectedNodeId(id: NodeId | null): void {
                if ((EditorEngine as any).nodes?.setSelectedNodeId) {
                    (EditorEngine as any).nodes.setSelectedNodeId(id ?? null);
                    // 엔진이 내부에서 tick을 올리지 않는 경우를 대비
                    EditorEngine.update((draft: any) => bumpLayersTick(draft), true);
                    return;
                }
                EditorEngine.update((draft: any) => {
                    draft.ui = draft.ui ?? {};
                    draft.ui.selectedId = id ?? null;
                    bumpLayersTick(draft);
                }, true);
            },

            toggleHidden(id: NodeId): void {
                EditorEngine.update((draft: any) => {
                    const n = draft.project.nodes[id];
                    if (!n) return;
                    const wasVisible = (n as any).isVisible !== false; // undefined는 visible 취급
                    const nowVisible = !wasVisible;
                    (n as any).isVisible = nowVisible;
                    (n as any).hidden = !nowVisible; // 호환 필드 동기화
                    bumpLayersTick(draft);
                }, true);
            },

            toggleLocked(id: NodeId): void {
                EditorEngine.update((draft: any) => {
                    const n = draft.project.nodes[id];
                    if (!n) return;
                    n.locked = !n.locked;
                    bumpLayersTick(draft);
                }, true);
            },

            moveNode(nodeId: NodeId, newParentId: NodeId, index?: number): void {
                if ((EditorEngine as any).nodes?.moveNode) {
                    (EditorEngine as any).nodes.moveNode(nodeId, newParentId, index);
                    EditorEngine.update((draft: any) => bumpLayersTick(draft), true);
                    return;
                }
                const prevParentId: NodeId | null = parentIdOf(nodeId);
                EditorEngine.update((draft: any) => {
                    if (prevParentId) {
                        const p = draft.project.nodes[prevParentId];
                        if (p?.children) {
                            const arr = (p.children as NodeId[]).slice();
                            const i = arr.indexOf(nodeId);
                            if (i >= 0) arr.splice(i, 1);
                            p.children = arr;
                        }
                    }
                    const newParent = draft.project.nodes[newParentId];
                    if (newParent) {
                        const arr = ((newParent.children as NodeId[] | undefined) ?? []).slice();
                        const at = typeof index === 'number' ? Math.max(0, Math.min(index, arr.length)) : arr.length;
                        arr.splice(at, 0, nodeId);
                        newParent.children = arr;
                    }
                    const n = draft.project.nodes[nodeId];
                    if (n) n.parentId = newParentId;

                    bumpLayersTick(draft);
                }, true);
            },

            appendChild(parentId: NodeId, childId: NodeId, index?: number): void {
                this.moveNode(childId, parentId, index);
            },

            removeNode(nodeId: NodeId): void {
                this.removeCascade(nodeId);
            },

            removeCascade(nodeId: NodeId): void {
                const prevParentId = parentIdOf(nodeId);
                EditorEngine.update((draft: any) => {
                    if (prevParentId) {
                        const p = draft.project.nodes[prevParentId];
                        const arr: NodeId[] = ((p?.children as NodeId[] | undefined) ?? []).slice();
                        const idx = arr.indexOf(nodeId);
                        if (idx >= 0) {
                            arr.splice(idx, 1);
                            if (p) p.children = arr;
                        }
                    }
                    const removeRecursive = (id: NodeId) => {
                        const n = draft.project.nodes[id];
                        if (!n) return;
                        const kids: NodeId[] = ((n.children as NodeId[] | undefined) ?? []).slice();
                        for (const cid of kids) removeRecursive(cid);
                        delete draft.project.nodes[id];
                    };
                    removeRecursive(nodeId);

                    bumpLayersTick(draft);
                }, true);
            },
        };
    }, []);

    return useMemo(() => ({ reader: () => reader, writer: () => writer }), [reader, writer]);
}