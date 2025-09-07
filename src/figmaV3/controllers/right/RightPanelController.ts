'use client';

import { useStoreTick } from '../adapters/useStoreTick';
import { useEngine, EngineDomain } from '../../engine/Engine';
import type { EditorUI, Project, NodeId, CSSDict } from '../../core/types';

/** Right 패널(Inspector) 도메인 – 섹션 구분은 내부로 흡수 */
export enum RightDomain {
    Inspector = 'inspector',
}

export function useRightPanelController(domains: RightDomain[]) {
    if (!Array.isArray(domains) || domains.length === 0) {
        throw new Error('[useRightPanelController] "domains" must be a non-empty array of RightDomain.');
    }
    // 인스펙터에서 사용하는 엔진 도메인
    const { reader: RE, writer: WE } = useEngine([
        EngineDomain.UI,
        EngineDomain.Policy,
        EngineDomain.Selectors,
        EngineDomain.Data,
        EngineDomain.Actions,
        EngineDomain.Components,   // Save-as-Component 등
        EngineDomain.History,
    ]);
    useStoreTick();

    const readerCommon = {
        getProject: (): Project => RE.getProject(),
        getUi: (): EditorUI => RE.getUi(),
        getCurrentNodeId: (): NodeId | null => RE.getCurrentNodeId(),
        getCurrentNode: () => RE.getCurrentNode(),
        getEffectiveDecl: (nodeId: string): CSSDict | null => RE.getEffectiveDecl(nodeId as NodeId),

        // 정책/팔레트 조회
        getStylePolicy: () => RE.getStylePolicy(),
        getColorPalette: () => RE.getColorPalette(),
        getFontFamilies: () => RE.getFontFamilies(),

        // 데이터/액션 조회
        getDataSources: () => RE.getDataSources?.() ?? [],
        getActions: () => RE.getActions?.() ?? [],
    } as const;

    const writerCommon = {
        // 스타일/프롭/스키마 쓰기
        updateNodeStyles: (nodeId: string, patch: CSSDict, vp?: string) =>
            WE.updateNodeStyles(nodeId as NodeId, patch, vp as any),
        updateNodeProps: (nodeId: string, patch: Record<string, unknown>) =>
            WE.updateNodeProps(nodeId as NodeId, patch),

        updateNodeSchema: (nodeId: string, schemaPatch: any) =>
            WE.updateNodeSchema(nodeId as NodeId, schemaPatch),

        // 정책 쓰기
        setColorPalette: (palette: any) => WE.setColorPalette(palette),
        setFontFamilies: (families: string[]) => WE.setFontFamilies(families),
        setProjectStylePolicy: (patch: any) => WE.setProjectStylePolicy(patch),

        // 데이터/액션 쓰기
        addDataSource: (ds: any) => WE.addDataSource?.(ds),
        removeDataSource: (id: string) => WE.removeDataSource?.(id),
        updateDataSource: (id: string, patch: any) => WE.updateDataSource?.(id, patch),

        addAction: (a: any) => WE.addAction?.(a),
        removeAction: (id: string) => WE.removeAction?.(id),
        updateAction: (id: string, patch: any) => WE.updateAction?.(id, patch),

        // 기타
        saveNodeAsComponent: (nodeId: string, name: string) => WE.saveNodeAsComponent?.(nodeId, name),
        setNotification: (msg: string) => WE.setNotification?.(msg),
        undo: () => WE.undo?.(),
        redo: () => WE.redo?.(),
    } as const;

    const reader = { ...readerCommon };
    const writer = { ...writerCommon };

    // RightDomain은 현재 단일
    return { reader, writer } as const;
}

export default useRightPanelController;