import { EditorCore } from '../EditorCore';
import type { Asset } from '../../core/types';
import { genId } from '../../store/utils';
import { selectAssets } from '../../store/slices/dataSlice';

export function assetsDomain() {
    const R = {
        getAssets: (): Asset[] => selectAssets(EditorCore.getState()),
        getGlobalCss: (): string => EditorCore.getState().project.globalCss ?? '',
        getGlobalJs: (): string => EditorCore.getState().project.globalJs ?? '',
    };
    const W = {
        addAsset(asset: Omit<Asset, 'id'>): string {
            const newId = genId('asset');
            const newAsset = { ...asset, id: newId };
            const currentAssets = R.getAssets();
            EditorCore.store.getState()._setAssets([...currentAssets, newAsset]);
            return newId;
        },
        removeAsset(id: string) {
            const currentAssets = R.getAssets();
            EditorCore.store.getState()._setAssets(currentAssets.filter(a => a.id !== id));
        },
        updateGlobalCss: (css: string) => EditorCore.store.getState()._setGlobalCss(css),
        updateGlobalJs: (js: string) => EditorCore.store.getState()._setGlobalJs(js),
    };
    return { reader: R, writer: W } as const;
}