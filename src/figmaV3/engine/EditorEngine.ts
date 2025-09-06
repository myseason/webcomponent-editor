/**
 * EditorEngine (Facade over editStore)
 * - feature/v1.3.1 기준 editStore API를 깔끔하게 감쌉니다.
 * - View/Controller는 반드시 이 파사드만 사용하세요. (zustand 내부 접근 금지)
 *
 * 네이밍 규칙:
 * - getXxx* : 읽기(조회)
 * - setXxx* : 단일 값/선택 변경
 * - updateXxx* : 부분 수정/패치
 * - add / remove /duplicate : 컬렉션 조작
*/

import { editorStore } from '../store/editStore';
import type { EditorStoreState } from '../store/types';
import type {
    NodeId,
    Page,
    Viewport,
    CSSDict,
    EditorMode,
    ProjectHubTab,
} from '../core/types';

export type Unsubscribe = () => void;

/** EditorEngine 이 노출하는 파사드 타입 */
export interface EditorEngineFacade {
    // ====== 공통 Store 접근자 ======
    getState(): EditorStoreState;
    update(mutator: (draft: EditorStoreState) => void, recordHistory?: boolean): void;
    subscribe(cb: () => void): Unsubscribe;

    // ====== Pages 도메인 ======
    pages: {
        // 조회
        getPages(): ReadonlyArray<Page>;
        getPageById(id: string): Page | undefined;
        getSelectedPageId(): string | null;
        getCurrentPage(): Page | null;

        // 쓰기
        setSelectedPageId(id: string): void;
        addPage(name?: string): string;
        removePage(id: string): void;
        duplicatePage(id: string): void;
        renamePage(id: string, name: string): void;
        updatePageMeta(id: string, meta: Partial<Page>): void;
    };

    // ====== Nodes 도메인 ======
    nodes: {
        // 조회
        getNodeById(id: NodeId): EditorStoreState['project']['nodes'][string] | undefined;
        getNodeChildrenIds(id: NodeId): NodeId[];
        getSelectedNodeId(): NodeId | null;

        // 쓰기
        setSelectedNodeId(id: NodeId | null): void;
        appendChildNode(parentId: NodeId, childId: NodeId, index?: number): void;
        moveNode(nodeId: NodeId, newParentId: NodeId, index?: number): void;
        removeNodeCascade(nodeId: NodeId): void;
        updateNodeProps(id: NodeId, props: Record<string, unknown>): void;
        updateNodeStyles(id: NodeId, styles: CSSDict, viewport?: Viewport): void;
        toggleNodeVisibility(id: NodeId): void;
        toggleNodeLock(id: NodeId): void;

        getParentId(id: NodeId): NodeId | null;
    };

    // ====== UI 도메인 ======
    ui: {
        // 조회
        getEditorMode(): EditorMode;
        getActiveHubTab(): ProjectHubTab | undefined;
        getCanvasSize(): { width: number; height: number };
        getCanvasZoom(): number;
        getActiveViewport(): Viewport | undefined;
        getBaseViewport(): Viewport | undefined;

        // 쓰기
        setEditorMode(mode: EditorMode): void;
        setActiveHubTab(tab: ProjectHubTab): void;
        setNotification(message: string): void;
        setCanvasSize(size: { width: number; height: number }): void;
        setCanvasZoom(zoom: number): void;
        setActiveViewport(viewport: Viewport): void;
        setBaseViewport(viewport: Viewport): void;
    };
}

