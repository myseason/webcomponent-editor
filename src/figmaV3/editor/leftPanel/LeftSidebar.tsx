'use client';
import React from 'react';
import { useEditor } from '../useEditor';
import type { ProjectHubTab, EditorMode } from '../../core/types';
import { Component, Layers, Folder, Image, Settings } from 'lucide-react';
import { PagesPanel } from './panels/PagesPanel';
import { AssetsPanel } from './panels/AssetsPanel';
import { ComponentsPanel } from './panels/ComponentsPanel';
import { Layers as LayersPanel } from './Layers';

// 임시 Placeholder 패널
const SettingsPanel = () => <div className="p-4 text-sm text-gray-500">Settings Panel (To be implemented)</div>;


const HUB_TABS: { id: ProjectHubTab; icon: React.ElementType }[] = [
    { id: 'Pages', icon: Folder },
    { id: 'Assets', icon: Image },
    { id: 'Components', icon: Component },
    { id: 'Layers', icon: Layers },
    { id: 'Settings', icon: Settings },
];

export function LeftSidebar() {
    const state = useEditor();
    const { ui, setEditorMode, setActiveHubTab } = state;
    const { activeHubTab } = ui.panels.left;
    const { mode } = ui;

    return (
        <div className="h-full flex min-h-0 bg-white border-r border-gray-200">
            {/* 1. 수직 아이콘 탭 바 */}
            <div className="w-12 h-full border-r bg-gray-50 flex flex-col items-center py-4 gap-2">
                {HUB_TABS.map(({ id, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveHubTab(id)}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg ${activeHubTab === id ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-200'}`}
                        title={id}
                    >
                        <Icon size={20} />
                    </button>
                ))}
            </div>

            {/* 2. 선택된 탭에 해당하는 패널 */}
            <div className="flex-1 min-w-0 flex flex-col">
                {/* 패널 최상단에 모드 스위처 배치 */}
                <div className="p-2 border-b">
                    <select
                        value={mode}
                        onChange={(e) => setEditorMode(e.target.value as EditorMode)}
                        className="w-full px-2 py-1.5 text-sm font-semibold border rounded bg-white"
                    >
                        <option value="Page">🚀 Page Build Mode</option>
                        <option value="Component">🛠️ Component Dev Mode</option>
                    </select>
                </div>

                <div className="flex-1 overflow-auto">
                    {activeHubTab === 'Pages' && <PagesPanel />}
                    {activeHubTab === 'Assets' && <AssetsPanel />}
                    {activeHubTab === 'Components' && <ComponentsPanel />}
                    {activeHubTab === 'Layers' && <LayersPanel />}
                    {activeHubTab === 'Settings' && <SettingsPanel />}
                </div>
            </div>
        </div>
    );
}