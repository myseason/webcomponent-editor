'use client';

import type { EditorStoreState } from '../store/types';
import type { EditorState, EditorUI, Project } from '../core/types';
import { editorStore as store } from '../store/editStore';

export type Unsubscribe = () => void;

export type PatchHelpers = {
    get: () => EditorStoreState;
    /** 루트 일부 교체 (project/ui 등 포함 가능) */
    set: (patch: Partial<EditorState>) => void;
    /** 하위 트리 병합 */
    patchProject: (patch: Partial<Project>) => void;
    patchUI: (patch: Partial<EditorUI>) => void;
};

type PatchBuffer = {
    root?: Partial<EditorState>;
    project?: Partial<Project>;
    ui?: Partial<EditorUI>;
};

function applyPatchBuffer(buf: PatchBuffer) {
    if (!buf.root && !buf.project && !buf.ui) return;
    store.setState((s: EditorStoreState) => {
        const next: Partial<EditorStoreState> = {};
        if (buf.root) {
            next.project = (buf.root as any).project ?? s.project;
            next.ui = (buf.root as any).ui ?? s.ui;
        }
        if (buf.project) next.project = { ...(next.project ?? s.project), ...buf.project } as Project;
        if (buf.ui) next.ui = { ...(next.ui ?? s.ui), ...buf.ui } as EditorUI;
        return next as Partial<EditorStoreState>;
    });
}

export const EditorEngineCore = {
    // 슬라이스 액션 직접 접근이 필요할 때
    store,
    // Store access
    getState(): EditorStoreState {
        return store.getState();
    },
    subscribe(listener: () => void): Unsubscribe {
        return store.subscribe(listener);
    },

    // Patch-style update (fallback path)
    updatePatch(mutator: (h: PatchHelpers) => void) {
        const prev = store.getState();
        const buf: PatchBuffer = {};
        const set = (patch: Partial<EditorState>) => { buf.root = { ...(buf.root ?? {}), ...patch }; };
        const patchProject = (patch: Partial<Project>) => { buf.project = { ...(buf.project ?? {}), ...patch }; };
        const patchUI = (patch: Partial<EditorUI>) => { buf.ui = { ...(buf.ui ?? {}), ...patch }; };
        mutator({ get: () => prev, set, patchProject, patchUI });
        applyPatchBuffer(buf);
    },
} as const;