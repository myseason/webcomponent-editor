'use client';

import type { NodeId, CSSDict, Viewport } from '../core/types';
import { useEditor } from '../editor/useEditor';

/**
 * EditorEngine (POJO)
 * - React 훅을 직접 호출하지 않습니다.
 * - 외부에서 전달된 state 레퍼런스(스토어 메서드 포함)를 위임 호출합니다.
 */
type AnyRecord = Record<string, unknown>;
type EditorStatePort = {
    ui: any;
    project: any;
    // zustand store actions (선택적으로 주입)
    update?: (fn: (draft: any) => void, recordHistory?: boolean) => void;
    setNotification?: (msg: string) => void;
    select?: (id: NodeId | null) => void;

    // node slice actions (선택적으로 주입)
    updateNodeProps?: (id: NodeId, patch: AnyRecord) => void;
    updateNodeStyles?: (id: NodeId, patch: CSSDict, viewport?: Viewport) => void;
};

export class EditorEngine {
    constructor(private readonly state: EditorStatePort) {}

    // ===== Query =====
    getUI() { return this.state.ui; }
    getProject() { return this.state.project; }
    getNode(nodeId: NodeId) {
        return this.state.project?.nodes?.[nodeId] ?? null;
    }
    getComponentIdOf(nodeId: NodeId): string | null {
        return (this.getNode(nodeId)?.componentId as string) ?? null;
    }

    // ===== Generic Commands =====
    update(mutator: (draft: any) => void, recordHistory = false) {
        if (typeof this.state.update === 'function') this.state.update(mutator, recordHistory);
    }
    notify(message: string) {
        if (typeof this.state.setNotification === 'function') this.state.setNotification(message);
    }
    selectNode(id: NodeId | null) {
        if (typeof this.state.select === 'function') this.state.select(id);
    }

    // ===== Node Commands =====
    updateNodeProps(nodeId: NodeId, patch: AnyRecord) {
        if (typeof this.state.updateNodeProps === 'function') {
            this.state.updateNodeProps(nodeId, patch);
            return;
        }
        // 폴백: generic update
        this.update(s => {
            const n = s.project?.nodes?.[nodeId]; if (!n) return;
            n.props = { ...(n.props ?? {}), ...patch };
        }, true);
    }

    updateNodeStyles(nodeId: NodeId, patch: CSSDict, viewport?: Viewport) {
        if (typeof this.state.updateNodeStyles === 'function') {
            this.state.updateNodeStyles(nodeId, patch, viewport);
            return;
        }
        // 폴백: generic update (단순 병합)
        this.update(s => {
            const n = s.project?.nodes?.[nodeId]; if (!n) return;
            const prev = (n.props?.style ?? {}) as AnyRecord;
            n.props = { ...(n.props ?? {}), style: { ...prev, ...patch } };
        }, true);
    }

    changeTag(nodeId: NodeId, tag: string) {
        this.updateNodeProps(nodeId, { __tag: tag });
    }
}

/**
 * useEngine(): View 전용 파사드 훅
 * - 스토어를 구독하여 EditorEngine 인스턴스를 구성합니다.
 * - 모든 컨트롤러는 이 훅만 임포트해서 사용합니다.
 */
export interface EngineFacade {
    readonly project: any;
    readonly ui: any;
    update(mutator: (draft: any) => void, recordHistory?: boolean): void;
    notify(message: string): void;
    selectNode(id: NodeId | null): void;
    updateNodeProps(id: NodeId, patch: AnyRecord): void;
    updateNodeStyles(id: NodeId, patch: CSSDict, viewport?: Viewport): void;
    // 편의: 엔진 내부 질의도 일부 노출
    getNode?(id: NodeId): any | null;
    getComponentIdOf?(id: NodeId): string | null;
}

export function useEngine(): EngineFacade {
    const s: any = useEditor();
    const engine = new EditorEngine({
        ui: s.ui,
        project: s.project,
        update: s.update,
        setNotification: s.setNotification,
        select: s.select,
        updateNodeProps: s.updateNodeProps,
        updateNodeStyles: s.updateNodeStyles,
    });

    return {
        project: s.project,
        ui: s.ui,
        update: (fn, rec) => engine.update(fn, !!rec),
        notify: (msg) => engine.notify(msg),
        selectNode: (id) => engine.selectNode(id),
        updateNodeProps: (id, patch) => engine.updateNodeProps(id, patch),
        updateNodeStyles: (id, patch, vp) => engine.updateNodeStyles(id, patch, vp),
        getNode: (id) => engine.getNode(id),
        getComponentIdOf: (id) => engine.getComponentIdOf(id),
    };
}