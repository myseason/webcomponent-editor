'use client';
import { EditorEngineCore } from '../EditorEngineCore';

export function assetsDomain() {
    const R = {
        getAssets() { return (EditorEngineCore.getState().project as any)?.assets ?? []; },
        getGlobalCss() { return (EditorEngineCore.getState().project as any)?.globalCss ?? ''; },
        getGlobalJs() { return (EditorEngineCore.getState().project as any)?.globalJs ?? ''; },
    };
    const W = {
        addAsset(asset: Omit<any,'id'>) {
            const s = EditorEngineCore.getState() as any;
            if (s.addAsset) return s.addAsset(asset);
            EditorEngineCore.updatePatch(({ get, patchProject }) => {
                const prev = get();
                const id = `asset_${Math.random().toString(36).slice(2,9)}`;
                const assets = Array.isArray((prev.project as any).assets) ? [ ...(prev.project as any).assets ] : [];
                assets.push({ id, ...asset }); patchProject({ assets } as any);
            });
        },
        removeAsset(id: string) {
            const s = EditorEngineCore.getState() as any;
            if (s.removeAsset) return s.removeAsset(id);
            EditorEngineCore.updatePatch(({ get, patchProject }) => {
                const prev = get();
                const assets = ((prev.project as any).assets ?? []).filter((a: any) => a.id !== id);
                patchProject({ assets } as any);
            });
        },
        updateGlobalCss(css: string) {
            const s = EditorEngineCore.getState() as any;
            if (s.updateGlobalCss) return s.updateGlobalCss(css);
            EditorEngineCore.updatePatch(({ patchProject }) => patchProject({ globalCss: css } as any));
        },
        updateGlobalJs(js: string) {
            const s = EditorEngineCore.getState() as any;
            if (s.updateGlobalJs) return s.updateGlobalJs(js);
            EditorEngineCore.updatePatch(({ patchProject }) => patchProject({ globalJs: js } as any));
        },
    };
    return { reader: R, writer: W } as const;
}