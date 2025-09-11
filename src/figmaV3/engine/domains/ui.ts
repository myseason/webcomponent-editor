import { EditorCore } from '../EditorCore';
import type {
    EditorState,
    EditorUI,
    NodeId,
    Viewport,
    ViewportMode,
    EditorMode,
    ProjectHubTab,
    BottomRightPanelKind
} from '../../core/types';
import { selectUi } from '../../store/slices/uiSlice';
import {buildNodeWithDefaults, genId} from "@/figmaV3/store/utils";

export function uiDomain() {
    const R = {
        getUI: (): EditorUI => selectUi(EditorCore.getState()),
        getSelectedNodeId: (): NodeId | null => R.getUI().selectedId,
        getEditorMode: (): EditorMode => R.getUI().mode,
        getExpertMode: (): boolean => !!R.getUI().expertMode,
    };

    const W = {
        setEditorMode(mode: EditorMode) {
            const state = EditorCore.store.getState();
            if (state.ui.mode === mode) return;

            if (mode === 'Page') {
                const targetPage = state.project.pages.find(p => p.id === state.ui.panels.left.lastActivePageId) ?? state.project.pages[0];
                if (targetPage) {
                    state._setRootId(targetPage.rootId);
                    state._setSelectedId(targetPage.rootId);
                }
                state._setEditingFragmentId(null);
                state._setActiveHubTab('Pages');
            } else {
                // 컴포넌트 모드
                const targetFragment =
                    state.project.fragments.find(f => f.id === state.ui.panels.left.lastActiveFragmentId) ?? state.project.fragments[0];

                if (!targetFragment) {
                    // ✅ 없으면 기본 컴포넌트와 Box 루트를 생성
                    const fragId  = genId('comp');        // 필요: genId, buildNodeWithDefaults import
                    const rootId  = genId('node');
                    const frag = { id: fragId, name: 'New Component', rootId, isPublic: false };
                    const root = buildNodeWithDefaults('box', rootId);

                    state._setFragments([...(state.project.fragments ?? []), frag]);
                    state._createNode(root);
                    state._setEditingFragmentId(fragId);
                } else {
                    state._setEditingFragmentId(targetFragment.id);
                }
                state._setSelectedId(targetFragment.rootId);
                state._setActiveHubTab('Components');

                // 컴포넌트 모드에서 Bottom Right(고급 패널) 기본 오픈 (SchemaEditor)
                state.update((s: EditorState) => {
                    s.ui = s.ui ?? ({} as any);
                    s.ui.panels = s.ui.panels ?? ({} as any);
                    s.ui.panels.bottom = s.ui.panels.bottom ?? ({} as any);

                    const cur = s.ui.panels.bottom.advanced ?? {
                        open: false,
                        kind: 'None' as BottomRightPanelKind,
                        widthPct: 36,
                    };

                    // "정의 없음/닫힘/None"일 때만 디폴트 적용 (사용자 설정은 존중)
                    if (!cur.open || cur.kind === 'None') {
                        s.ui.panels.bottom.advanced = {
                            open: true,
                            kind: 'SchemaEditor',
                            widthPct: cur.widthPct ?? 36,
                        };
                    }
                });
            }
            state._setEditorMode(mode);
        },
        openComponentEditor(fragmentId: string) {
            const state = EditorCore.store.getState();
            const frag = state.project.fragments.find(f => f.id === fragmentId);
            if (!frag) return;

            if (state.ui.mode === 'Page') {
                const currentPage = state.project.pages.find(p => p.rootId === state.project.rootId);
                state._setLastActivePageId(currentPage?.id ?? null);
            }
            state._setEditorMode('Component');
            state._setActiveHubTab('Components');
            state._setEditingFragmentId(fragmentId);
            state._setLastActiveFragmentId(fragmentId);
            state._setSelectedId(frag.rootId);
        },
        closeComponentEditor: () => W.setEditorMode('Page'),
        selectNode: (id: NodeId | null) => EditorCore.store.getState()._setSelectedId(id),
        setExpertMode: (expertMode: boolean) => EditorCore.store.getState()._setExpertMode(expertMode),
        setCanvasSize: (size: { width: number; height: number; }) => EditorCore.store.getState()._setCanvasSize(size),
        setCanvasZoom: (zoom: number) => EditorCore.store.getState()._setCanvasZoom(zoom),
        toggleCanvasOrientation: () => {
            const state = EditorCore.store.getState();
            const { width, height, orientation } = state.ui.canvas;
            const newOrientation = state.ui.canvas.orientation === 'landscape' ? 'portrait' : 'landscape';
            state._setCanvasSize({ width: height, height: width });
            state._setCanvasOrientation(newOrientation);
        },
        toggleBottomDock: () => EditorCore.store.getState()._toggleBottomDock(),
        setActiveViewport: (viewport: Viewport) => EditorCore.store.getState()._setActiveViewport(viewport),
        setBaseViewport: (viewport: Viewport) => EditorCore.store.getState()._setBaseViewport(viewport),
        setViewportMode: (viewport: Viewport, mode: ViewportMode) => EditorCore.store.getState()._setViewportMode(viewport, mode),
        setActiveHubTab: (tab: ProjectHubTab) => EditorCore.store.getState()._setActiveHubTab(tab),
        setNotification: (message: string | null) => EditorCore.store.getState()._setNotification(message),
        toggleLeftPanelSplit: () => {
            const state = EditorCore.store.getState();
            state._toggleLeftPanelSplit();
            if (state.ui.panels.left.isSplit && state.ui.panels.left.activeHubTab !== 'Layers') {
                state._setActiveHubTab('Layers');
            }
        },
        setLeftPanelSplitPercentage: (percentage: number) => EditorCore.store.getState()._setLeftPanelSplitPercentage(percentage),
        setLeftWidthPx: (px: number) => EditorCore.store.getState()._setLeftWidthPx(px),
        /** BottomDock의 높이(px) 설정 */
        setBottomDockHeightPx(heightPx: number) {
            const state = EditorCore.store.getState();
            state.update((s: EditorState) => {
                s.ui = s.ui ?? ({} as any);
                s.ui.panels = s.ui.panels ?? ({} as any);
                s.ui.panels.bottom = s.ui.panels.bottom ?? ({} as any);
                s.ui.panels.bottom.heightPx = Math.max(120, Math.floor(heightPx)); // 최저선은 컴포넌트 쪽에서 클램프해 전달해도 OK
            }, true);
        },

        /** BottomDock 펼침/접힘 (있으면 사용) */
        setBottomDockCollapsed(collapsed: boolean) {
            const state = EditorCore.store.getState();
            state.update((s: EditorState) => {
                s.ui = s.ui ?? ({} as any);
                s.ui.panels = s.ui.panels ?? ({} as any);
                s.ui.panels.bottom = s.ui.panels.bottom ?? ({} as any);
                s.ui.panels.bottom.isCollapsed = !!collapsed;
            }, true);
        },

        /** 우측 고급 패널 열기/종류 설정 (이미 있으시면 생략 가능) */
        setBottomRightPanel(next: { open: boolean; kind: BottomRightPanelKind; widthPct?: number }) {
            const state = EditorCore.store.getState();
            state.update((s: EditorState) => {
                s.ui = s.ui ?? ({} as any);
                s.ui.panels = s.ui.panels ?? ({} as any);
                s.ui.panels.bottom = s.ui.panels.bottom ?? ({} as any);
                const prev = s.ui.panels.bottom.advanced ?? { open: false, kind: 'None' as BottomRightPanelKind, widthPct: 36 };
                s.ui.panels.bottom.advanced = {
                    open: next.open,
                    kind: next.kind,
                    widthPct: next.widthPct ?? prev.widthPct ?? 36,
                };
            }, true);
        },

        /** Bottom 우측(고급) 패널의 너비 비율(%) 설정 */
        setBottomRightWidthPct(widthPct: number) {
            const state = EditorCore.store.getState();
            // 필요시 안전 범위(예: 24% ~ 60%)로 클램프 — 프로젝트 기준에 맞춰 조정
            const pct = Math.max(10, Math.min(90, Math.floor(widthPct)));

            state.update((s: EditorState) => {
                s.ui = s.ui ?? ({} as any);
                s.ui.panels = s.ui.panels ?? ({} as any);
                s.ui.panels.bottom = s.ui.panels.bottom ?? ({} as any);
                const cur =
                    s.ui.panels.bottom.advanced ??
                    ({ open: false, kind: 'None', widthPct: 36 } as { open: boolean; kind: BottomRightPanelKind; widthPct: number });

                s.ui.panels.bottom.advanced = { ...cur, widthPct: pct };
            }, true);
        },
        setCloseAdvancedRight(){
            const state = EditorCore.store.getState();
            state.update((s: EditorState) => {
                s.ui = s.ui ?? ({} as any);
                s.ui.panels = s.ui.panels ?? ({} as any);
                s.ui.panels.bottom = s.ui.panels.bottom ?? ({} as any);
                if (s.ui.panels.bottom.advanced) {
                    s.ui.panels.bottom.advanced.open = false;
                }
            });
        },
    };

    return { reader: R, writer: W } as const;
}