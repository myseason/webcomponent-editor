'use client';

import { useStoreTick } from '../adapters/useStoreTick';
import { useEngine, EngineDomain } from '../../engine/Engine';
import type { EditorUI, Project, NodeId, Node, Page } from '../../core/types';

/** Left 패널 내 세부 도메인(패널) */
export enum LeftDomain {
    Layers = 'layers',
    Pages = 'pages',
    Components = 'components',
    Palette = 'palette',
    Assets = 'assets',
    Templates = 'templates',
    Stylesheets = 'stylesheets',
    Sidebar = 'sidebar',
}

function guardDomains(domains: LeftDomain[]): asserts domains is LeftDomain[] {
    if (!Array.isArray(domains) || domains.length === 0) {
        throw new Error('[useLeftPanelController] "domains" must be a non-empty array of LeftDomain.');
    }
}

export function useLeftPanelController(domains: LeftDomain[]) {
    guardDomains(domains);

    // Left에서 사용하는 엔진 도메인 묶음
    const engineDomains: EngineDomain[] = [
        EngineDomain.UI,
        EngineDomain.Components,
        EngineDomain.Assets,
        EngineDomain.Stylesheets,
        EngineDomain.Policy,
        EngineDomain.Selectors,
        EngineDomain.Flow,       // 일부 패널에서 사용
        EngineDomain.Data,       // (필요시) 데이터 소스
        EngineDomain.Actions,    // (필요시) 액션
        EngineDomain.History,    // (필요시) undo/redo
        // 기본 Project/Pages/Nodes 는 useEngine 내부에서 항상 포함
    ];

    const { reader: RE, writer: WE } = useEngine(engineDomains);
    useStoreTick();

    // -----------------------------
    // 공통 리더 (항상 노출)
    // -----------------------------
    const readerCommon = {
        getProject: (): Project => RE.getProject(),
        getUi: (): EditorUI => RE.getUi(),
        getNodeById: (id: string) => RE.getNode(id as NodeId) as Node | null,
        getNode: (id: string) => RE.getNode(id as NodeId) as Node | null,
        isAdmin: (): boolean => Boolean(RE.getUi()?.isAdmin),

        /** @deprecated use getProject() */
        project: (): Project => RE.getProject(),
        /** @deprecated use getUi() */
        ui: (): EditorUI => RE.getUi(),
        /** @deprecated use getNodeById(id) */
        nodeById: (id: string) => RE.getNode(id as NodeId),
    } as const;

    // -----------------------------
    // 도메인별 Reader
    // -----------------------------
    const readers: Record<LeftDomain, Record<string, any>> = {
        [LeftDomain.Layers]: {
            getOutline: () => RE.getOutline(),                // selectors
            getCurrentNode: () => RE.getCurrentNode(),        // nodes
        },
        [LeftDomain.Pages]: {
            getPages: () => RE.getPages(),                    // pages
            getCurrentPage: () => RE.getCurrentPage(),        // pages
        },
        [LeftDomain.Components]: {
            getComponents: () => RE.getComponents(),          // components
        },
        [LeftDomain.Palette]: {
            // 필요시 보강
        },
        [LeftDomain.Assets]: {
            getAssets: () => RE.getAssets(),                  // assets
            getGlobalCss: () => RE.getGlobalCss?.() ?? '',    // policy/data에 위치할 수도 있어 안전 호출
            getGlobalJs: () => RE.getGlobalJs?.() ?? '',
        },
        [LeftDomain.Templates]: {
            getComponents: () => RE.getComponents(),          // components 재사용
        },
        [LeftDomain.Stylesheets]: {
            getStylesheets: () => RE.getStylesheets(),        // stylesheets
        },
        [LeftDomain.Sidebar]: {
            getUI: () => RE.getUi(),                          // ui
        },
    };

    // -----------------------------
    // 도메인별 Writer
    // -----------------------------
    const writers: Record<LeftDomain, Record<string, any>> = {
        [LeftDomain.Layers]: {
            setCurrentNode: (id: string | null) => WE.setCurrentNode(id as NodeId | null),
            setNodeVisibility: (id: string, visible: boolean) => WE.setNodeVisibility(id as NodeId, visible),
            setNodeLocked: (id: string, locked: boolean) => WE.setNodeLocked(id as NodeId, locked),
            moveNode: (id: string, pid: string, idx?: number) => WE.moveNode(id as NodeId, pid as NodeId, idx ?? 0),
            addNode: (def: any, pid?: string, idx?: number) => WE.addNode(def, pid as NodeId | undefined, idx),
            removeNode: (id: string) => WE.removeNode(id as NodeId),
            removeNodeCascade: (id: string) => WE.removeNodeCascade(id as NodeId),

            // @deprecated aliases (기존 레이어 패널 호환)
            /** @deprecated use setCurrentNode(id) */
            select: (id: string | null) => WE.setCurrentNode(id as NodeId | null),
            /** @deprecated use setNodeVisibility(id, boolean) */
            toggleNodeVisibility: (id: string) => {
                const n = RE.getNode(id as NodeId);
                WE.setNodeVisibility(id as NodeId, !n?.isVisible);
            },
            /** @deprecated use setNodeLocked(id, boolean) */
            toggleNodeLock: (id: string) => {
                const n = RE.getNode(id as NodeId);
                WE.setNodeLocked(id as NodeId, !n?.locked);
            },
            /** @deprecated use removeNodeCascade(id) */
            removeCascade: (id: string) => WE.removeNodeCascade(id as NodeId),
            /** @deprecated use setNodeVisibility */
            toggleHidden: (id: string) => {
                const n = RE.getNode(id as NodeId);
                WE.setNodeVisibility(id as NodeId, !n?.isVisible);
            },
        },

        [LeftDomain.Pages]: {
            addPage: (name?: string) => WE.addPage(name),
            removePage: (id: string) => WE.removePage(id),
            duplicatePage: (id: string) => WE.duplicatePage(id),
            updatePageMeta: (id: string, patch: Partial<Page>) => WE.updatePageMeta(id, patch),
            setCurrentPage: (id: string) => WE.setCurrentPage(id),

            /** @deprecated use setCurrentPage(id) */
            selectPage: (id: string) => WE.setCurrentPage(id),
            /** @deprecated use updatePageMeta(id,{name}) */
            renamePage: (id: string, name: string) => WE.updatePageMeta(id, { name }),
        },

        [LeftDomain.Components]: {
            addComponent: (name: string) => WE.addComponent(name),
            updateComponent: (id: string, patch: any) => WE.updateComponent(id, patch),
            removeComponent: (id: string) => WE.removeComponent(id),
            publishComponent: (id: string) => WE.publishComponent(id),
            openComponentEditor: (id: string) => WE.openComponentEditor(id),
            insertComponent: (id: string, pid?: string, idx?: number) => WE.insertComponent(id, pid, idx),

            // @deprecated fragment naming 호환
            addFragment: (name: string) => WE.addComponent(name),
            updateFragment: (id: string, patch: any) => WE.updateComponent(id, patch),
            removeFragment: (id: string) => WE.removeComponent(id),
        },

        [LeftDomain.Palette]: {
            addNode: (def: any, pid?: string, idx?: number) => WE.addNode(def, pid, idx),
            insertComponent: (id: string, pid?: string, idx?: number) => WE.insertComponent(id, pid, idx),
        },

        [LeftDomain.Assets]: {
            addAsset: (f: File | { name: string; url: string }) => WE.addAsset(f as any),
            removeAsset: (id: string) => WE.removeAsset(id),
            updateGlobalCss: (css: string) => WE.updateGlobalCss(css),
            updateGlobalJs: (js: string) => WE.updateGlobalJs(js),
        },

        [LeftDomain.Templates]: {
            addComponent: (name: string) => WE.addComponent(name),
            removeComponent: (id: string) => WE.removeComponent(id),
            insertComponent: (id: string, pid?: string, idx?: number) => WE.insertComponent(id, pid, idx),
        },

        [LeftDomain.Stylesheets]: {
            addStylesheet: (name: string, content = '') => WE.addStylesheet(name, content),
            updateStylesheet: (id: string, content: string) => WE.updateStylesheet(id, content),
            removeStylesheet: (id: string) => WE.removeStylesheet(id),
        },

        [LeftDomain.Sidebar]: {
            setEditorMode: (mode: string) => WE.setEditorMode(mode as any),
            setActiveHubTab: (tab: string) => WE.setActiveHubTab(tab as any),
            toggleLeftPanelSplit: () => WE.toggleLeftPanelSplit(),
            setLeftPanelSplitPercentage: (pct: number) => WE.setLeftPanelSplitPercentage(pct),
        },
    };

    // -----------------------------
    // 병합 & 도메인 선택
    // -----------------------------
    const reader: Record<string, any> = { ...readerCommon };
    const writer: Record<string, any> = {};

    for (const d of domains) {
        Object.assign(reader, readers[d]);
        Object.assign(writer, writers[d]);
    }

    return { reader, writer } as const;
}

export default useLeftPanelController;