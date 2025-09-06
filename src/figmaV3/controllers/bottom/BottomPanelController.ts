'use client';

import { useRef, useSyncExternalStore } from 'react';
import { EditorEngine } from '../../engine/EditorEngine';
import type { EditorStoreState } from '../../store/types';

// 프로젝트 타입들이 리포 내 위치에 따라 다를 수 있어 any를 일부 허용합니다.
// (엔진 파사드가 정식화되면 좁혀 나가면 됩니다)
type Project = any;
type NodeId = string;
type Viewport = string;
type ViewportMode = string;
type CSSDict = Record<string, string | number>;
type EditorState = any;

export interface BottomReader {
    project(): Project;
    ui(): EditorStoreState['ui'];
    data(): any;
    history(): any;
    selectedNodeId(): NodeId | null;
    rootNodeId(): NodeId;
    activeViewport(): Viewport;
    viewportMode(vp: Viewport): ViewportMode;
    getEffectiveDecl(nodeId: NodeId): CSSDict;
    nodeById(id: NodeId): Project['nodes'][string] | undefined;

    /** Bottom 패널들이 기대하는 레거시 표면 */
    flowEdges(): Record<string, any>;
}

export interface BottomWriter {
    // 공통
    update(mutator: (draft: EditorState) => void): void;
    setNotification(message: string): void;

    // 스타일/프로퍼티
    updateNodeStyles(nodeId: NodeId, patch: CSSDict, viewport?: Viewport): void;
    updateNodeProps(nodeId: NodeId, props: Record<string, unknown>): void;

    // UI / Dock
    toggleBottomDock(): void;

    // Flows(Edges)
    addFlowEdge(edge: any): void;
    removeFlowEdge(id: string): void;
    updateFlowEdge(id: string, patch: any): void;

    // Fragments
    addFragment(name: string): void;
    openFragment(id: string): void;
    closeFragment(id: string): void;
    removeFragment(id: string): void;

    // (선택) 엔진이 노출하는 서브 파사드 통째 공개
    actions?: any;
    flows?: any;
    fragments?: any;
    dataOps?: any;
}

/**
 * Bottom 패널 전용 컨트롤러
 * - View는 이 훅만 사용 (헥사고날 규칙)
 * - 내부는 EditorEngine 파사드만 사용
 * - 파사드에 없으면 안전한 폴백(update)로 구현
 * - useSyncExternalStore + 스냅샷 캐시로 무한루프 경고 방지
 */
