'use client';

import { EditorEngine } from '../../EditorEngine';

type State = ReturnType<typeof EditorEngine.getState>;

export type NodeLite = { id: string; name?: string; children?: string[] };

export const makeSelectNodeByIdFrom = (id: string) =>
    (s: State): NodeLite | null => {
        if (!id) return null;
        const nodes = (s as any)?.project?.nodes ?? {};
        return (nodes[id] ?? null) as NodeLite | null;
    };

export function selectChildrenIdsFrom(s: State, id: string): string[] {
    const nodes = (s as any)?.project?.nodes ?? {};
    const n = nodes[id];
    return (n?.children ?? []) as string[];
}

export function selectNodeNameFrom(s: State, id: string): string {
    const nodes = (s as any)?.project?.nodes ?? {};
    const n = nodes[id];
    return (n?.name ?? '') as string;
}