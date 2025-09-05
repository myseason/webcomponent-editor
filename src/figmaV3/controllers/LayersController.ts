'use client';
import * as React from 'react';
import { useEditorLike as useEditor } from './adapters/useEditorLike';
import type { NodeId } from '../core/types';

export interface LayersController {
    select(nodeId: NodeId): void;
    toggleVisibility(nodeId: NodeId): void;
    toggleLock(nodeId: NodeId): void;
    removeCascade(nodeId: NodeId): void;
}

export function useLayersController(): LayersController {
    const state = useEditor();

    const select = React.useCallback((nodeId: NodeId) => {
        state.update((s: any) => {
            s.ui.selectedId = nodeId;
        });
    }, [state]);

    const toggleVisibility = React.useCallback((nodeId: NodeId) => {
        state.update((s: any) => {
            const n = s.project?.nodes?.[nodeId];
            if (!n) return;
            n.isVisible = !(n.isVisible !== false);
        });
    }, [state]);

    const toggleLock = React.useCallback((nodeId: NodeId) => {
        state.update((s: any) => {
            const n = s.project?.nodes?.[nodeId];
            if (!n) return;
            n.locked = !n.locked;
        });
    }, [state]);

    const removeCascade = React.useCallback((nodeId: NodeId) => {
        state.update((s: any) => {
            const { nodes } = s.project ?? { nodes: {} };
            const visit = (id: string) => {
                const node = nodes?.[id];
                if (!node) return;
                const cs = (node.children ?? []) as string[];
                cs.forEach(visit);
                delete nodes[id];
            };
            visit(nodeId);

            // 선택 보정
            if (s.ui.selectedId === nodeId) {
                s.ui.selectedId = null;
            }
        });
        state.setNotification?.('Node removed.');
    }, [state]);

    return { select, toggleVisibility, toggleLock, removeCascade };
}