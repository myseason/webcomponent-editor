/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useStoreTick } from '../adapters/useStoreTick';
import { useEngine, EngineDomain } from '../../engine/Engine';
import type { Project, EditorUI, FlowEdge } from '../../core/types';

export enum BottomDomain {
    Dock = 'dock',
    Flows = 'flows',
    Fragments = 'fragments',
    Data = 'data',
    Actions = 'actions',
}

export function useBottomPanelController(domains: BottomDomain[]) {
    if (!Array.isArray(domains) || domains.length === 0) {
        throw new Error('[useBottomPanelController] "domains" must be a non-empty array of BottomDomain.');
    }

    // 하단 패널에서 사용하는 엔진 도메인
    const { reader: RE, writer: WE } = useEngine([
        EngineDomain.UI,
        EngineDomain.Flow,
        EngineDomain.Components, // fragments
        EngineDomain.Data,
        EngineDomain.Actions,
        EngineDomain.History,
    ]);
    useStoreTick();

    const readerCommon = {
        getProject: (): Project => RE.getProject(),
        getUi: (): EditorUI => RE.getUi(),
    } as const;

    const readers: Record<BottomDomain, Record<string, any>> = {
        [BottomDomain.Dock]: {
            getBottomDockOpen: () => Boolean(RE.getUi()?.panels?.bottom?.open),
        },
        [BottomDomain.Flows]: {
            getFlowEdges: (): FlowEdge[] => RE.getFlowEdges?.() ?? [],
        },
        [BottomDomain.Fragments]: {
            getComponents: () => RE.getComponents(), // fragment == component
        },
        [BottomDomain.Data]: {
            getDataSources: () => RE.getDataSources?.() ?? [],
        },
        [BottomDomain.Actions]: {
            getActions: () => RE.getActions?.() ?? [],
        },
    };

    const writers: Record<BottomDomain, Record<string, any>> = {
        [BottomDomain.Dock]: {
            toggleBottomDock: () => WE.toggleBottomDock?.(),
        },
        [BottomDomain.Flows]: {
            addFlowEdge: (edge: FlowEdge) => WE.addFlowEdge(edge),
            updateFlowEdge: (id: string, patch: Partial<FlowEdge>) => WE.updateFlowEdge(id, patch),
            removeFlowEdge: (id: string) => WE.removeFlowEdge(id),
        },
        [BottomDomain.Fragments]: {
            addComponent: (name: string) => WE.addComponent(name),
            removeComponent: (id: string) => WE.removeComponent(id),

            // @deprecated 호환
            addFragment: (name: string) => WE.addComponent(name),
            removeFragment: (id: string) => WE.removeComponent(id),

            openComponentEditor: (id: string) => WE.openComponentEditor(id),
        },
        [BottomDomain.Data]: {
            addDataSource: (ds: any) => WE.addDataSource?.(ds),
            updateDataSource: (id: string, patch: any) => WE.updateDataSource?.(id, patch),
            removeDataSource: (id: string) => WE.removeDataSource?.(id),
        },
        [BottomDomain.Actions]: {
            addAction: (a: any) => WE.addAction?.(a),
            updateAction: (id: string, patch: any) => WE.updateAction?.(id, patch),
            removeAction: (id: string) => WE.removeAction?.(id),
        },
    };

    // 도메인 병합 + 공통 포함
    const reader: Record<string, any> = { ...readerCommon };
    const writer: Record<string, any> = {};
    for (const d of domains) {
        Object.assign(reader, readers[d]);
        Object.assign(writer, writers[d]);
    }

    return { reader, writer } as const;
}

export default useBottomPanelController;