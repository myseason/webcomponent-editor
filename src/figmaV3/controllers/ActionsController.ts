'use client';

import * as React from 'react';
import { useEngine } from '../engine/EditorEngine';
import type { NodeId, SupportedEvent, ActionStep } from '../core/types';
import { runActions } from '../runtime/actions';

type ActionsBag = Partial<Record<SupportedEvent, { steps: ActionStep[] }>>;

export interface ActionsReader {
    getSteps(nodeId: NodeId, ev: SupportedEvent): Readonly<ActionStep[]>;
}
export interface ActionsWriter {
    setSteps(nodeId: NodeId, ev: SupportedEvent, steps: ActionStep[]): void;
    run(nodeId: NodeId, ev: SupportedEvent): Promise<void>;
}
export interface ActionsController {
    reader(): ActionsReader;
    writer(): ActionsWriter;
}

function normalize(steps: ActionStep[]): ActionStep[] {
    return steps ?? [];
}

export function useActionsController(): ActionsController {
    const eng = useEngine();

    const reader = React.useMemo<ActionsReader>(() => ({
        getSteps(nodeId, ev) {
            const node = (eng.project as any)?.nodes?.[nodeId];
            const bag = (node?.props?.__actions as ActionsBag) ?? {};
            return normalize(bag[ev]?.steps ?? []);
        },
    }), [eng.project]);

    const writer = React.useMemo<ActionsWriter>(() => ({
        setSteps(nodeId, ev, steps) {
            eng.update((s: any) => {
                const n = s.project?.nodes?.[nodeId];
                if (!n) return;
                const prev: ActionsBag = (n.props?.__actions as ActionsBag) ?? {};
                n.props = { ...(n.props ?? {}), __actions: { ...prev, [ev]: { steps } } };
            });
            eng.notify('Actions updated');
        },
        async run(nodeId, ev) {
            // readonly → mutable 복사
            const steps = [...reader.getSteps(nodeId, ev)];
            const deps = {
                alert: (msg: string) => eng.notify(msg),
                setData: (path: string, value: unknown) => {
                    eng.update((s: any) => { (s.data ??= {}); s.data[path] = value; });
                },
                setProps: (nid: NodeId, patch: Record<string, unknown>) => {
                    eng.update((s: any) => {
                        const n = s.project?.nodes?.[nid]; if (!n) return;
                        n.props = { ...(n.props ?? {}), ...(patch as any) };
                    });
                },
                navigate: (toPageId: string) => {
                    eng.update((s: any) => { (s.ui as any).panels.left.lastActivePageId = toPageId; });
                },
                openFragment: (fragmentId: string) => {
                    eng.update((s: any) => { (s.ui as any).editingFragmentId = fragmentId; });
                },
                closeFragment: (_fragmentId?: string) => {
                    eng.update((s: any) => { (s.ui as any).editingFragmentId = null; });
                },
                http: async (method: 'GET'|'POST', url: string, body?: unknown, headers?: Record<string,string>) => {
                    return Promise.resolve({ ok: true, method, url, body, headers });
                },
                emit: (_topic: string, _payload?: unknown) => {},
            };
            await runActions(steps, deps as any);
        },
    }), [eng, reader]);

    return React.useMemo(() => ({ reader: () => reader, writer: () => writer }), [reader, writer]);
}