'use client';

import * as React from 'react';
import { useEditor } from '../editor/useEditor';
import type { NodeId } from '../core/types';
import { CommandBus } from '../domain/command/CommandBus';
import type { Command } from '../domain/command/CommandTypes';
import { undoService } from '../domain/history/UndoService';

export function useLayersController() {
    const { project, ui, update, setNotification } = useEditor();
    const busRef = React.useRef<CommandBus>(null);
    if (!busRef.current)
        busRef.current = new CommandBus();

    // 읽기: 트리 데이터
    const roots = React.useMemo(() => {
        if (!project?.rootId) return [];
        return [project.rootId as NodeId];
    }, [project?.rootId]);

    const getNode = React.useCallback((id: NodeId) => project?.nodes?.[id], [project?.nodes]);

    const getChildren = React.useCallback((id: NodeId) => {
        const n = project?.nodes?.[id];
        return ((n?.children ?? []) as NodeId[]) || [];
    }, [project?.nodes]);

    const isSelected = React.useCallback((id: NodeId) => ui?.selectedId === id, [ui?.selectedId]);

    // 행동: 선택/순서 변경 등 (필요 최소치)
    const select = React.useCallback((id: NodeId) => {
        update((s) => { (s.ui as any).selectedId = id; });
        const cmd: Command = { name: 'ui.select', payload: { nodeId: id } } as any;
        busRef.current?.emit(cmd);
        undoService.onCommand(cmd);
    }, [update]);

    const reorder = React.useCallback((parentId: NodeId, fromIdx: number, toIdx: number) => {
        update((s) => {
            const p: any = s.project?.nodes?.[parentId];
            if (!p?.children) return;
            const arr = [...p.children];
            const [m] = arr.splice(fromIdx, 1);
            arr.splice(toIdx, 0, m);
            p.children = arr;
        });
        setNotification?.('레이어 순서가 변경되었습니다.');
    }, [update, setNotification]);

    const subscribe = React.useCallback((fn: (cmd: Command) => void) => {
        const off = busRef.current?.subscribe(fn);
        return () => { if (off) off(); };
    }, []);

    return { roots, getNode, getChildren, isSelected, select, reorder, subscribe };
}
