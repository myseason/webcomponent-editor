'use client';

import { useRef, useSyncExternalStore } from 'react';
import { EditorEngine } from '../../engine/EditorEngine';
import type { EditorStoreState } from '../../store/types';
import type {
    CSSDict,
    NodeId,
    Project,
    Viewport,
    ViewportMode,
    EditorState,
} from '../../core/types';

/** Reader: 우측 패널이 쓰는 읽기 API */
export interface InspectorReader {
    project(): Project;
    ui(): EditorStoreState['ui'];
    data(): any; // 기존 state.data 호환(정확 타입은 store에 종속)
    selectedNodeId(): NodeId | null;
    rootNodeId(): NodeId;
    activeViewport(): Viewport;
    viewportMode(vp: Viewport): ViewportMode;
    getEffectiveDecl(nodeId: NodeId): CSSDict;
    nodeById(id: NodeId): Project['nodes'][string] | undefined;
}

/** Writer: 우측 패널이 쓰는 쓰기 API */
export interface InspectorWriter {
    updateNodeStyles(nodeId: NodeId, patch: CSSDict, viewport?: Viewport): void;
    updateNodeProps(nodeId: NodeId, props: Record<string, unknown>): void;
    setNotification(message: string): void;
    /** 호환 유지를 위한 raw update */
    update(mutator: (draft: EditorState) => void): void;
    /** 저장/정책 등 기존 useEditor가 노출하던 메서드 호환 */
    saveNodeAsComponent(nodeId: NodeId, name: string, description?: string, isPublic?: boolean): void;
    updateComponentPolicy(componentId: string, patch: any): void;
}

export function useInspectorController(): {
    reader: () => InspectorReader;
    writer: () => InspectorWriter;
} {
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
                nodeId: (s.ui.selectedId ?? null) as NodeId | null,
            };
            cb();
        });

    const getSnapshot = () => {
        if (!cacheRef.current) {
            const s = EditorEngine.getState() as EditorStoreState;
            cacheRef.current = {
                state: s,
                nodeId: (s.ui.selectedId ?? null) as NodeId | null,
            };
        }
        return cacheRef.current!;
    };

    const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    // ---------- Reader ----------
    const reader: InspectorReader = {
        project() {
            return snap.state.project as Project;
        },
        ui() {
            return snap.state.ui;
        },
        data() {
            // store dataSlice와 동일 루트 유지 (없으면 빈 객체)
            return (snap.state as any).data ?? {};
        },
        selectedNodeId() {
            return snap.nodeId;
        },
        rootNodeId() {
            return snap.state.project.rootId as NodeId;
        },
        activeViewport() {
            return snap.state.ui.canvas.activeViewport as Viewport;
        },
        viewportMode(vp: Viewport) {
            return (snap.state.ui.canvas.vpMode as Record<Viewport, ViewportMode>)[vp];
        },
        getEffectiveDecl(nodeId: NodeId) {
            const S = snap.state as EditorStoreState & {
                getEffectiveDecl?: (id: string) => CSSDict | null;
            };
            return (S.getEffectiveDecl?.(nodeId) ?? {}) as CSSDict;
        },
        nodeById(id: NodeId) {
            return snap.state.project.nodes[id];
        },
    };

    // ---------- Writer ----------
    const writer: InspectorWriter = {
        updateNodeStyles(nodeId, patch, viewport) {
            (EditorEngine as any).nodes?.updateNodeStyles?.(nodeId, patch, viewport) ??
            EditorEngine.update((draft: any) => {
                const t = draft.project?.nodes?.[nodeId]?.styles ?? (draft.project.nodes[nodeId].styles = {});
                Object.assign(t, patch);
            });
        },
        updateNodeProps(nodeId, props) {
            (EditorEngine as any).nodes?.updateNodeProps?.(nodeId, props) ??
            EditorEngine.update((draft: any) => {
                const p = draft.project?.nodes?.[nodeId]?.props ?? (draft.project.nodes[nodeId].props = {});
                Object.assign(p, props);
            });
        },
        setNotification(message: string) {
            (EditorEngine as any).ui?.setNotification?.(message) ??
            console.info('[notification]', message);
        },
        update(mutator) {
            EditorEngine.update(mutator as any);
        },
        saveNodeAsComponent(nodeId, name, description, isPublic) {
            const fn =
                (EditorEngine as any).nodes?.saveNodeAsComponent ??
                (EditorEngine as any).saveNodeAsComponent;
            if (typeof fn === 'function') {
                fn(nodeId, name, description, isPublic);
                return;
            }
            // fallback: no-op
            console.info('[saveNodeAsComponent] fallback noop', { nodeId, name });
        },
        updateComponentPolicy(componentId, patch) {
            const fn =
                (EditorEngine as any).policy?.updateComponentPolicy ??
                (EditorEngine as any).updateComponentPolicy;
            if (typeof fn === 'function') {
                fn(componentId, patch);
                return;
            }
            // fallback via update
            EditorEngine.update((draft: any) => {
                draft.policy = draft.policy || {};
                draft.policy.components = draft.policy.components || {};
                const cur = draft.policy.components[componentId] || {};
                draft.policy.components[componentId] = { ...cur, ...patch };
            });
        },
    };

    return { reader: () => reader, writer: () => writer };
}