/** 내부 editStore와 정확히 매핑된 파사드 구현 */
export const EditorEngine: EditorEngineFacade = {
    // ---------- 공통 ----------
    getState() {
        return editorStore.getState() as EditorStoreState;
    },

    update(mutator, recordHistory = false) {
        const S = editorStore.getState() as EditorStoreState & {
            update?: (fn: (d: EditorStoreState) => void, rec?: boolean) => void;
        };
        if (typeof S.update === 'function') {
            S.update(mutator, recordHistory);
            return;
        }
        // (fallback) setState 경로 — 거의 쓰이지 않도록 유지
        // @ts-expect-error mutate fallback
        editorStore.setState(mutator(S));
    },

    subscribe(cb) {
        return editorStore.subscribe(cb);
    },

    // ---------- Pages ----------
    pages: {
        // 조회
        getPages() {
            return (editorStore.getState() as EditorStoreState).project.pages;
        },

        getPageById(id) {
            const s = editorStore.getState() as EditorStoreState;
            return s.project.pages.find((p) => p.id === id);
        },

        getSelectedPageId() {
            const s = editorStore.getState() as EditorStoreState;
            const current = s.project.pages.find((p) => p.rootId === s.project.rootId);
            return current?.id ?? null;
        },

        getCurrentPage() {
            const s = editorStore.getState() as EditorStoreState;
            const current = s.project.pages.find((p) => p.rootId === s.project.rootId);
            return current ?? null;
        },

        // 쓰기
        setSelectedPageId(id) {
            const S = editorStore.getState() as EditorStoreState & { selectPage?: (pid: string) => void };
            S.selectPage?.(id);
        },

        addPage(name) {
            const S = editorStore.getState() as EditorStoreState & { addPage?: (title?: string) => string };
            return S.addPage?.(name) ?? '';
        },

        removePage(id) {
            const S = editorStore.getState() as EditorStoreState & { removePage?: (pid: string) => void };
            S.removePage?.(id);
        },

        duplicatePage(id) {
            const S = editorStore.getState() as EditorStoreState & { duplicatePage?: (pid: string) => void };
            S.duplicatePage?.(id);
        },

        renamePage(id, name) {
            EditorEngine.pages.updatePageMeta(id, { name });
        },

        updatePageMeta(id, meta) {
            EditorEngine.update((draft) => {
                const page = draft.project.pages.find((p) => p.id === id);
                if (!page) return;
                Object.assign(page, meta);
            }, true);
        },
    },

    // ---------- Nodes ----------
    nodes: {
        // 조회
        getNodeById(id) {
            return (editorStore.getState() as EditorStoreState).project.nodes[id];
        },

        getNodeChildrenIds(id) {
            const n = EditorEngine.nodes.getNodeById(id);
            return ((n?.children ?? []) as NodeId[]);
        },

        getSelectedNodeId() {
            const s = editorStore.getState() as EditorStoreState;
            return (s.ui.selectedId ?? null) as NodeId | null;
        },

        // 쓰기
        setSelectedNodeId(id) {
            const S = editorStore.getState() as EditorStoreState & { select?: (nid: NodeId | null) => void };
            S.select?.(id ?? null);
        },

        appendChildNode(parentId, childId, index) {
            // feature/v1.3.1: moveNode(nodeId, newParentId, newIndex)
            const S = editorStore.getState() as EditorStoreState & {
                moveNode?: (nid: NodeId, pid: NodeId, idx: number) => void;
            };
            const i =
                typeof index === 'number'
                    ? index
                    : EditorEngine.nodes.getNodeChildrenIds(parentId)?.length ?? 0;
            S.moveNode?.(childId, parentId, i);
        },

        moveNode(nodeId, newParentId, index) {
            const S = editorStore.getState() as EditorStoreState & {
                moveNode?: (nid: NodeId, pid: NodeId, idx: number) => void;
            };
            const i =
                typeof index === 'number'
                    ? index
                    : EditorEngine.nodes.getNodeChildrenIds(newParentId)?.length ?? 0;
            S.moveNode?.(nodeId, newParentId, i);
        },

        removeNodeCascade(nodeId) {
            const S = editorStore.getState() as EditorStoreState & { removeNodeCascade?: (nid: NodeId) => void };
            S.removeNodeCascade?.(nodeId);
        },

        updateNodeProps(id, props) {
            const S = editorStore.getState() as EditorStoreState & {
                updateNodeProps?: (id: NodeId, props: Record<string, unknown>) => void;
            };
            S.updateNodeProps?.(id, props);
        },

        updateNodeStyles(id, styles, viewport) {
            const S = editorStore.getState() as EditorStoreState & {
                updateNodeStyles?: (id: NodeId, styles: CSSDict, vp?: Viewport) => void;
            };
            S.updateNodeStyles?.(id, styles, viewport);
        },

        toggleNodeVisibility(id) {
            const S = editorStore.getState() as EditorStoreState & { toggleNodeVisibility?: (id: NodeId) => void };
            S.toggleNodeVisibility?.(id);
        },

        toggleNodeLock(id) {
            const S = editorStore.getState() as EditorStoreState & { toggleNodeLock?: (id: NodeId) => void };
            S.toggleNodeLock?.(id);
        },
        getParentId(id) {
            const st = editorStore.getState();
            const n = st.project.nodes[id] as any;
            return (n?.parentId as NodeId | undefined) ?? null;
        },
    },

    // ---------- UI ----------
    ui: {
        // 조회
        getEditorMode() {
            return (editorStore.getState() as EditorStoreState).ui.mode;
        },

        getActiveHubTab() {
            // ✅ v1.3.1: ui.panels.left.activeHubTab
            return (editorStore.getState() as EditorStoreState).ui.panels.left.activeHubTab;
        },

        getCanvasSize() {
            // ✅ v1.3.1: ui.canvas.width/height
            const { width, height } = (editorStore.getState() as EditorStoreState).ui.canvas;
            return { width, height };
        },

        getCanvasZoom() {
            // ✅ v1.3.1: ui.canvas.zoom
            return (editorStore.getState() as EditorStoreState).ui.canvas.zoom;
        },

        getActiveViewport() {
            // ✅ v1.3.1: ui.canvas.activeViewport
            return (editorStore.getState() as EditorStoreState).ui.canvas.activeViewport;
        },

        getBaseViewport() {
            // ✅ v1.3.1: ui.canvas.baseViewport
            return (editorStore.getState() as EditorStoreState).ui.canvas.baseViewport;
        },

        // 쓰기
        setEditorMode(mode) {
            const S = editorStore.getState() as EditorStoreState & { setEditorMode?: (m: EditorMode) => void };
            S.setEditorMode?.(mode);
        },

        setActiveHubTab(tab) {
            const S = editorStore.getState() as EditorStoreState & { setActiveHubTab?: (t: ProjectHubTab) => void };
            S.setActiveHubTab?.(tab);
        },

        setNotification(message) {
            const S = editorStore.getState() as EditorStoreState & { setNotification?: (m: string) => void };
            S.setNotification?.(message);
        },

        setCanvasSize(size) {
            const S = editorStore.getState() as EditorStoreState & {
                setCanvasSize?: (s: { width: number; height: number }) => void;
            };
            S.setCanvasSize?.(size);
        },

        setCanvasZoom(zoom) {
            const S = editorStore.getState() as EditorStoreState & { setCanvasZoom?: (z: number) => void };
            S.setCanvasZoom?.(zoom);
        },

        setActiveViewport(viewport) {
            const S = editorStore.getState() as EditorStoreState & { setActiveViewport?: (v: Viewport) => void };
            S.setActiveViewport?.(viewport);
        },

        setBaseViewport(viewport) {
            const S = editorStore.getState() as EditorStoreState & { setBaseViewport?: (v: Viewport) => void };
            S.setBaseViewport?.(viewport);
        },
    },
};

export default EditorEngine;