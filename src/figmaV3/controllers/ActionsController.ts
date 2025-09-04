'use client';

import * as React from 'react';
import { useEditor } from '../editor/useEditor';
import { CommandBus } from '../domain/command/CommandBus';
import type { Command } from '../domain/command/CommandTypes';
import { undoService } from '../domain/history/UndoService';

/**
 * 액션 플로우(간단형): 노드나 페이지에 연결된 액션 리스트를 CRUD
 * - 실제 액션 실행/런타임은 기존 runtime/flow.ts 경로를 그대로 유지
 * - 여기서는 편집용 데이터에 한함
 */
export function useActionsController() {
    const { project, update, setNotification } = useEditor();
    const busRef = React.useRef<CommandBus>(null);
    if (!busRef.current)
        busRef.current = new CommandBus();

    const list = React.useCallback((ownerId: string) => {
        return (project as any)?.actions?.[ownerId] ?? [];
    }, [project]);

    const add = React.useCallback((ownerId: string, action: any) => {
        update((s) => {
            const map = ((s.project as any).actions ??= {});
            const arr = (map[ownerId] ??= []);
            map[ownerId] = [...arr, { id: 'act_' + Math.random().toString(36).slice(2, 8), ...action }];
        });
        const cmd: Command = { name: 'action.add', payload: { ownerId, action } } as any;
        busRef.current?.emit(cmd);
        undoService.onCommand(cmd);
        setNotification?.('액션이 추가되었습니다.');
    }, [update, setNotification]);

    const updateAction = React.useCallback((ownerId: string, actionId: string, patch: any) => {
        update((s) => {
            const arr = ((s.project as any).actions ?? {})[ownerId] ?? [];
            const idx = arr.findIndex((x: any) => x.id === actionId);
            if (idx >= 0) arr[idx] = { ...arr[idx], ...patch };
        });
        const cmd: Command = { name: 'action.patch', payload: { ownerId, actionId, patch } } as any;
        busRef.current?.emit(cmd);
        undoService.onCommand(cmd);
    }, [update]);

    const remove = React.useCallback((ownerId: string, actionId: string) => {
        update((s) => {
            const arr = ((s.project as any).actions ?? {})[ownerId] ?? [];
            ((s.project as any).actions ?? {})[ownerId] = arr.filter((x: any) => x.id !== actionId);
        });
        const cmd: Command = { name: 'action.remove', payload: { ownerId, actionId } } as any;
        busRef.current?.emit(cmd);
        undoService.onCommand(cmd);
    }, [update]);

    const subscribe = React.useCallback((fn: (cmd: Command) => void) => {
        const off = busRef.current?.subscribe(fn);
        return () => { if (off) off(); };
    }, []);

    return { list, add, update: updateAction, remove, subscribe };
}