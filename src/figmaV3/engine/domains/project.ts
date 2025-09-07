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
    };
    return { reader: R, writer: W } as const;
}