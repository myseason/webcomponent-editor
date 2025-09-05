'use client';

/**
 * ActionsController (controllers/actions/)
 * - View는 store/editorStore를 직접 알지 못함
 * - 모든 읽기/쓰기/실행은 Controller를 통해서만 수행
 *
 * Reader API
 *  - getNode(nodeId)
 *  - getDefinitionOf(nodeId)
 *  - getEventKeys(nodeId)
 *  - getSteps(nodeId, evt)
 *  - getActionBag(nodeId)
 *  - facadeToken()
 *
 * Writer API
 *  - setActionSteps(nodeId, evt, steps)
 *  - addActionStep(nodeId, evt, step)
 *  - updateActionStep(nodeId, evt, index, patch)
 *  - removeActionStep(nodeId, evt, index)
 *  - runActionSteps(nodeId, evt)   ← editorStore 의존성 내부 캡슐화 + emit 폴백 처리
 *  - setNotification?(msg)
 */

import { useMemo } from 'react';

// v1.3.1 기준 훅/스토어/런타임/레지스트리
import { useEditor } from '../../editor/useEditor';
import { editorStore } from '../../store/editStore';
import { runActions } from '../../runtime/actions';
import { getDefinition } from '../../core/registry';

import type {
    Node as CoreNode,
    ActionStep as CoreActionStep,
    ComponentDefinition,
    NodeId,
} from '../../core/types';

export type Node = CoreNode & { props?: Record<string, unknown> };
export type ActionStep = CoreActionStep;

export type ActionsBag = Record<
    string, // event key
    { steps: ActionStep[] }
>;

export interface ActionsReader {
    getNode(nodeId: string | null | undefined): Node | null;
    getDefinitionOf(nodeId: string | null | undefined): ComponentDefinition | null;
    getEventKeys(nodeId: string | null | undefined): string[];
    getSteps(nodeId: string | null | undefined, evt: string): ActionStep[];
    getActionBag(nodeId: string | null | undefined): ActionsBag;
    facadeToken(): string;
}

export interface ActionsWriter {
    setActionSteps(nodeId: string, evt: string, steps: ActionStep[]): void;
    addActionStep(nodeId: string, evt: string, step: ActionStep): void;
    updateActionStep(nodeId: string, evt: string, index: number, patch: Partial<ActionStep>): void;
    removeActionStep(nodeId: string, evt: string, index: number): void;

    /**
     * View는 editorStore나 runActions를 직접 호출하지 않음.
     * 실행에 필요한 deps(alert/setData/setProps/navigate/http/open/close/emit)는
     * 컨트롤러 내부에서 캡슐화하여 주입한다.
     */
    runActionSteps(nodeId: string, evt: string): Promise<void> | void;

    setNotification?(msg: string): void;
}

export interface ActionsController {
    reader(): ActionsReader;
    writer(): ActionsWriter;
}

/** 내부: node.props.__actions 안전 조회 */
function nodeActionBag(n: Node | null): ActionsBag {
    const bag = (n?.props as Record<string, unknown> | undefined)?.__actions as ActionsBag | undefined;
    return bag ?? {};
}

function buildReader(state: ReturnType<typeof useEditor>): ActionsReader {
    return {
        getNode(nodeId) {
            if (!nodeId) return null;
            return (state.project?.nodes as any)?.[nodeId] ?? null;
        },

        getDefinitionOf(nodeId) {
            const node = this.getNode(nodeId) as any;
            const compId = node?.componentId;
            if (!compId) return null;
            try {
                return getDefinition(compId) ?? null;
            } catch {
                return null;
            }
        },

        getEventKeys(nodeId) {
            const keys = Object.keys(nodeActionBag(this.getNode(nodeId)));
            if (keys.length) return keys;

            const def: any = this.getDefinitionOf(nodeId);
            const caps = def?.capabilities;
            if (Array.isArray(caps?.events)) return caps.events.map((e: any) => String(e));
            if (caps && typeof caps === 'object') return Object.keys(caps);
            return [];
        },

        getSteps(nodeId, evt) {
            const bag = nodeActionBag(this.getNode(nodeId));
            const entry = bag?.[evt];
            const steps = entry?.steps;
            return Array.isArray(steps) ? (steps as ActionStep[]) : [];
        },

        getActionBag(nodeId) {
            return nodeActionBag(this.getNode(nodeId));
        },

        // selection/root/nodes 개수에 반응 → memo 의존성 토큰
        facadeToken() {
            const ui = state.ui ?? {};
            const proj = state.project ?? {};
            const nodes = proj?.nodes ? Object.keys(proj.nodes).length : 0;
            return [String(ui.selectedId ?? ''), String(proj.rootId ?? ''), String(nodes)].join('::');
        },
    };
}

