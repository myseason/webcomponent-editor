'use client';
import { EditorEngineCore } from '../EditorEngineCore';

export function dataDomain() {
    const R = {
        getDataSources() {
            const s = EditorEngineCore.getState();
            return Array.isArray(s.data?.sources) ? (s.data!.sources as any[]) : [];
        },
    };

    const W = {
        addDataSource(src: any) {
            const s = EditorEngineCore.getState() as any;
            if (s.addDataSource) return s.addDataSource(src);

            EditorEngineCore.updatePatch(({ get, set }) => {
                const prev = get();
                const list: any[] = Array.isArray(prev.data?.sources) ? [...(prev.data!.sources as any[])] : [];
                list.push({ id: `ds_${Math.random().toString(36).slice(2, 9)}`, ...src });
                set({ data: { ...(prev as any).data, sources: list } } as any);
            });
        },

        removeDataSource(id: string) {
            const s = EditorEngineCore.getState() as any;
            if (s.removeDataSource) return s.removeDataSource(id);

            EditorEngineCore.updatePatch(({ get, set }) => {
                const prev = get();
                const list: any[] = Array.isArray(prev.data?.sources) ? (prev.data!.sources as any[]) : [];
                const next = list.filter((x: any) => x?.id !== id);
                set({ data: { ...(prev as any).data, sources: next } } as any);
            });
        },

        updateDataSource(id: string, patch: any) {
            const s = EditorEngineCore.getState() as any;
            if (s.updateDataSource) return s.updateDataSource(id, patch);

            EditorEngineCore.updatePatch(({ get, set }) => {
                const prev = get();
                const list: any[] = Array.isArray(prev.data?.sources) ? (prev.data!.sources as any[]) : [];
                const next = list.map((x: any) => (x?.id === id ? { ...x, ...patch } : x));
                set({ data: { ...(prev as any).data, sources: next } } as any);
            });
        },
    };

    return { reader: R, writer: W } as const;
}