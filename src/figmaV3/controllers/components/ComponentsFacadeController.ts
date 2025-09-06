'use client';

import { useMemo, useRef, useSyncExternalStore } from 'react';
import { EditorEngine } from '@/figmaV3/engine/EditorEngine';
import type { Fragment } from '@/figmaV3/core/types';

export interface ComponentsReader {
    mode(): 'Page' | 'Component' | string;
    fragments(): ReadonlyArray<Fragment>;
    editingFragmentId(): string | null;
    token(): string;
}

export interface ComponentsWriter {
    addFragment(name?: string): string;
    updateFragment(fragmentId: string, patch: Partial<Fragment>): void;
    removeFragment(fragmentId: string): void;
    openComponentEditor(fragmentId: string): void;
    publishComponent(): void;
    setNotification(message: string): void;
}

export interface ComponentsFacadeController {
    reader(): ComponentsReader;
    writer(): ComponentsWriter;
}

/* ---------- 스냅샷 ---------- */

type Snap = {
    mode: 'Page' | 'Component' | string;
    fragments: ReadonlyArray<Fragment>;
    editingFragmentId: string | null;
    token: string;
};

function computeSnap(): Snap {
    const s = EditorEngine.getState() as any;
    const frags: Fragment[] = (s.project?.fragments ?? []) as Fragment[];
    const eid = (s.ui?.editingFragmentId ?? null) as string | null;
    const mode = (s.ui?.mode ?? 'Page') as any;
    const ver = String(s.__version__ ?? '');
    const token = `${mode}|${frags.length}|${eid ?? ''}|${ver}`;
    return { mode, fragments: frags, editingFragmentId: eid, token };
}

export function useComponentsFacadeController(): ComponentsFacadeController {
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

    const reader = useMemo<ComponentsReader>(() => {
        return {
            mode: () => snap.mode,
            fragments: () => snap.fragments,
            editingFragmentId: () => snap.editingFragmentId,
            token: () => snap.token,
        };
    }, [snap]);

    const writer = useMemo<ComponentsWriter>(() => {
        return {
            addFragment(name) {
                let createdId = '';
                EditorEngine.update((draft: any) => {
                    const id = `comp_${Math.random().toString(36).slice(2, 8)}`;
                    const rootId = `node_${Math.random().toString(36).slice(2, 8)}`;
                    draft.project.nodes[rootId] = { id: rootId, componentId: 'Box', props: {}, styles: {}, children: [] };
                    draft.project.fragments = [...(draft.project.fragments ?? []), { id, name: name ?? 'New Component', rootId, isPublic: false }];
                    draft.ui.mode = 'Component';
                    draft.ui.editingFragmentId = id;
                    draft.ui.selectedId = rootId;
                    createdId = id;
                }, true);
                return createdId;
            },

            updateFragment(fragmentId, patch) {
                EditorEngine.update((draft: any) => {
                    draft.project.fragments = (draft.project.fragments ?? []).map((f: Fragment) =>
                        f.id === fragmentId ? { ...f, ...patch } : f
                    );
                }, true);
            },

            removeFragment(fragmentId) {
                EditorEngine.update((draft: any) => {
                    const frag = (draft.project.fragments ?? []).find((f: Fragment) => f.id === fragmentId);
                    if (!frag) return;
                    const toDelete: string[] = [];
                    (function walk(id: string) {
                        toDelete.push(id);
                        const node = draft.project.nodes[id];
                        for (const cid of node?.children ?? []) walk(cid);
                    })(frag.rootId);
                    toDelete.forEach((nid) => delete draft.project.nodes[nid]);

                    draft.project.fragments = (draft.project.fragments ?? []).filter((f: Fragment) => f.id !== fragmentId);

                    if (draft.ui.editingFragmentId === fragmentId) {
                        const next = (draft.project.fragments ?? [])[0];
                        draft.ui.editingFragmentId = next?.id ?? null;
                        draft.ui.selectedId = next?.rootId ?? null;
                    }
                }, true);
            },

            openComponentEditor(fragmentId) {
                EditorEngine.update((draft: any) => {
                    const frag = (draft.project.fragments ?? []).find((f: Fragment) => f.id === fragmentId);
                    if (!frag) return;
                    draft.ui.mode = 'Component';
                    draft.ui.editingFragmentId = fragmentId;
                    draft.ui.selectedId = frag.rootId;
                }, true);
            },

            publishComponent() {
                EditorEngine.update((draft: any) => {
                    const id = draft.ui.editingFragmentId;
                    if (!id) return;
                    draft.project.fragments = (draft.project.fragments ?? []).map((f: Fragment) =>
                        f.id === id ? { ...f, isPublic: true } : f
                    );
                }, true);
            },

            setNotification(message) {
                if ((EditorEngine as any).ui?.setNotification) {
                    (EditorEngine as any).ui.setNotification(message);
                    return;
                }
                EditorEngine.update((draft: any) => {
                    draft.ui = draft.ui ?? {};
                    (draft.ui as any).__lastNotification = message;
                }, true);
            },
        };
    }, []);

    return useMemo(() => ({ reader: () => reader, writer: () => writer }), [reader, writer]);
}