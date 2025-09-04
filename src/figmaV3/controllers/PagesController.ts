'use client';

import * as React from 'react';
import { useEditor } from '../editor/useEditor';
import { CommandBus } from '../domain/command/CommandBus';
import type { Command } from '../domain/command/CommandTypes';
import { undoService } from '../domain/history/UndoService';

export function usePagesController() {
    const { project, ui, update, setNotification, addPage: addPageV3, removePage: removePageV3, selectPage: selectPageV3 } = useEditor();
    const busRef = React.useRef<CommandBus>(null);
    if (!busRef.current)
        busRef.current = new CommandBus();

    // 읽기
    const pages = React.useMemo(() => project?.pages ?? [], [project?.pages]);
    const current = ui?.panels?.left?.lastActivePageId ?? pages[0]?.id ?? null;

    // 선택
    const selectPage = React.useCallback((pageId: string) => {
        const prev = ui?.panels?.left?.lastActivePageId ?? null;

        // v1.3 slice가 있으면 우선 사용
        if (typeof selectPageV3 === 'function') {
            selectPageV3(pageId);
        } else {
            // 없으면 ui 갱신
            update((s) => {
                (s.ui as any).panels.left.lastActivePageId = pageId;
                (s.ui as any).selectedId = (s.project as any)?.pages?.find((p: any) => p.id === pageId)?.rootId ?? s.ui.selectedId;
            });
        }

        const cmd: Command = { name: 'page.select', payload: { pageId, prev } } as any;
        busRef.current?.emit(cmd);
        undoService.onCommand(cmd);
    }, [ui?.panels?.left?.lastActivePageId, update, selectPageV3]);

    // 추가
    const addPage = React.useCallback((title: string) => {
        if (typeof addPageV3 === 'function') {
            const id = addPageV3(title);
            setNotification?.(`페이지 "${title}"가 추가되었습니다.`);
            if (id) selectPage(id);
            return;
        }

        // fallback
        const id = 'pg_' + Math.random().toString(36).slice(2, 8);
        update((s) => {
            (s.project as any).pages = [...(s.project?.pages ?? []), { id, name: title, rootId: (s.project as any).rootId }];
            (s.ui as any).panels.left.lastActivePageId = id;
        });
        setNotification?.(`페이지 "${title}"가 추가되었습니다.`);
        selectPage(id);
    }, [addPageV3, update, setNotification, selectPage]);

    // 이름 변경
    const renamePage = React.useCallback((pageId: string, title: string) => {
        update((s) => {
            const p = (s.project as any).pages?.find((x: any) => x.id === pageId);
            if (p) p.name = title;
        });
    }, [update]);

    // 삭제
    const removePage = React.useCallback((pageId: string) => {
        if (typeof removePageV3 === 'function') {
            removePageV3(pageId);
        } else {
            update((s) => {
                (s.project as any).pages = (s.project?.pages ?? []).filter((p: any) => p.id !== pageId);
            });
        }

        // 현재 선택이 삭제된 경우 첫 페이지로 보정
        update((s) => {
            const currentId = (s.ui as any).panels.left.lastActivePageId;
            if (currentId === pageId) {
                const nextId = (s.project as any)?.pages?.[0]?.id ?? null;
                (s.ui as any).panels.left.lastActivePageId = nextId;
                if (nextId) {
                    (s.ui as any).selectedId = (s.project as any)?.pages?.find((p: any) => p.id === nextId)?.rootId ?? s.ui.selectedId;
                }
            }
        });
    }, [removePageV3, update]);

    // 이벤트 구독 포트
    const subscribe = React.useCallback((fn: (cmd: Command) => void) => {
        const off = busRef.current?.subscribe(fn);
        return () => { if (off) off(); };
    }, []);

    return { pages, current, selectPage, addPage, renamePage, removePage, subscribe };
}