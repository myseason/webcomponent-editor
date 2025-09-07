'use client';
/**
 * AssetsPanel
 * - Media: 이미지 등 정적 자산 업로드 및 관리
 * - Scripts (전문가): 전역 JS 편집
 * - Styles (전문가): 전역 CSS 및 테마 변수 편집
 */
import React, {useCallback, useState} from 'react';
import type {Asset} from '../../../core/types';

import {LeftDomain, useLeftPanelController} from '../../../controllers/left/LeftPanelController';

type AssetTab = 'Media' | 'Scripts' | 'Styles';

export function AssetsPanel() {
    const { reader, writer } = useLeftPanelController([LeftDomain.Assets]);
    const project = reader.getProject();
    const ui   = reader.getUi();

    const expertMode = ui.expertMode;

    const [activeTab, setActiveTab] = useState<AssetTab>('Media');
    const [globalCss, setGlobalCss] = useState(project.globalCss ?? '');
    const [globalJs, setGlobalJs] = useState(project.globalJs ?? '');

    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const url = event.target?.result as string;
            if (url) {
                writer.addAsset({
                    name: file.name,
                    url,
                    type: file.type.startsWith('image/') ? 'image' : 'video', // 간단한 타입 추론
                });
            }
        };
        reader.readAsDataURL(file);
    }, [writer.addAsset]);

    return (
        <div className="p-2 h-full flex flex-col">
            <div className="flex gap-2 mb-2 border-b">
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

            <div className="flex-1 overflow-auto">
                {activeTab === 'Media' && (
                    <div className="space-y-2">
                        <label className="w-full text-center px-3 py-2 border-2 border-dashed rounded-md cursor-pointer hover:border-blue-500 hover:bg-blue-50 block">
                            <span>Click to upload files</span>
                            <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,video/*" />
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {(project.assets ?? []).map((asset: Asset) => (
                                <div key={asset.id} className="relative group">
                                    <img src={asset.url} alt={asset.name} className="w-full h-20 object-cover rounded" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <button onClick={() => writer.removeAsset(asset.id)} className="text-white text-xs bg-red-500 px-2 py-1 rounded">Delete</button>
                                    </div>
                                    <div className="text-[10px] truncate" title={asset.name}>{asset.name}</div>
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
                        <button onClick={() => writer.updateGlobalJs(globalJs)} className="mt-2 text-xs border rounded px-3 py-1 bg-gray-100 hover:bg-gray-200">
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
                        <button onClick={() => writer.updateGlobalCss(globalCss)} className="mt-2 text-xs border rounded px-3 py-1 bg-gray-100 hover:bg-gray-200">
                            Save Styles
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}