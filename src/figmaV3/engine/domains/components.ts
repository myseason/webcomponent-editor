'use client';
import { EditorEngineCore } from '../EditorEngineCore';

export function componentsDomain() {
    const R = {
        getComponents() { return (EditorEngineCore.getState().project as any)?.fragments ?? []; },
    };
    const W = {
        addComponent(name: string) {
            const s = EditorEngineCore.getState() as any;
            if (s.addFragment) return s.addFragment(name);
            EditorEngineCore.updatePatch(({ get, patchProject }) => {
                const prev = get();
                const id = `frag_${Math.random().toString(36).slice(2, 9)}`;
                const frags = Array.isArray((prev.project as any).fragments) ? [ ...(prev.project as any).fragments ] : [];
                frags.push({ id, name, rootId: prev.project.rootId }); patchProject({ fragments: frags } as any);
            });
        },
        updateComponent(id: string, patch: any) {
            const s = EditorEngineCore.getState() as any;
            if (s.updateFragment) return s.updateFragment(id, patch);
            EditorEngineCore.updatePatch(({ get, patchProject }) => {
                const prev = get();
                const frags = ((prev.project as any).fragments ?? []).map((f: any) => f.id === id ? { ...f, ...patch } : f);
                patchProject({ fragments: frags } as any);
            });
        },
        removeComponent(id: string) {
            const s = EditorEngineCore.getState() as any;
            if (s.removeFragment) return s.removeFragment(id);
            EditorEngineCore.updatePatch(({ get, patchProject }) => {
                const prev = get();
                const frags = ((prev.project as any).fragments ?? []).filter((f: any) => f.id !== id);
                patchProject({ fragments: frags } as any);
            });
        },
        publishComponent(_id: string) { /* no-op placeholder */ },
        openComponentEditor(fragmentId: string) {
            const s = EditorEngineCore.getState() as any;
            if (s.openComponentEditor) return s.openComponentEditor(fragmentId);
            const ui = EditorEngineCore.getState().ui;
            EditorEngineCore.updatePatch(({ patchUI }) => {
                patchUI({ panels: { ...ui.panels, left: { ...ui.panels.left, lastActiveFragmentId: fragmentId } } } as any);
            });
        },
        insertComponent(_id: string, _pid?: string, _idx?: number) { /* project 규칙에 맞춰 확장 */ },
    };
    return { reader: R, writer: W } as const;
}