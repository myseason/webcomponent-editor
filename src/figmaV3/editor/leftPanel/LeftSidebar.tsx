'use client';

import * as React from 'react';
import type {EditorMode, ProjectHubTab} from '../../core/types';

// 패널들
import {PagesPanel} from './panels/PagesPanel';
import {AssetsPanel} from './panels/AssetsPanel';
import {ComponentsPanel} from './panels/ComponentsPanel';
import {Layers as LayersPanel} from './Layers';

import {modeBorderClass} from '../rightPanel/sections/styles/common';
import {LeftDomain, useLeftControllerFactory} from '../../controllers/left/LeftControllerFactory';

// 아이콘 (lucide-react)
import {
    Component as ComponentIcon,
    Folder as FolderIcon,
    GripHorizontal as GripIcon,
    Image as ImageIcon,
    Layers as LayersIcon,
    Settings as SettingsIcon,
} from 'lucide-react';
import {PanelTitle} from "@/figmaV3/editor/common/PanelTitle";

// 임시 Settings 패널(기존에 없다면 유지)
const SettingsPanel = () => (
    <div className="flex flex-col h-full">
        <PanelTitle title="Settings" />
        <div className="p-4 text-sm text-gray-500">Settings Panel (To be implemented)</div>
    </div>
);

// 모든 허브 탭(모드에 따라 필터링됨)
const HUB_TABS: { id: ProjectHubTab; icon: React.ElementType }[] = [
    { id: 'Pages', icon: FolderIcon },
    { id: 'Assets', icon: ImageIcon },
    { id: 'Components', icon: ComponentIcon },
    { id: 'Layers', icon: LayersIcon },
    { id: 'Settings', icon: SettingsIcon },
];

// 컴포넌트 모드에서 표시할 탭
const COMPONENT_MODE_TABS: Set<ProjectHubTab> = new Set(['Components', 'Layers']);

type HubTab = ProjectHubTab;

/** 좌측 수직 탭바 버튼 (기존 톤 유지) */
function TabButton({
                       icon: Icon,
                       label,
                       active,
                       onClick,
                       title,
                   }: {
    icon: React.ElementType;
    label: HubTab;
    active: boolean;
    onClick: () => void;
    title?: string;
}) {
    return (
        <button
            className={[
                'w-full h-10 box-border inline-flex items-center justify-center rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-0',
                active ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-200',
            ].join(' ')}
            onClick={onClick}
            aria-pressed={active}
            aria-label={label}
            title={title ?? label}
        >
            <Icon size={18} />
        </button>
    );
}

/** 상단/하단 사이 리사이저 바 (드래그 + 키보드 ↑/↓) */
function SplitResizer({
                          currentPct,
                          onChangePct,
                      }: {
    currentPct: number;
    onChangePct: (pct: number) => void;
}) {
    const clamp = (v: number) => Math.max(20, Math.min(80, v));

    const onMouseDown = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const container = (e.currentTarget.parentElement as HTMLDivElement) ?? null;
        if (!container) return;
        const rect = container.getBoundingClientRect();

        const onMove = (ev: MouseEvent) => {
            const y = ev.clientY;
            const clampedY = Math.max(rect.top + 60, Math.min(rect.bottom - 60, y));
            const pct = ((clampedY - rect.top) / rect.height) * 100;
            onChangePct(clamp(pct));
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }, [onChangePct]);

    const onKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            onChangePct(clamp(currentPct - 2));
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            onChangePct(clamp(currentPct + 2));
        }
    }, [currentPct, onChangePct]);

    return (
        <div
            role="separator"
            aria-orientation="horizontal"
            tabIndex={0}
            className="h-2 cursor-row-resize flex items-center justify-center select-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            onMouseDown={onMouseDown}
            onKeyDown={onKeyDown}
            title="Drag to resize"
            aria-valuenow={Math.round(currentPct)}
            aria-valuemin={20}
            aria-valuemax={80}
        >
            <div className="w-10 h-0.5 bg-gray-300 rounded" />
        </div>
    );
}

/** 탭 → 패널 매핑 (기존 유지) */
function SinglePanel({ tab }: { tab: HubTab }) {
    if (tab === 'Pages') return <PagesPanel />;
    if (tab === 'Assets') return <AssetsPanel />;
    if (tab === 'Components') return <ComponentsPanel />;
    if (tab === 'Layers') return <LayersPanel />;
    if (tab === 'Settings') return <SettingsPanel />;
    return <div className="p-2 text-sm text-gray-500">Not implemented</div>;
}

