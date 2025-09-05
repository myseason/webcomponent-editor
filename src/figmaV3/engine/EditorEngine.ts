import type { NodeId } from '../core/types';

type AnyRecord = Record<string, unknown>;

/**
 * EditorEngine (Facade, POJO)
 * - 절대 React Hook을 호출하지 않습니다.
 * - 외부(컨트롤러 훅)에서 전달 받은 zustand state 레퍼런스를 사용합니다.
 * - v1.3.1 기준 slice API(selectPage/addPage/.../select 등) + update(recipe) 프록시를 제공합니다.
 */
export class EditorEngine {
    constructor(
        private readonly state: {
            ui: any;
            project: any;

            // ---- nodeSlice / props/styles ----
            updateNodeProps?: (id: NodeId, patch: AnyRecord) => void;
            updateNodeStyles?: (id: NodeId, patch: AnyRecord, viewport?: any) => void;
            toggleNodeVisibility?: (id: NodeId) => void;
            toggleNodeLock?: (id: NodeId) => void;
            removeNodeCascade?: (id: NodeId) => void;

            // ---- pageSlice ----
            selectPage?: (pageId: string) => void;
            addPage?: (name?: string) => string;
            removePage?: (pageId: string) => void;
            duplicatePage?: (pageId: string) => void;

            // ---- uiSlice ----
            select?: (id: NodeId | null) => void;
            setNotification?: (msg: string) => void;

            // ---- immer-style update (v1.3.1에서 View가 직접 쓰던 그 API) ----
            update?: (recipe: (draft: any) => void) => void;
        }
    ) {}

    // ===== Query =====
    getUI() { return this.state.ui; }
    getProject() { return this.state.project; }
    getNode(nodeId: NodeId) {
        return this.state.project?.nodes?.[nodeId] ?? null;
    }
    getComponentIdOf(nodeId: NodeId): string | null {
        return (this.getNode(nodeId)?.componentId as string) ?? null;
    }

    // ===== Command (zustand slices 프록시) =====
    // UI
    select(nodeId: NodeId | null) {
        if (typeof this.state.select === 'function') this.state.select(nodeId);
    }
    setNotification(message: string) {
        if (typeof this.state.setNotification === 'function') this.state.setNotification(message);
    }

    // Pages
    selectPage(pageId: string) {
        if (typeof this.state.selectPage === 'function') this.state.selectPage(pageId);
    }
    addPage(name?: string): string {
        if (typeof this.state.addPage === 'function') return this.state.addPage(name);
        return '';
    }
    removePage(pageId: string) {
        if (typeof this.state.removePage === 'function') this.state.removePage(pageId);
    }
    duplicatePage(pageId: string) {
        if (typeof this.state.duplicatePage === 'function') this.state.duplicatePage(pageId);
    }

    // Nodes
    updateNodeProps(nodeId: NodeId, patch: AnyRecord) {
        if (typeof this.state.updateNodeProps === 'function') this.state.updateNodeProps(nodeId, patch);
    }
    updateNodeStyles(nodeId: NodeId, patch: AnyRecord, viewport?: any) {
        if (typeof this.state.updateNodeStyles === 'function') this.state.updateNodeStyles(nodeId, patch, viewport);
    }
    toggleNodeVisibility(id: NodeId) {
        if (typeof this.state.toggleNodeVisibility === 'function') this.state.toggleNodeVisibility(id);
    }
    toggleNodeLock(id: NodeId) {
        if (typeof this.state.toggleNodeLock === 'function') this.state.toggleNodeLock(id);
    }
    removeNodeCascade(id: NodeId) {
        if (typeof this.state.removeNodeCascade === 'function') this.state.removeNodeCascade(id);
    }

    // Convenience
    changeTag(nodeId: NodeId, tag: string) {
        this.updateNodeProps(nodeId, { __tag: tag });
    }

    // ===== Pages: rename / updateMeta (slice에 정식 API가 없어 Engine에서 캡슐화) =====
    renamePage(pageId: string, title: string) {
        if (typeof this.state.update !== 'function') return;
        this.state.update((draft: any) => {
            const p = draft?.project;
            if (!p?.pages) return;
            const page = p.pages.find((x: any) => x.id === pageId);
            if (page) page.name = title;
        });
    }

    /**
     * updatePageMeta
     * @param pageId 대상 페이지 id
     * @param patch  { name?, description?, slug? } 등 메타 부분만 허용
     */
    updatePageMeta(pageId: string, patch: AnyRecord) {
        if (typeof this.state.update !== 'function') return;
        this.state.update((draft: any) => {
            const p = draft?.project;
            if (!p?.pages) return;
            const page = p.pages.find((x: any) => x.id === pageId);
            if (!page) return;
            // 안전하게 필요한 key만 반영
            if (typeof patch.name === 'string') page.name = patch.name;
            if (typeof patch.description === 'string') page.description = patch.description;
            if (typeof patch.slug === 'string') page.slug = patch.slug;
        });
    }
}