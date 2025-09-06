'use client';

import { useRef, useSyncExternalStore } from 'react';
import { EditorEngine } from '../../engine/EditorEngine';

// 레포 타입 의존을 최소화(엔진 파사드 안정화 시 좁혀갑니다)
type EditorState = any;
type Project = any;
type EditorUI = any;
type NodeId = string;

export interface LeftReader {
    project(): Project;
    ui(): EditorUI;

    /** Layers 패널 등에서 쓰는 outline 데이터(엔진 파사드 우선, 폴백은 계산/저장된 값 가정) */
    outline(): any[]; // OutlineItem[]

    /** 선택/탐색 */
    selectedNodeId(): NodeId | null;
    nodeById(id: NodeId): any | undefined;

    /** 레거시 state 표면 호환 */
    // ex) state.flowEdges 등을 썼던 것처럼 과거 코드가 기대하는 읽기 키를 필요 시 여기에 추가
}

export interface LeftWriter {
    /** 공통 update + 알림 */
    update(mutator: (draft: EditorState) => void): void;
    setNotification(message: string): void;

    /** Layers 패널: 노드 조작 */
    setSelectedNodeId(id: NodeId | null): void;
    moveNode(nodeId: NodeId, newParentId: NodeId, index?: number): void;
    appendChild(parentId: NodeId, childId: NodeId): void;
    removeCascade(nodeId: NodeId): void;
    toggleHidden(nodeId: NodeId): void;
    toggleLocked(nodeId: NodeId): void;

    /** Pages 패널 */
    addPage(name?: string): string;
    removePage(id: string): void;
    renamePage(id: string, name: string): void;
    setCurrentPage(id: string): void;

    /** Palette/Components/Assets 등에서 드롭으로 노드 생성/삽입 */
    createNode(def: any, parentId?: NodeId, index?: number): NodeId;

    /** 레거시 메서드 이름 호환(기존 코드가 그대로 호출) */
    getNode?(id: NodeId): any; // Reader 계층에 가깝지만, 호환을 위해 Writer에 프록시 제공
}