/** 간단한 내부 이벤트 버스 (emit 폴백) */
function emitFallback(topic: string, payload?: unknown) {
    try {
        if (typeof window !== 'undefined' && 'dispatchEvent' in window) {
            window.dispatchEvent(new CustomEvent(`editor:emit:${topic}`, { detail: payload }));
            return;
        }
    } catch {
        // no-op
    }
    // 환경이 없으면 no-op
}

function buildWriter(state: ReturnType<typeof useEditor>, R: ActionsReader): ActionsWriter {
    return {
        setActionSteps(nodeId, evt, steps) {
            state.update((draft: any) => {
                const n = (draft.project?.nodes ?? {})[nodeId];
                if (!n) return;
                const props = (n.props ??= {});
                const bag = ((props as any).__actions ??= {}) as ActionsBag;
                const entry = (bag[evt] ??= { steps: [] });
                entry.steps = Array.isArray(steps) ? steps.slice() : [];
            });
        },

        addActionStep(nodeId, evt, step) {
            const cur = R.getSteps(nodeId, evt);
            this.setActionSteps(nodeId, evt, [...cur, step]);
        },

        updateActionStep(nodeId, evt, index, patch) {
            const cur = R.getSteps(nodeId, evt);
            if (!Array.isArray(cur) || index < 0 || index >= cur.length) return;
            const next = [...cur];
            next[index] = { ...next[index], ...(patch as any) };
            this.setActionSteps(nodeId, evt, next);
        },

        removeActionStep(nodeId, evt, index) {
            const cur = R.getSteps(nodeId, evt);
            if (!Array.isArray(cur) || index < 0 || index >= cur.length) return;
            this.setActionSteps(nodeId, evt, cur.filter((_, i) => i !== index));
        },

        /**
         * ⛔ View는 editorStore를 몰라도 됨
         * 여기서 runActions에 deps를 주입한다.
         * - emit: EditorStoreState에는 없음 → window CustomEvent 폴백
         */
        async runActionSteps(nodeId, evt) {
            const steps = R.getSteps(nodeId, evt);

            // 필요한 의존성은 전부 내부에서 구성
            const deps = {
                alert: (m: string) => window.alert(m),
                setData: (path: string, value: unknown) => editorStore.getState().setData(path, value),
                setProps: (nid: NodeId, patch: Record<string, unknown>) =>
                    editorStore.getState().updateNodeProps(nid, patch),
                navigate: (pid: string) => editorStore.getState().selectPage(pid),
                openFragment: (fid: string) => editorStore.getState().openFragment(fid),
                closeFragment: (fid?: string) => editorStore.getState().closeFragment(fid),
                http: async (
                    method: 'GET' | 'POST',
                    url: string,
                    body?: unknown,
                    headers?: Record<string, string>,
                ) => {
                    const res = await fetch(url, {
                        method,
                        headers,
                        body: body ? JSON.stringify(body) : undefined,
                    });
                    try {
                        return await res.json();
                    } catch {
                        return await res.text();
                    }
                },
                // EditorStoreState에는 emit이 없으므로 폴백
                emit: (topic: string, payload?: unknown) => emitFallback(topic, payload),
            } as const;

            await runActions(steps ?? [], deps);
        },

        setNotification: state.setNotification?.bind(state),
    };
}

/** 컨트롤러 훅 */
export function useActionsController(): ActionsController {
    const state = useEditor();

    // reader/writer는 토큰/상태를 의존성으로 안전하게 생성
    const reader = useMemo(() => buildReader(state), [state.ui.selectedId, state.project.nodes]);
    const writer = useMemo(() => buildWriter(state, reader), [state, reader]);

    return useMemo(
        () => ({
            reader: () => reader,
            writer: () => writer,
        }),
        [reader, writer],
    );
}