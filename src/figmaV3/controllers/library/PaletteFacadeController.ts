'use client';

import { useMemo, useRef, useSyncExternalStore } from 'react';
import { EditorEngine } from '@/figmaV3/engine/EditorEngine';
import { listDefinitions } from '@/figmaV3/core/registry';
import type { Fragment, ComponentDefinition, NodeId } from '@/figmaV3/core/types';

export interface PaletteReader {
    listDefinitions(): ReadonlyArray<ComponentDefinition>;
    listSharedFragments(): ReadonlyArray<Fragment>;
    selectedId(): NodeId | null;
    rootId(): NodeId;
    isAdmin(): boolean;
    token(): string;
}

export interface PaletteWriter {
    addByDef(defId: string, parentId?: NodeId): NodeId;
    insertComponent(fragmentId: string, parentId?: NodeId): NodeId | null;
    removeFragment(fragmentId: string): void;
}

export interface PaletteFacadeController {
    reader(): PaletteReader;
    writer(): PaletteWriter;
}

/* ---------- 스냅샷 ---------- */

type Snap = {
    defs: ReadonlyArray<ComponentDefinition>;
    shared: ReadonlyArray<Fragment>;
    selectedId: NodeId | null;
    rootId: NodeId;
    isAdmin: boolean;
    token: string;
};

function computeSnap(): Snap {
    const s = EditorEngine.getState() as any;
    const defs = listDefinitions();
    const frags: Fragment[] = (s.project?.fragments ?? []) as Fragment[];
    const shared = frags.filter((f) => !!f.isPublic);
    const selectedId = (s.ui?.selectedId ?? null) as NodeId | null;
    const rootId = s.project?.rootId as NodeId;
    const isAdmin = true; // 기존 useEditor와 동일한 임시 플래그
    const token = `${defs.length}|${shared.length}|${selectedId ?? ''}|${rootId}|${s.__version__ ?? ''}`;
    return { defs, shared, selectedId, rootId, isAdmin, token };
}

export function usePaletteFacadeController(): PaletteFacadeController {
    const snapRef = useRef<Snap>(computeSnap());

    const subscribe = (onChange: () => void) => {
        const unsub = EditorEngine.subscribe(() => {
            const next = computeSnap();
            if (next.token !== snapRef.current.token) {
                snapRef.current = next;
                onChange();
            }
        });
        return () => { if (typeof unsub === 'function') unsub(); };
    };

    const snap = useSyncExternalStore(subscribe, () => snapRef.current, () => snapRef.current);

    const reader = useMemo<PaletteReader>(() => {
        return {
            listDefinitions: () => snap.defs,
            listSharedFragments: () => snap.shared,
            selectedId: () => snap.selectedId,
            rootId: () => snap.rootId,
            isAdmin: () => snap.isAdmin,
            token: () => snap.token,
        };
    }, [snap]);

    const writer = useMemo<PaletteWriter>(() => {
        return {
            addByDef(defId, parentId) {
                let createdId: NodeId = '' as NodeId;
                EditorEngine.update((draft: any) => {
                    const project = draft.project;
                    const desiredParent: NodeId =
                        (parentId ?? (draft.ui.selectedId as NodeId | null) ?? (project.rootId as NodeId)) as NodeId;

                    const parentIdFinal: NodeId = desiredParent || (project.rootId as NodeId);
                    const newId: NodeId = `node_${Math.random().toString(36).slice(2, 8)}` as NodeId;

                    project.nodes[newId] = { id: newId, componentId: defId, props: {}, styles: {}, children: [] };
                    const p = project.nodes[parentIdFinal]!;
                    p.children = (p.children ?? []).slice();
                    p.children.push(newId);

                    draft.ui.selectedId = newId;
                    createdId = newId;
                }, true);
                return createdId;
            },

            insertComponent(fragmentId, parentId) {
                let insertedRoot: NodeId | null = null;
                EditorEngine.update((draft: any) => {
                    const project = draft.project;
                    const fragment: Fragment | undefined = project.fragments.find((f: Fragment) => f.id === fragmentId);
                    if (!fragment) return;

                    const cloned: Record<string, any> = {};
                    const clone = (id: string): string => {
                        const nid = `node_${Math.random().toString(36).slice(2, 8)}`;
                        const src = project.nodes[id] ?? { id, children: [] };
                        const kids = (src.children ?? []).map((k: string) => clone(k));
                        cloned[nid] = { ...src, id: nid, children: kids };
                        return nid;
                    };
                    const newRootId = clone(fragment.rootId);
                    project.nodes = { ...project.nodes, ...cloned };

                    const desiredParentId: NodeId =
                        (parentId ?? (draft.ui.selectedId as NodeId | null) ?? (project.rootId as NodeId)) as NodeId;

                    const p = project.nodes[desiredParentId]!;
                    p.children = (p.children ?? []).slice();
                    p.children.push(newRootId);

                    draft.ui.selectedId = newRootId;
                    insertedRoot = newRootId as NodeId;
                }, true);
                return insertedRoot;
            },

            removeFragment(fragmentId) {
                EditorEngine.update((draft: any) => {
                    draft.project.fragments = (draft.project.fragments ?? []).filter((f: Fragment) => f.id !== fragmentId);
                    if (draft.ui.editingFragmentId === fragmentId) {
                        draft.ui.editingFragmentId = null;
                    }
                }, true);
            },
        };
    }, []);

    return useMemo(() => ({ reader: () => reader, writer: () => writer }), [reader, writer]);
}