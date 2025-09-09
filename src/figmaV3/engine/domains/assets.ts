import { EditorEngineCore } from '../EditorEngineCore';
import type { Asset } from '../../core/types';
import { genId } from '../../store/utils';
import { selectAssets } from '../../store/slices/dataSlice';

export function assetsDomain() {
    const R = {
        getAssets: (): Asset[] => selectAssets(EditorEngineCore.getState()),
        getGlobalCss: (): string => EditorEngineCore.getState().project.globalCss ?? '',
        getGlobalJs: (): string => EditorEngineCore.getState().project.globalJs ?? '',
    };
    const W = {
        addAsset(asset: Omit<Asset, 'id'>): string {
            const newId = genId('asset');
            const newAsset = { ...asset, id: newId };
            const currentAssets = R.getAssets();
            EditorEngineCore.store.getState()._setAssets([...currentAssets, newAsset]);
            return newId;
        },
        removeAsset(id: string) {
            const currentAssets = R.getAssets();
            EditorEngineCore.store.getState()._setAssets(currentAssets.filter(a => a.id !== id));
        },
        updateGlobalCss: (css: string) => EditorEngineCore.store.getState()._setGlobalCss(css),
        updateGlobalJs: (js: string) => EditorEngineCore.store.getState()._setGlobalJs(js),
    };
    return { reader: R, writer: W } as const;
}