export function LeftSidebar() {
    const { reader, writer } = useLeftControllerFactory(LeftDomain.Sidebar);

    // ── 모드 UI(기존 유지) ────────────────────────────────────────────────
    const ui = reader.getUI();
    const mode = (ui?.mode ?? 'Page') as EditorMode;

    const handleModeChange = React.useCallback((newMode: EditorMode) => {
        if (ui.mode === newMode) return;
        writer.setEditorMode?.(newMode);
        const message =
            newMode === 'Page'
                ? '🚀 페이지 빌드 모드로 전환되었습니다.'
                : '🛠️ 컴포넌트 개발 모드로 전환되었습니다.';
        writer.setNotification?.(message);
    }, [ui.mode, writer.setEditorMode, writer.setNotification]);

    const modeBorderStyle = modeBorderClass(ui?.mode);

    // ── 좌측 패널 상태(기존 + Split) ─────────────────────────────────────
    const leftUI = ui?.panels?.left ?? {
        activeHubTab: 'Pages' as HubTab,
        isSplit: false,
        splitPercentage: 50,
    };
    const activeHubTab = (leftUI.activeHubTab ?? 'Pages') as HubTab;
    const isSplit = !!leftUI.isSplit;
    const splitPct =
        typeof leftUI.splitPercentage === 'number' ? leftUI.splitPercentage : 50;

    // 모드에 따른 탭 1차 필터
    const availableTabs = React.useMemo(() => {
        if (mode === 'Component') {
            return HUB_TABS.filter((t) => COMPONENT_MODE_TABS.has(t.id));
        }
        return HUB_TABS;
    }, [mode]);

    // ✅ 분할 모드에서는 좌측 Layers 탭을 숨김 (하단에 Layers 고정 표시)
    const showLayersInLeft = !isSplit;
    const visibleTabs = React.useMemo(() => {
        return showLayersInLeft
            ? availableTabs
            : availableTabs.filter((t) => t.id !== 'Layers');
    }, [availableTabs, showLayersInLeft]);

    // 좌측에서 숨김 처리로 인해 활성 탭이 Layers면 안전하게 Components로 보정
    React.useEffect(() => {
        if (!showLayersInLeft && activeHubTab === 'Layers') {
            writer.setActiveHubTab?.('Components');
        }
    }, [showLayersInLeft, activeHubTab, writer.setActiveHubTab]);

    // (기존) 컴포넌트 모드에서 금지 탭이 활성화돼 있으면 Components로 보정
    React.useEffect(() => {
        if (mode === 'Component' && !COMPONENT_MODE_TABS.has(activeHubTab)) {
            writer.setActiveHubTab?.('Components');
        }
    }, [mode, activeHubTab, writer.setActiveHubTab]);

    // Split 리사이저 변경 핸들러
    const handleResizePct = React.useCallback((pct: number) => {
        const clamped = Math.max(20, Math.min(80, pct));
        writer.setLeftPanelSplitPercentage?.(clamped);
    }, [writer.setLeftPanelSplitPercentage]);

    // 분할 모드에서 상단 패널이 Layers와 중복되면 상단은 Components로
    const primaryTab: HubTab = React.useMemo(() => {
        if (!isSplit) return activeHubTab;
        if (activeHubTab === 'Layers') return 'Components';
        return activeHubTab;
    }, [isSplit, activeHubTab]);

    return (
        <div className="h-full flex bg-white">
            {/* 1. 수직 아이콘 탭 바 */}
            <div className="w-12 px-1 py-1 box-border flex flex-col gap-2 border-r border-gray-200 shrink-0">
                {visibleTabs.map(({ id, icon }) => (
                    <TabButton
                        key={id}
                        icon={icon}
                        label={id}
                        active={activeHubTab === id}
                        onClick={() => writer.setActiveHubTab?.(id)}
                        title={id}
                    />
                ))}

                {/* Split 토글 버튼 */}
                <button
                    className={[
                        'w-10 h-10 mt-1 inline-flex items-center justify-center rounded-lg transition',
                        isSplit ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-200',
                    ].join(' ')}
                    title={isSplit ? 'Split View: ON (Click to turn OFF)' : 'Split View: OFF (Click to turn ON)'}
                    onClick={() => writer.toggleLeftPanelSplit?.()}
                    aria-pressed={isSplit}
                    aria-label="Toggle Split View"
                >
                    <GripIcon size={18} />
                </button>
            </div>

            {/* 2. 콘텐츠 영역 */}
            <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
                {/* 모드 구분 색상 테두리 */}
                <div className={`w-full border-t-4 ${modeBorderStyle}`}></div>

                {/* 모드 스위처 */}
                <div className="p-2 border-b">
                    <select
                        value={mode}
                        onChange={(e) => handleModeChange(e.target.value as EditorMode)}
                        className="w-full px-2 py-1.5 text-sm font-semibold border rounded bg-white"
                    >
                        <option value="Page">🚀 Page Build Mode</option>
                        <option value="Component">🛠️ Component Dev Mode</option>
                    </select>
                </div>

                {/* 본문: 단일 or 분할 */}
                <div className="flex-1 min-h-0">
                    {!isSplit ? (
                        <div className="h-full overflow-auto">
                            <SinglePanel tab={activeHubTab} />
                        </div>
                    ) : (
                        <div className="h-full flex flex-col">
                            <div
                                className="min-h-[120px] overflow-auto"
                                style={{ height: `calc(${splitPct}% - 4px)` }}
                            >
                                <SinglePanel tab={primaryTab} />
                            </div>

                            <SplitResizer currentPct={splitPct} onChangePct={handleResizePct} />

                            <div className="flex-1 min-h-[120px] overflow-auto border-t border-gray-200">
                                {/* 분할 하단은 Layers 고정 */}
                                <LayersPanel />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}