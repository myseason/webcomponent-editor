'use client';

import type { DomainPack } from '../Engine';
import { EditorEngineCore } from '../EditorEngineCore';
import type {EditorUI, NodeId, Viewport, ViewportMode} from '../../core/types';

/**
 * UI Domain
 * - 슬라이스 액션이 있으면 우선 사용
 * - 없으면 EditorEngineCore.updatePatch 로 안전 폴백
 */
export function uiDomain(): DomainPack {
    const getUI = (): EditorUI => EditorEngineCore.getState().ui as EditorUI;
    const getUi = (): EditorUI => EditorEngineCore.getState().ui as EditorUI;

    const reader = {
        /** 전체 UI 객체 */
        getUI,
        getUi, //fallback
        /** 캔버스 파생 값들 */
        zoom: (): number => getUI()?.canvas?.zoom ?? 1,
        activeViewport: (): Viewport => (getUI()?.canvas?.activeViewport ?? 'desktop') as Viewport,
        baseViewport: (): Viewport => (getUI()?.canvas?.baseViewport ?? 'desktop') as Viewport,
        viewportMode: (vp: Viewport): ViewportMode =>
            (getUI()?.canvas?.vpMode?.[vp] ?? 'size') as ViewportMode,

        /** 에디터 모드 */
        getEditorMode: (): EditorUI['mode'] => getUI()?.mode ?? 'design',

        /** 좌측 허브 탭 */
        getActiveHubTab: (): any => getUI()?.panels?.left?.activeHubTab ?? 'layers',

        /** 좌측 패널 분할 상태 */
        isLeftPanelSplit: (): boolean => !!getUI()?.panels?.left?.isSplit,
        getLeftPanelSplitPercentage: (): number => getUI()?.panels?.left?.splitPercentage ?? 50,

        /** ✅ expert 모드 조회 */
        getExpertMode: (): boolean => !!getUI()?.expertMode,

        getEffectiveDecl: (nodeId: NodeId) => {
            const s = EditorEngineCore.getState();
            const node = s.project.nodes[nodeId];
            if (!node)
                return null;

            const el = node.styles?.element ?? {};
            const base = s.ui.canvas.baseViewport;
            const active = s.ui.canvas.activeViewport;
            const mode = s.ui.canvas.vpMode[active];

            const baseDecl = (el as any)[base] ?? {};
            if (mode === 'Independent' && active !== base) {
                const ov = (el as any)[active] ?? {};
                return { ...baseDecl, ...ov };
            }
            return { ...baseDecl };
        }

    } as const;

    const writer = {
        /** 캔버스 크기/확대/뷰포트/방향 */
        setCanvasSize(size: { width: number; height: number }) {
            const s = EditorEngineCore.getState() as any;
            if (s.setCanvasSize) return s.setCanvasSize(size);
            const ui = getUI();
            EditorEngineCore.updatePatch(({ patchUI }) =>
                patchUI({ canvas: { ...ui.canvas, width: size.width, height: size.height } })
            );
        },

        setCanvasZoom(zoom: number) {
            const s = EditorEngineCore.getState() as any;
            if (s.setCanvasZoom) return s.setCanvasZoom(zoom);
            const ui = getUI();
            EditorEngineCore.updatePatch(({ patchUI }) =>
                patchUI({ canvas: { ...ui.canvas, zoom } })
            );
        },

        setActiveViewport(vp: Viewport) {
            const s = EditorEngineCore.getState() as any;
            if (s.setActiveViewport) return s.setActiveViewport(vp);
            const ui = getUI();
            EditorEngineCore.updatePatch(({ patchUI }) =>
                patchUI({ canvas: { ...ui.canvas, activeViewport: vp } })
            );
        },

        setBaseViewport(vp: Viewport) {
            const s = EditorEngineCore.getState() as any;
            if (s.setBaseViewport) return s.setBaseViewport(vp);
            const ui = getUI();
            EditorEngineCore.updatePatch(({ patchUI }) =>
                patchUI({ canvas: { ...ui.canvas, baseViewport: vp } })
            );
        },

        setViewportMode(vp: Viewport, mode: ViewportMode) {
            const s = EditorEngineCore.getState() as any;
            if (s.setViewportMode) return s.setViewportMode(vp, mode);
            const ui = getUI();
            const prev = ui.canvas?.vpMode ?? ({} as Record<Viewport, ViewportMode>);
            EditorEngineCore.updatePatch(({ patchUI }) =>
                patchUI({ canvas: { ...ui.canvas, vpMode: { ...prev, [vp]: mode } } })
            );
        },

        toggleCanvasOrientation() {
            const s = EditorEngineCore.getState() as any;
            if (s.toggleCanvasOrientation) return s.toggleCanvasOrientation();
            const ui = getUI();
            const curr = ui.canvas?.orientation ?? 'portrait';
            const next = curr === 'portrait' ? 'landscape' : 'portrait';
            EditorEngineCore.updatePatch(({ patchUI }) =>
                patchUI({ canvas: { ...ui.canvas, orientation: next as 'portrait' | 'landscape' } })
            );
        },

        /** 에디터 모드/허브 탭 */
        setEditorMode(mode: EditorUI['mode']) {
            const s = EditorEngineCore.getState() as any;
            if (s.setEditorMode) return s.setEditorMode(mode);
            EditorEngineCore.updatePatch(({ patchUI }) => patchUI({ mode }));
        },

        setActiveHubTab(tab: any) {
            const s = EditorEngineCore.getState() as any;
            if (s.setActiveHubTab) return s.setActiveHubTab(tab);
            const ui = getUI();
            EditorEngineCore.updatePatch(({ patchUI }) =>
                patchUI({
                    panels: {
                        ...ui.panels,
                        left: { ...ui.panels.left, activeHubTab: tab },
                    } as EditorUI['panels'],
                })
            );
        },

        /** 좌측 패널 분할 */
        toggleLeftPanelSplit() {
            const s = EditorEngineCore.getState() as any;
            if (s.toggleLeftPanelSplit) return s.toggleLeftPanelSplit();
            const ui = getUI();
            const curr = !!ui.panels?.left?.isSplit;
            EditorEngineCore.updatePatch(({ patchUI }) =>
                patchUI({
                    panels: {
                        ...ui.panels,
                        left: { ...ui.panels.left, isSplit: !curr },
                    } as EditorUI['panels'],
                })
            );
        },

        setLeftPanelSplitPercentage(pct: number) {
            const s = EditorEngineCore.getState() as any;
            if (s.setLeftPanelSplitPercentage) return s.setLeftPanelSplitPercentage(pct);
            const ui = getUI();
            EditorEngineCore.updatePatch(({ patchUI }) =>
                patchUI({
                    panels: {
                        ...ui.panels,
                        left: { ...ui.panels.left, splitPercentage: pct },
                    } as EditorUI['panels'],
                })
            );
        },

        /** ✅ expert 모드 설정/토글 */
        setExpertMode(enabled: boolean) {
            const s = EditorEngineCore.getState() as any;
            if (s.setExpertMode) return s.setExpertMode(enabled);
            EditorEngineCore.updatePatch(({ patchUI }) => patchUI({ expertMode: !!enabled } as any));
        },

        toggleExpertMode() {
            const s = EditorEngineCore.getState() as any;
            if (s.toggleExpertMode) return s.toggleExpertMode();
            const curr = !!reader.getExpertMode();
            EditorEngineCore.updatePatch(({ patchUI }) => patchUI({ expertMode: !curr } as any));
        },
    } as const;

    return { reader, writer };
}

export default uiDomain;