'use client';

import * as React from 'react';
import { useLayersController } from '../LayersController';
import { useEngine } from '../../engine/EditorEngine';
import type { NodeId } from '../../core/types';

export interface LayersAdapterResult {
    // 기존 코드 호환(읽기 참조용)
    project: any;
    ui: any;

    // 기존 Layers.tsx 에서 기대하는 표면(일반화)
    getRootId: () => NodeId | null;
    getNode: (id: NodeId) => any | null;
    getChildren: (id: NodeId) => NodeId[];
    isSelected: (id: NodeId) => boolean;

    select: (id: NodeId) => void;
    toggleVisibility: (id: NodeId) => void;
    toggleLock: (id: NodeId) => void;
    removeCascade: (id: NodeId) => void;
    setProps: (id: NodeId, patch: Record<string, unknown>) => void;
}

/**
 * 기존 Layers.tsx 가 사용하던 useEditor() 표면을 컨트롤러 기반으로 브리지.
 * 컴포넌트는 import 만 교체하면 동작/레이아웃 불변.
 */
export function useLayersAdapter(): LayersAdapterResult {
    const engine = useEngine();
    const ctrl = useLayersController();
    const R = ctrl.reader();
    const W = ctrl.writer();

    const getRootId = React.useCallback(() => R.getRootId(), [R]);
    const getNode = React.useCallback((id: NodeId) => R.getNode(id), [R]);
    const getChildren = React.useCallback((id: NodeId) => R.getChildren(id), [R]);
    const isSelected = React.useCallback((id: NodeId) => R.isSelected(id), [R]);

    const select = React.useCallback((id: NodeId) => W.select(id), [W]);
    const toggleVisibility = React.useCallback((id: NodeId) => W.toggleVisibility(id), [W]);
    const toggleLock = React.useCallback((id: NodeId) => W.toggleLock(id), [W]);
    const removeCascade = React.useCallback((id: NodeId) => W.removeCascade(id), [W]);

    // 일부 UI가 node.props 패치에 직접 의존하는 경우가 있어 표면 유지
    const setProps = React.useCallback(
        (id: NodeId, patch: Record<string, unknown>) => {
            if (typeof W.setProps === 'function') {
                W.setProps(id, patch);
            } else {
                // 안전 폴백
                engine.update((s: any) => {
                    const n = s.project?.nodes?.[id];
                    if (!n) return;
                    n.props = { ...(n.props ?? {}), ...(patch as any) };
                }, true);
            }
        },
        [W, engine]
    );

    return {
        project: engine.project,
        ui: engine.ui,

        getRootId,
        getNode,
        getChildren,
        isSelected,

        select,
        toggleVisibility,
        toggleLock,
        removeCascade,
        setProps,
    };
}