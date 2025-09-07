'use client';

import { useStoreTick } from '../adapters/useStoreTick';
import { useEngine, EngineDomain } from '../../engine/Engine';
import type { EditorUI, Project, Page, Viewport, ViewportMode, EditorState } from '../../core/types';
import { HistoryStack } from "../../engine/domains/history";

/**
 * TopbarController — Topbar 전용 단일 도메인 컨트롤러
 * - View에서 필요한 것만 단일 묶음으로 제공
 * - 내부적으로는 한 번의 useEngine 호출만 사용
 * - 상태는 useStoreTick()으로만 리렌더 트리거, 실제 값은 엔진 reader에서 즉시 조회
 */
export function useTopbarController() {
    // 1) 엔진 파사드(도메인 주입은 내부에서만)
    const { reader: RE, writer: WE } = useEngine([ EngineDomain.UI, EngineDomain.History]);

    // 2) 리렌더 트리거(스냅샷 보관 금지)
    useStoreTick();

    // ──────────────────────────────────────────────────────────────
    // Reader (Topbar가 화면에서 읽는 값들만)
    // ──────────────────────────────────────────────────────────────
    const reader = {
        // 프로젝트
        project: (): Project => (RE.getProject ? RE.getProject() : ({} as Project)),

        // 페이지
        pages: (): Page[] => (RE.getPages ? RE.getPages() : []),
        currentPage: (): Page | null => (RE.getCurrentPage ? RE.getCurrentPage() : null),

        // 프로젝트
        ui: (): EditorUI => (RE.getUi ? RE.getUi() : ({} as EditorUI)),

        // 캔버스/뷰포트
        zoom: (): number =>
            (RE.getCanvasZoom ? RE.getCanvasZoom() : (RE.getUI?.().canvas?.zoom ?? 1)),
        activeViewport: (): Viewport =>
            (RE.getActiveViewport
                ? RE.getActiveViewport()
                : (RE.getUI?.().canvas?.activeViewport ?? 'desktop')) as Viewport,
        viewportMode: (vp: Viewport): ViewportMode =>
            (RE.getViewportMode
                ? RE.getViewportMode(vp)
                : (RE.getUI?.().canvas?.vpMode?.[vp] ?? 'size')) as ViewportMode,
        canvasSize: (): { width: number; height: number } => {
            const c = RE.getUI?.().canvas ?? { width: 0, height: 0 };
            return { width: c.width ?? 0, height: c.height ?? 0 };
        },
        orientation: (): 'portrait' | 'landscape' =>
            (RE.getUI?.().canvas?.orientation ?? 'portrait') as 'portrait' | 'landscape',
        baseViewport: (): Viewport =>
            (RE.getBaseViewport
                ? RE.getBaseViewport()
                : (RE.getUI?.().canvas?.baseViewport ?? 'desktop')) as Viewport,

        // 히스토리
        canUndo: (): boolean => (RE.canUndo ? RE.canUndo() : true),
        canRedo: (): boolean => (RE.canRedo ? RE.canRedo() : true),
        getPast: (): HistoryStack =>  (RE.getPast() ? RE.getPast() : []),
        getFuture: (): HistoryStack => (RE.getFuture() ? RE.getFuture() : []),

        // 모드(에디터/스타일그래프)
        editorMode: (): string => (RE.getUI?.().mode ?? 'edit'),
        /** 스타일 그래프 모드: 'unified' | 'independent' */
        styleGraphMode: (): 'unified' | 'independent' =>
            ((RE.getUI?.() as any)?.styleGraphMode ?? 'unified') as 'unified' | 'independent',
    } as const;

    // ──────────────────────────────────────────────────────────────
    // Writer (Topbar가 실행하는 액션들만)
    // ──────────────────────────────────────────────────────────────
    const writer = {
        // 페이지
        selectPage: (pageId: string) =>
            WE.setCurrentPage ? WE.setCurrentPage(pageId) : (WE.selectPage ? WE.selectPage(pageId) : void 0),
        addPage: (name?: string) => (WE.addPage ? WE.addPage(name) : void 0),
        removePage: (id: string) => (WE.removePage ? WE.removePage(id) : void 0),
        duplicatePage: (id: string) => (WE.duplicatePage ? WE.duplicatePage(id) : void 0),
        updatePageMeta: (id: string, patch: Partial<Page>) =>
            (WE.updatePageMeta ? WE.updatePageMeta(id, patch) : void 0),

        // 캔버스/뷰포트
        setCanvasZoom: (zoom: number) => (WE.setCanvasZoom ? WE.setCanvasZoom(zoom) : void 0),
        setActiveViewport: (vp: Viewport) =>
            (WE.setActiveViewport ? WE.setActiveViewport(vp) : void 0),
        setViewportMode: (vp: Viewport, mode: ViewportMode) =>
            (WE.setViewportMode ? WE.setViewportMode(vp, mode) : void 0),
        setCanvasSize: (size: { width: number; height: number }) =>
            (WE.setCanvasSize ? WE.setCanvasSize(size) : void 0),
        toggleCanvasOrientation: () =>
            (WE.toggleCanvasOrientation ? WE.toggleCanvasOrientation() : void 0),
        setBaseViewport: (vp: Viewport) => (WE.setBaseViewport ? WE.setBaseViewport(vp) : void 0),

        // 히스토리
        undo: () => (WE.undo ? WE.undo() : void 0),
        redo: () => (WE.redo ? WE.redo() : void 0),

        // 모드
        setEditorMode: (mode: string) =>
            (WE.setEditorMode ? WE.setEditorMode(mode as any) : void 0),
        setStyleGraphMode: (m: 'unified' | 'independent') => {
            if ((WE as any).setStyleGraphMode) return (WE as any).setStyleGraphMode(m);
            if ((WE as any).updateUI) return (WE as any).updateUI({ styleGraphMode: m });
        },

        // 알림
        setNotification: (msg: string) => (WE.setNotification ? WE.setNotification(msg) : void 0),
    } as const;

    return { reader, writer } as const;
}

export default useTopbarController;