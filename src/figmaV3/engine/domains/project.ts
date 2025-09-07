'use client';
import type { Project } from '../../core/types';
import { EditorEngineCore } from '../EditorEngineCore';

export function projectDomain() {
    const R = {
        getProject(): Project { return EditorEngineCore.getState().project; },
    };
    const W = {
        setProject(patch: Partial<Project>) {
            EditorEngineCore.updatePatch(({ patchProject }) => patchProject(patch));
        },

        /** schemaOverrides[defId] = rows */
        setSchemaOverride(defId: string, rows: any[]) {
            // slice 액션이 있으면 우선 사용
            const s: any = EditorEngineCore.store.getState();
            if (typeof s.setProjectSchemaOverride === 'function') {
                return s.setProjectSchemaOverride(defId, rows);
            }
            // 폴백: patch 스타일
            EditorEngineCore.updatePatch(({ get, patchProject }) => {
                const prev = get();
                const next = { ...(prev.project.schemaOverrides ?? {}) };
                next[defId] = rows;
                patchProject({ schemaOverrides: next } as any);
            });
        },

        /** delete schemaOverrides[defId] */
        removeSchemaOverride(defId: string) {
            const s: any = EditorEngineCore.store.getState();
            if (typeof s.removeProjectSchemaOverride === 'function') {
                return s.removeProjectSchemaOverride(defId);
            }
            EditorEngineCore.updatePatch(({ get, patchProject }) => {
                const prev = get();
                const next = { ...(prev.project.schemaOverrides ?? {}) };
                delete next[defId];
                patchProject({ schemaOverrides: next } as any);
            });
        },
    };
    return { reader: R, writer: W } as const;
}