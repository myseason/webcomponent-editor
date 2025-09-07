'use client';
import { EditorEngineCore } from '../EditorEngineCore';

export function stylesheetsDomain() {
    const R = {
        getStylesheets() { return ((EditorEngineCore.getState().project as any)?.stylesheets ?? []) as Array<{id:string,name:string,content:string}>; },
    };
    const W = {
        addStylesheet(name: string, content = '') {
            EditorEngineCore.updatePatch(({ get, patchProject }) => {
                const prev = get();
                const id = `ss_${Math.random().toString(36).slice(2,9)}`;
                const sheets = Array.isArray((prev.project as any).stylesheets) ? [ ...(prev.project as any).stylesheets ] : [];
                sheets.push({ id, name, content }); patchProject({ stylesheets: sheets } as any);
            });
        },
        updateStylesheet(id: string, content: string) {
            EditorEngineCore.updatePatch(({ get, patchProject }) => {
                const prev = get();
                const sheets = ((prev.project as any).stylesheets ?? []).map((s: any) => s.id === id ? { ...s, content } : s);
                patchProject({ stylesheets: sheets } as any);
            });
        },
        removeStylesheet(id: string) {
            EditorEngineCore.updatePatch(({ get, patchProject }) => {
                const prev = get();
                const sheets = ((prev.project as any).stylesheets ?? []).filter((s: any) => s.id !== id);
                patchProject({ stylesheets: sheets } as any);
            });
        },
    };
    return { reader: R, writer: W } as const;
}