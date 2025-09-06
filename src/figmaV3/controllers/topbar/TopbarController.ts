'use client';

import { useRef, useSyncExternalStore } from 'react';
import { EditorEngine } from '../../engine/EditorEngine';

// 레포 타입 의존 최소화(파사드 정리 후 점진적으로 좁힙니다)
type Project = any;
type EditorState = any;
type PageId = string;
type Viewport = string;
type ViewportMode = string;

export interface TopbarReader {
    project(): Project;
    ui(): any;
    data(): any;
    history(): any;

    // Pages
    pages(): { id: PageId; name: string }[];
    currentPageId(): PageId | null;

    // Viewport / Zoom
    activeViewport(): Viewport;
    viewportMode(vp: Viewport): ViewportMode;
    zoom(): number;
}

export interface TopbarWriter {
    update(mutator: (draft: EditorState) => void): void;
    setNotification(message: string): void;

    // Pages
    setCurrentPage(id: PageId): void;
    addPage(name?: string): PageId;
    removePage(id: PageId): void;
    duplicatePage(id: PageId): PageId;
    renamePage(id: PageId, name: string): void;

    // Viewport / Canvas / Zoom / Preview
    setActiveViewport(vp: Viewport): void;
    setBaseViewport(vp: Viewport): void;               // ★ 추가
    setViewportMode(vp: Viewport, mode: ViewportMode): void; // ★ 추가
    toggleViewportMode(vp: Viewport): void;
    setCanvasSize(size: { width: number; height: number } | number, heightMaybe?: number): void; // ★ 추가
    setCanvasZoom(zoom: number): void;                  // ★ 추가
    toggleCanvasOrientation(): void;                    // ★ 추가
    zoomIn(): void;
    zoomOut(): void;
    resetZoom(): void;
    togglePreview(): void;

    // History
    undo(): void;
    redo(): void;

    // 호환 alias
    selectPage(id: PageId): void; // ★ 기존 코드 호환 (setCurrentPage와 동일)

    // (선택) 파사드 전체 노출
    pagesFacade?: any;
    uiFacade?: any;
}

