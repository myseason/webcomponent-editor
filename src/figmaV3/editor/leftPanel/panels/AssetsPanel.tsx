'use client';

/**
 * AssetsPanel
 * - Media: 이미지 등 정적 자산 업로드 및 관리
 * - Scripts (전문가): 전역 JS 편집
 * - Styles (전문가): 전역 CSS 및 테마 변수 편집
 *
 * ✅ UI/UX는 기준 소스와 동일하게 유지합니다.
 *   (useEditor → useAssetsFacadeController 로 데이터/액션 공급자만 치환)
 */

import React, { useState, useCallback } from 'react';
import type { Asset } from '../../../core/types';
import { useAssetsFacadeController } from '@/figmaV3/controllers/assets/AssetsFacadeController';

type AssetTab = 'Media' | 'Scripts' | 'Styles';

export function AssetsPanel() {
    const ctrl = useAssetsFacadeController();
    const R = ctrl.reader();
    const W = ctrl.writer();

    const expertMode = R.expertMode();
    const [activeTab, setActiveTab] = useState<AssetTab>('Media');

    // 초기값은 Reader에서 가져오되, 입력은 로컬 상태 → 저장 버튼으로 반영(기존 동작 유지)
    const [globalCss, setGlobalCss] = useState<string>(R.globalCss());
    const [globalJs, setGlobalJs] = useState<string>(R.globalJs());

    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const url = event.target?.result as string;
            if (url) {
                W.addAsset({
                    name: file.name,
                    url,
                    type: file.type.startsWith('image/') ? 'image' : 'video', // 간단한 타입 추론
                });
            }
        };
        reader.readAsDataURL(file);
    }, [W]);

    const assets = R.assets();

    return (
        <div className="h-full flex flex-col">
            <div className="px-3 pt-2 flex items-center gap-4 border-b">
                <button
                    onClick={() => setActiveTab('Media')}
                    className={`pb-2 text-sm ${activeTab === 'Media' ? 'border-b-2 border-blue-500 font-semibold' : 'text-gray-500'}`}
                >
                    Media
                </button>
                {expertMode && (
                    <>
                        <button
                            onClick={() => setActiveTab('Scripts')}
                            className={`pb-2 text-sm ${activeTab === 'Scripts' ? 'border-b-2 border-blue-500 font-semibold' : 'text-gray-500'}`}
                        >
                            Scripts
                        </button>
                        <button
                            onClick={() => setActiveTab('Styles')}
                            className={`pb-2 text-sm ${activeTab === 'Styles' ? 'border-b-2 border-blue-500 font-semibold' : 'text-gray-500'}`}
                        >
                            Styles
                        </button>
                    </>
                )}
            </div>

            <div className="flex-1 p-3 overflow-auto">
                {activeTab === 'Media' && (
                    <div className="space-y-3">
                        <label className="block">
                            <input type="file" className="hidden" onChange={handleFileUpload} />
                            <div className="w-full border-2 border-dashed rounded p-6 text-center text-sm text-gray-500 cursor-pointer hover:bg-gray-50">
                                Click to upload files
                            </div>
                        </label>

                        <div className="grid grid-cols-2 gap-3">
                            {(assets ?? []).map((asset: Asset) => (
                                <div key={asset.id} className="border rounded p-2">
                                    <div className="flex justify-between items-center">
                                        <div className="text-sm font-medium truncate">{asset.name}</div>
                                        <button
                                            onClick={() => W.removeAsset(asset.id)}
                                            className="text-white text-xs bg-red-500 px-2 py-1 rounded"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                    <div className="mt-2">
                                        {asset.type === 'image' ? (
                                            <img src={asset.url} alt={asset.name} className="w-full h-24 object-cover rounded" />
                                        ) : (
                                            <video src={asset.url} className="w-full h-24 rounded" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {expertMode && activeTab === 'Scripts' && (
                    <div className="h-full flex flex-col">
            <textarea
                value={globalJs}
                onChange={(e) => setGlobalJs(e.target.value)}
                className="flex-1 w-full font-mono text-xs border rounded p-2"
                placeholder="// Global JavaScript for your project"
            />
                        <button
                            onClick={() => W.updateGlobalJs(globalJs)}
                            className="mt-2 text-xs border rounded px-3 py-1 bg-gray-100 hover:bg-gray-200"
                        >
                            Save Scripts
                        </button>
                    </div>
                )}

                {expertMode && activeTab === 'Styles' && (
                    <div className="h-full flex flex-col">
            <textarea
                value={globalCss}
                onChange={(e) => setGlobalCss(e.target.value)}
                className="flex-1 w-full font-mono text-xs border rounded p-2"
                placeholder="/* Global CSS for your project */"
            />
                        <button
                            onClick={() => W.updateGlobalCss(globalCss)}
                            className="mt-2 text-xs border rounded px-3 py-1 bg-gray-100 hover:bg-gray-200"
                        >
                            Save Styles
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}