export function useLeftPanelController(): { reader: () => LeftReader; writer: () => LeftWriter } {
    // 스냅샷 캐시(무한루프 경고 방지)
    const cacheRef = useRef<{ state: any; sel: NodeId | null } | null>(null);

    const subscribe = (cb: () => void) =>
        EditorEngine.subscribe(() => {
            const s = EditorEngine.getState();
            cacheRef.current = {
                state: s,
                sel: (s.ui?.selectedId ?? null) as NodeId | null,
            };
            cb();
        });

    const getSnapshot = () => {
        if (!cacheRef.current) {
            const s = EditorEngine.getState();
            cacheRef.current = { state: s, sel: (s.ui?.selectedId ?? null) as NodeId | null };
        }
        return cacheRef.current!;
    };

    const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    // ---------- Reader ----------
    const R: LeftReader = {
        project() {
            return snap.state.project as Project;
        },
        ui() {
            return snap.state.ui as EditorUI;
        },
        outline() {
            const f = (EditorEngine as any).layers?.outline;
            if (typeof f === 'function') return f(); // 파사드가 있으면 사용
            // 폴백: 없으면 빈 배열(기존 계산은 각 패널 개별 셀렉터가 담당할 수도 있음)
            return [];
        },
        selectedNodeId() {
            return cacheRef.current?.sel ?? null;
        },
        nodeById(id: NodeId) {
            return snap.state.project?.nodes?.[id];
        },
    };

    // ---------- Writer ----------
    const W: LeftWriter = {
        update(mutator) {
            EditorEngine.update(mutator as any);
        },
        setNotification(msg) {
            (EditorEngine as any).ui?.setNotification?.(msg) ?? console.info('[notification]', msg);
        },

        setSelectedNodeId(id) {
            const f = (EditorEngine as any).ui?.setSelectedId;
            if (typeof f === 'function') return f(id);
            EditorEngine.update((draft: any) => {
                draft.ui = draft.ui || {};
                draft.ui.selectedId = id;
            });
        },

        moveNode(nodeId, newParentId, index) {
            const f = (EditorEngine as any).nodes?.move;
            if (typeof f === 'function') return f(nodeId, newParentId, index);
            EditorEngine.update((draft: any) => {
                const node = draft.project.nodes[nodeId];
                const oldParent = draft.project.nodes[node.parentId];
                const newParent = draft.project.nodes[newParentId];
                if (!node || !oldParent || !newParent) return;
                oldParent.children = (oldParent.children ?? []).filter((id: string) => id !== nodeId);
                node.parentId = newParentId;
                newParent.children = newParent.children ?? [];
                const idx = Math.max(0, Math.min(newParent.children.length, index ?? newParent.children.length));
                newParent.children.splice(idx, 0, nodeId);
            });
        },

        appendChild(parentId, childId) {
            const f = (EditorEngine as any).nodes?.appendChild;
            if (typeof f === 'function') return f(parentId, childId);
            EditorEngine.update((draft: any) => {
                const parent = draft.project.nodes[parentId];
                const child = draft.project.nodes[childId];
                if (!parent || !child) return;
                child.parentId = parentId;
                parent.children = parent.children ?? [];
                parent.children.push(childId);
            });
        },

        removeCascade(nodeId) {
            const f = (EditorEngine as any).nodes?.removeCascade;
            if (typeof f === 'function') return f(nodeId);
            EditorEngine.update((draft: any) => {
                const removeRec = (id: string) => {
                    const n = draft.project.nodes[id];
                    if (!n) return;
                    (n.children ?? []).forEach(removeRec);
                    delete draft.project.nodes[id];
                };
                const node = draft.project.nodes[nodeId];
                if (!node) return;
                const parent = draft.project.nodes[node.parentId];
                if (parent?.children) parent.children = parent.children.filter((id: string) => id !== nodeId);
                removeRec(nodeId);
            });
        },

        toggleHidden(nodeId) {
            const f = (EditorEngine as any).nodes?.toggleHidden;
            if (typeof f === 'function') return f(nodeId);
            EditorEngine.update((draft: any) => {
                const n = draft.project.nodes[nodeId];
                if (!n) return;
                n.hidden = !Boolean(n.hidden);
            });
        },

        toggleLocked(nodeId) {
            const f = (EditorEngine as any).nodes?.toggleLocked;
            if (typeof f === 'function') return f(nodeId);
            EditorEngine.update((draft: any) => {
                const n = draft.project.nodes[nodeId];
                if (!n) return;
                n.locked = !Boolean(n.locked);
            });
        },

        addPage(name) {
            const f = (EditorEngine as any).pages?.add;
            if (typeof f === 'function') return f(name);
            const id = `page_${Date.now()}`;
            EditorEngine.update((draft: any) => {
                draft.project.pages = draft.project.pages || [];
                draft.project.pages.push({ id, name: name ?? 'Untitled' });
            });
            return id;
        },
        removePage(id) {
            const f = (EditorEngine as any).pages?.remove;
            if (typeof f === 'function') return f(id);
            EditorEngine.update((draft: any) => {
                draft.project.pages = (draft.project.pages ?? []).filter((p: any) => p.id !== id);
                if (draft.ui?.currentPageId === id) {
                    draft.ui.currentPageId = draft.project.pages?.[0]?.id ?? null;
                }
            });
        },
        renamePage(id, name) {
            const f = (EditorEngine as any).pages?.rename;
            if (typeof f === 'function') return f(id, name);
            EditorEngine.update((draft: any) => {
                const p = (draft.project.pages ?? []).find((x: any) => x.id === id);
                if (p) p.name = name;
            });
        },
        setCurrentPage(id) {
            const f = (EditorEngine as any).pages?.setCurrent;
            if (typeof f === 'function') return f(id);
            EditorEngine.update((draft: any) => {
                draft.ui = draft.ui || {};
                draft.ui.currentPageId = id;
            });
        },

        createNode(def, parentId, index) {
            const f = (EditorEngine as any).nodes?.create;
            if (typeof f === 'function') return f(def, parentId, index);
            let newId: NodeId = `node_${Date.now()}`;
            EditorEngine.update((draft: any) => {
                draft.project.nodes = draft.project.nodes || {};
                draft.project.nodes[newId] = {
                    id: newId,
                    type: def?.type ?? 'Box',
                    props: def?.props ?? {},
                    styles: def?.styles ?? {},
                    children: [],
                    parentId: parentId ?? draft.project.rootId,
                };
                const pid = parentId ?? draft.project.rootId;
                const parent = draft.project.nodes[pid];
                parent.children = parent.children ?? [];
                const idx = Math.max(0, Math.min(parent.children.length, index ?? parent.children.length));
                parent.children.splice(idx, 0, newId);
            });
            return newId;
        },

        // 레거시 호환: getNode (기존 코드가 state.getNode(...)를 호출하는 경우)
        getNode(id: NodeId) {
            const f = (EditorEngine as any).nodes?.get;
            if (typeof f === 'function') return f(id);
            const s = EditorEngine.getState();
            return s?.project?.nodes?.[id];
        },
    };

    return { reader: () => R, writer: () => W };
}