export function useTopbarController(): { reader: () => TopbarReader; writer: () => TopbarWriter } {
    const cacheRef = useRef<{ state: any } | null>(null);

    const subscribe = (cb: () => void) =>
        EditorEngine.subscribe(() => {
            cacheRef.current = { state: EditorEngine.getState() };
            cb();
        });

    const getSnapshot = () => {
        if (!cacheRef.current) cacheRef.current = { state: EditorEngine.getState() };
        return cacheRef.current!;
    };

    const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    // ---------- Reader ----------
    const R: TopbarReader = {
        project() { return snap.state.project as Project; },
        ui() { return snap.state.ui; },
        data() { return snap.state.data ?? {}; },
        history() { return snap.state.history ?? {}; },

        pages() {
            const list = (EditorEngine as any).pages?.list?.() as { id: PageId; name: string }[] | undefined;
            if (Array.isArray(list)) return list;
            const pages = (snap.state.project?.pages ?? []) as any[];
            return pages.map(p => ({ id: p.id, name: p.name ?? p.title ?? p.id }));
        },
        currentPageId() {
            const cur = (EditorEngine as any).pages?.currentId?.();
            if (cur) return cur as PageId;
            return snap.state.ui?.currentPageId ?? null;
        },

        activeViewport() { return snap.state.ui?.canvas?.activeViewport as Viewport; },
        viewportMode(vp: Viewport) {
            const m = snap.state.ui?.canvas?.vpMode ?? {};
            return (m as Record<Viewport, ViewportMode>)[vp];
        },
        zoom() { return Number(snap.state.ui?.canvas?.zoom ?? 1); },
    };

    // ---------- Writer ----------
    const W: TopbarWriter = {
        update(mutator) { EditorEngine.update(mutator as any); },
        setNotification(msg) {
            (EditorEngine as any).ui?.setNotification?.(msg) ?? console.info('[notification]', msg);
        },

        // Pages
        setCurrentPage(id) {
            const f = (EditorEngine as any).pages?.setCurrent;
            if (f) return f(id);
            EditorEngine.update((draft: any) => {
                draft.ui = draft.ui || {};
                draft.ui.currentPageId = id;
            });
        },
        selectPage(id) { return this.setCurrentPage(id); }, // ★ alias

        addPage(name) {
            const f = (EditorEngine as any).pages?.add;
            if (f) return f(name);
            let newId = `page_${Date.now()}`;
            EditorEngine.update((draft: any) => {
                draft.project = draft.project || {};
                draft.project.pages = draft.project.pages || [];
                const p = { id: newId, name: name ?? 'Untitled' };
                draft.project.pages.push(p);
                draft.ui = draft.ui || {};
                draft.ui.currentPageId = p.id;
            });
            return newId;
        },
        removePage(id) {
            const f = (EditorEngine as any).pages?.remove;
            if (f) return f(id);
            EditorEngine.update((draft: any) => {
                const arr = draft.project?.pages ?? [];
                draft.project.pages = arr.filter((p: any) => p.id !== id);
                if (draft.ui?.currentPageId === id) {
                    draft.ui.currentPageId = draft.project.pages?.[0]?.id ?? null;
                }
            });
        },
        duplicatePage(id) {
            const f = (EditorEngine as any).pages?.duplicate;
            if (f) return f(id);
            let newId = `page_${Date.now()}`;
            EditorEngine.update((draft: any) => {
                const arr = draft.project?.pages ?? [];
                const src = arr.find((p: any) => p.id === id);
                if (!src) return;
                const copy = { ...src, id: newId, name: `${src.name ?? 'Copy'} copy` };
                draft.project.pages = [...arr, copy];
                draft.ui = draft.ui || {};
                draft.ui.currentPageId = copy.id;
            });
            return newId;
        },
        renamePage(id, name) {
            const f = (EditorEngine as any).pages?.rename;
            if (f) return f(id, name);
            EditorEngine.update((draft: any) => {
                const arr = draft.project?.pages ?? [];
                const p = arr.find((x: any) => x.id === id);
                if (p) p.name = name;
            });
        },

        // Viewport / Canvas / Zoom / Preview
        setActiveViewport(vp) {
            const f = (EditorEngine as any).ui?.setActiveViewport;
            if (f) return f(vp);
            EditorEngine.update((draft: any) => {
                draft.ui = draft.ui || {};
                draft.ui.canvas = draft.ui.canvas || {};
                draft.ui.canvas.activeViewport = vp;
            });
        },
        setBaseViewport(vp) { // ★ 추가
            const f = (EditorEngine as any).ui?.setBaseViewport;
            if (f) return f(vp);
            EditorEngine.update((draft: any) => {
                draft.ui = draft.ui || {};
                draft.ui.canvas = draft.ui.canvas || {};
                draft.ui.canvas.baseViewport = vp;
            });
        },
        setViewportMode(vp, mode) {
            const f = (EditorEngine as any).ui?.setViewportMode;
            if (typeof f === 'function') return f(vp, mode);

            // 폴백: 주어진 mode 문자열을 그대로 저장 (예: 'Unified' | 'Independent')
            EditorEngine.update((draft: any) => {
                draft.ui = draft.ui || {};
                draft.ui.canvas = draft.ui.canvas || {};
                const m = draft.ui.canvas.vpMode ?? {};
                draft.ui.canvas.vpMode = { ...m, [vp]: mode };
            });
        },
        toggleViewportMode(vp) {
            const f = (EditorEngine as any).ui?.toggleViewportMode;
            if (f) return f(vp);
            EditorEngine.update((draft: any) => {
                draft.ui = draft.ui || {};
                draft.ui.canvas = draft.ui.canvas || {};
                const m = draft.ui.canvas.vpMode ?? {};
                const cur = m[vp];
                draft.ui.canvas.vpMode = { ...m, [vp]: cur === 'preview' ? 'edit' : 'preview' };
            });
        },
        setCanvasSize(sizeOrW, hMaybe) {
            const f = (EditorEngine as any).ui?.setCanvasSize;
            if (typeof f === 'function') return f(sizeOrW, hMaybe);

            // 폴백: ui.canvas.width/height 직접 갱신 (기준 소스와 동일)
            const next =
                typeof sizeOrW === 'object'
                    ? { width: Number(sizeOrW.width), height: Number(sizeOrW.height) }
                    : { width: Number(sizeOrW), height: Number(hMaybe ?? 0) };

            EditorEngine.update((draft: any) => {
                draft.ui = draft.ui || {};
                draft.ui.canvas = draft.ui.canvas || {};
                draft.ui.canvas.width = next.width;
                draft.ui.canvas.height = next.height;
            });
        },

        setCanvasZoom(zoom: number) {
            const f = (EditorEngine as any).ui?.setCanvasZoom;
            if (typeof f === 'function') return f(zoom);

            // 폴백: 기준 PageBar와 동일 범위(0.25~4.0)로 클램프
            const z = Math.max(0.25, Math.min(Number(zoom), 4.0));
            EditorEngine.update((draft: any) => {
                draft.ui = draft.ui || {};
                draft.ui.canvas = draft.ui.canvas || {};
                draft.ui.canvas.zoom = z;
            });
        },

        toggleCanvasOrientation() {
            const f = (EditorEngine as any).ui?.toggleCanvasOrientation;
            if (typeof f === 'function') return f();

            // 폴백: width/height 스왑 (기준 소스와 동일)
            EditorEngine.update((draft: any) => {
                draft.ui = draft.ui || {};
                draft.ui.canvas = draft.ui.canvas || {};
                const c = draft.ui.canvas;
                const w = Number(c.width ?? 0);
                const h = Number(c.height ?? 0);
                if (w && h) {
                    c.width = h;
                    c.height = w;
                } else {
                    // 사이즈가 비어있으면 기본값이라도 보장
                    c.width = h || 800;
                    c.height = w || 1280;
                }
            });
        },
        zoomIn() {
            const f = (EditorEngine as any).ui?.zoomIn;
            if (f) return f();
            EditorEngine.update((draft: any) => {
                const cur = Number(draft.ui?.canvas?.zoom ?? 1);
                draft.ui = draft.ui || {};
                draft.ui.canvas = draft.ui.canvas || {};
                draft.ui.canvas.zoom = Math.min(cur * 1.1, 6);
            });
        },
        zoomOut() {
            const f = (EditorEngine as any).ui?.zoomOut;
            if (f) return f();
            EditorEngine.update((draft: any) => {
                const cur = Number(draft.ui?.canvas?.zoom ?? 1);
                draft.ui = draft.ui || {};
                draft.ui.canvas = draft.ui.canvas || {};
                draft.ui.canvas.zoom = Math.max(cur / 1.1, 0.1);
            });
        },
        resetZoom() {
            const f = (EditorEngine as any).ui?.resetZoom;
            if (f) return f();
            EditorEngine.update((draft: any) => {
                draft.ui = draft.ui || {};
                draft.ui.canvas = draft.ui.canvas || {};
                draft.ui.canvas.zoom = 1;
            });
        },
        togglePreview() {
            const f = (EditorEngine as any).ui?.togglePreview;
            if (f) return f();
            EditorEngine.update((draft: any) => {
                draft.ui = draft.ui || {};
                draft.ui.preview = !Boolean(draft.ui.preview);
            });
        },

        // History
        undo() {
            const f = (EditorEngine as any).history?.undo;
            if (f) return f();
            console.info('[history.undo] fallback noop');
        },
        redo() {
            const f = (EditorEngine as any).history?.redo;
            if (f) return f();
            console.info('[history.redo] fallback noop');
        },

        pagesFacade: (EditorEngine as any).pages,
        uiFacade: (EditorEngine as any).ui,
    };

    return { reader: () => R, writer: () => W };
}