export function useBottomPanelController(): { reader: () => BottomReader; writer: () => BottomWriter } {
    // ---------- 스냅샷 캐시 ----------
    const cacheRef = useRef<{
        state: EditorStoreState;
        nodeId: NodeId | null;
    } | null>(null);

    const subscribe = (cb: () => void) =>
        EditorEngine.subscribe(() => {
            const s = EditorEngine.getState() as EditorStoreState;
            cacheRef.current = {
                state: s,
                nodeId: (s.ui?.selectedId ?? null) as NodeId | null,
            };
            cb();
        });

    const getSnapshot = () => {
        if (!cacheRef.current) {
            const s = EditorEngine.getState() as EditorStoreState;
            cacheRef.current = {
                state: s,
                nodeId: (s.ui?.selectedId ?? null) as NodeId | null,
            };
        }
        return cacheRef.current!;
    };

    const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    // ---------- Reader ----------
    const reader: BottomReader = {
        project() {
            return snap.state.project as Project;
        },
        ui() {
            return snap.state.ui;
        },
        data() {
            return (snap.state as any).data ?? {};
        },
        history() {
            return (snap.state as any).history ?? {};
        },
        selectedNodeId() {
            return cacheRef.current?.nodeId ?? null;
        },
        rootNodeId() {
            return (snap.state.project as any).rootId as NodeId;
        },
        activeViewport() {
            return (snap.state.ui as any).canvas?.activeViewport as Viewport;
        },
        viewportMode(vp: Viewport) {
            const vpMode = (snap.state.ui as any).canvas?.vpMode ?? {};
            return (vpMode as Record<Viewport, ViewportMode>)[vp];
        },
        getEffectiveDecl(nodeId: NodeId) {
            const S = snap.state as any;
            return (S.getEffectiveDecl?.(nodeId) ?? {}) as CSSDict;
        },
        nodeById(id: NodeId) {
            return (snap.state.project as any).nodes?.[id];
        },

        // ---- 레거시 표면: flowEdges() ----
        flowEdges() {
            // 엔진에 정식 제공 시 우선 사용
            const edgesFromFacade = (EditorEngine as any).flows?.edges?.();
            if (edgesFromFacade) return edgesFromFacade;
            // 폴백: state.data.__flowEdges 객체
            const data = (snap.state as any).data ?? {};
            return (data.__flowEdges ?? {}) as Record<string, any>;
        },
    };

    // ---------- Writer ----------
    const writer: BottomWriter = {
        update(mutator) {
            EditorEngine.update(mutator as any);
        },
        setNotification(message: string) {
            (EditorEngine as any).ui?.setNotification?.(message) ?? console.info('[notification]', message);
        },

        updateNodeStyles(nodeId, patch, viewport) {
            (EditorEngine as any).nodes?.updateNodeStyles?.(nodeId, patch, viewport) ??
            EditorEngine.update((draft: any) => {
                const st = draft.project?.nodes?.[nodeId]?.styles ?? (draft.project.nodes[nodeId].styles = {});
                Object.assign(st, patch);
            });
        },
        updateNodeProps(nodeId, props) {
            (EditorEngine as any).nodes?.updateNodeProps?.(nodeId, props) ??
            EditorEngine.update((draft: any) => {
                const p = draft.project?.nodes?.[nodeId]?.props ?? (draft.project.nodes[nodeId].props = {});
                Object.assign(p, props);
            });
        },

        // ---- UI / Dock ----
        toggleBottomDock() {
            const f = (EditorEngine as any).ui?.toggleBottomDock;
            if (typeof f === 'function') return f();
            // 폴백: ui.panels.bottom.isCollapsed 토글
            EditorEngine.update((draft: any) => {
                draft.ui = draft.ui || {};
                draft.ui.panels = draft.ui.panels || {};
                draft.ui.panels.bottom = draft.ui.panels.bottom || {};
                const cur = draft.ui.panels.bottom;
                cur.isCollapsed = !Boolean(cur.isCollapsed);
            });
        },

        // ---- Flows(Edges) ----
        addFlowEdge(edge) {
            const f = (EditorEngine as any).flows?.addEdge;
            if (typeof f === 'function') return f(edge);
            EditorEngine.update((draft: any) => {
                draft.data = draft.data || {};
                const obj = draft.data.__flowEdges ?? {};
                const id = edge?.id ?? `edge_${Date.now()}`;
                obj[id] = { id, ...edge };
                draft.data.__flowEdges = obj;
            });
        },
        removeFlowEdge(id) {
            const f = (EditorEngine as any).flows?.removeEdge;
            if (typeof f === 'function') return f(id);
            EditorEngine.update((draft: any) => {
                const obj = (draft.data?.__flowEdges ?? {}) as Record<string, any>;
                delete obj[id];
                draft.data.__flowEdges = obj;
            });
        },
        updateFlowEdge(id, patch) {
            const f = (EditorEngine as any).flows?.updateEdge;
            if (typeof f === 'function') return f(id, patch);
            EditorEngine.update((draft: any) => {
                const obj = (draft.data?.__flowEdges ?? {}) as Record<string, any>;
                if (obj[id]) obj[id] = { ...obj[id], ...patch };
                draft.data.__flowEdges = obj;
            });
        },

        // ---- Fragments ----
        addFragment(name: string) {
            const f = (EditorEngine as any).fragments?.addByName;
            if (typeof f === 'function') return f(name);
            EditorEngine.update((draft: any) => {
                draft.project = draft.project || {};
                const arr = draft.project.fragments ?? [];
                const id = `frag_${Date.now()}`;
                arr.push({ id, name, rootId: draft.project.rootId });
                draft.project.fragments = arr;
            });
        },
        openFragment(id: string) {
            const f = (EditorEngine as any).fragments?.open;
            if (typeof f === 'function') return f(id);
            EditorEngine.update((draft: any) => {
                const set = new Set([...(draft.ui?.openFragments ?? [])]);
                set.add(id);
                draft.ui = draft.ui || {};
                draft.ui.openFragments = Array.from(set);
            });
        },
        closeFragment(id: string) {
            const f = (EditorEngine as any).fragments?.close;
            if (typeof f === 'function') return f(id);
            EditorEngine.update((draft: any) => {
                const set = new Set([...(draft.ui?.openFragments ?? [])]);
                set.delete(id);
                draft.ui = draft.ui || {};
                draft.ui.openFragments = Array.from(set);
            });
        },
        removeFragment(id: string) {
            const f = (EditorEngine as any).fragments?.remove;
            if (typeof f === 'function') return f(id);
            EditorEngine.update((draft: any) => {
                const arr = draft.project?.fragments ?? [];
                draft.project.fragments = arr.filter((x: any) => x.id !== id);
            });
        },

        // 선택 서브 파사드 통째 제공(있을 때)
        actions: (EditorEngine as any).actions,
        flows: (EditorEngine as any).flows,
        fragments: (EditorEngine as any).fragments,
        dataOps: (EditorEngine as any).data,
    };

    return { reader: () => reader, writer: () => writer };
}