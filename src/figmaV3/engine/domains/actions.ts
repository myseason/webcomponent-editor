'use client';

import { EditorEngineCore } from '../EditorEngineCore';

export function actionsDomain() {
    // Readers
    const reader = {
        getActions: ()=> {
            const p = EditorEngineCore.getState().project as any;
            return p.actions ?? [];
        }
    };
    const writer = {
        // Writers
        addAction: (action: any)=> {
            const s = EditorEngineCore.store.getState() as any;
            if (s.addAction) return s.addAction(action);
            EditorEngineCore.updatePatch(({get, patchProject}) => {
                const prev = get();
                const arr = Array.isArray((prev.project as any).actions) ? [...(prev.project as any).actions] : [];
                const id = action.id ?? `act_${Math.random().toString(36).slice(2, 9)}`;
                arr.push({...action, id});
                patchProject({actions: arr} as any);
            });
        },
        updateAction: (id: string, patch: any)=> {
            const s = EditorEngineCore.store.getState() as any;
            if (s.updateAction) return s.updateAction(id, patch);
            EditorEngineCore.updatePatch(({get, patchProject}) => {
                const prev = get();
                const arr = ((prev.project as any).actions ?? []).map((x: any) =>
                    x.id === id ? {...x, ...patch} : x
                );
                patchProject({actions: arr} as any);
            });
        },
        removeAction: (id: string)=> {
            const s = EditorEngineCore.store.getState() as any;
            if (s.removeAction) return s.removeAction(id);
            EditorEngineCore.updatePatch(({get, patchProject}) => {
                const prev = get();
                const arr = ((prev.project as any).actions ?? []).filter((x: any) => x.id !== id);
                patchProject({actions: arr} as any);
            });
        }
    }

    return { reader, writer } as const;
}