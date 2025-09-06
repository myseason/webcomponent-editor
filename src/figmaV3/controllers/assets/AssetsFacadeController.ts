'use client';

import { useMemo } from 'react';
import { EditorEngine } from '@/figmaV3/engine/EditorEngine';
import type { Asset } from '@/figmaV3/core/types';

export interface AssetsReader {
    expertMode(): boolean;
    assets(): ReadonlyArray<Asset>;
    globalCss(): string;
    globalJs(): string;
    token(): string; // 가벼운 리렌더 토큰(옵션)
}

export interface AssetsWriter {
    addAsset(asset: Omit<Asset, 'id'>): string;
    removeAsset(assetId: string): void;
    updateGlobalCss(css: string): void;
    updateGlobalJs(js: string): void;
}

export interface AssetsFacadeController {
    reader(): AssetsReader;
    writer(): AssetsWriter;
}

export function useAssetsFacadeController(): AssetsFacadeController {
    const reader = useMemo<AssetsReader>(() => {
        return {
            expertMode() {
                const s = EditorEngine.getState() as any;
                return !!s.ui?.expertMode;
            },
            assets() {
                const s = EditorEngine.getState() as any;
                return (s.project?.assets ?? []) as Asset[];
            },
            globalCss() {
                const s = EditorEngine.getState() as any;
                return String(s.project?.globalCss ?? '');
            },
            globalJs() {
                const s = EditorEngine.getState() as any;
                return String(s.project?.globalJs ?? '');
            },
            token() {
                const s = EditorEngine.getState() as any;
                const a = (s.project?.assets ?? []).length;
                const css = String(s.project?.globalCss ?? '').length;
                const js = String(s.project?.globalJs ?? '').length;
                return `${a}|${css}|${js}`;
            },
        };
    }, []);

    const writer = useMemo<AssetsWriter>(() => {
        return {
            addAsset(asset) {
                // 우선 store slice 경유(있으면)
                const S = EditorEngine.getState() as any;
                if (typeof S.addAsset === 'function') {
                    return S.addAsset(asset);
                }
                // 호환 경로: 엔진 update
                let newId = '';
                EditorEngine.update((draft: any) => {
                    if (!draft.project.assets) draft.project.assets = [];
                    newId = `asset_${Math.random().toString(36).slice(2, 8)}`;
                    draft.project.assets.push({ ...asset, id: newId });
                }, true);
                return newId;
            },
            removeAsset(assetId) {
                const S = EditorEngine.getState() as any;
                if (typeof S.removeAsset === 'function') {
                    S.removeAsset(assetId);
                    return;
                }
                EditorEngine.update((draft: any) => {
                    draft.project.assets = (draft.project.assets ?? []).filter((a: Asset) => a.id !== assetId);
                }, true);
            },
            updateGlobalCss(css) {
                const S = EditorEngine.getState() as any;
                if (typeof S.updateGlobalCss === 'function') {
                    S.updateGlobalCss(css);
                    return;
                }
                EditorEngine.update((draft: any) => {
                    draft.project.globalCss = css;
                }, true);
            },
            updateGlobalJs(js) {
                const S = EditorEngine.getState() as any;
                if (typeof S.updateGlobalJs === 'function') {
                    S.updateGlobalJs(js);
                    return;
                }
                EditorEngine.update((draft: any) => {
                    draft.project.globalJs = js;
                }, true);
            },
        };
    }, []);

    return useMemo(() => ({ reader: () => reader, writer: () => writer }), [reader, writer]);
}