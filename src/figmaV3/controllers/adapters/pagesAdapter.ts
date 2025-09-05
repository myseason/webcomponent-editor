'use client';

import * as React from 'react';
import { usePagesController } from '../PagesController';
import { useEngine } from '../../engine/EditorEngine';
import type { Page } from '../../core/types';

export interface PagesAdapterResult {
    // 기존 코드 호환(읽기 전용 참조)
    project: any;
    ui: any;

    // 목록/선택
    pages: Page[];                  // ✅ Page[] 로 통일
    currentPageId: string | null;

    // 동작 (기존 API 호환)
    addPage: (title: string) => string;
    selectPage: (id: string) => void;
    duplicatePage: (id: string) => string | null; // 새 페이지 id 반환
    removePage: (id: string) => void;
    updatePageMeta: (id: string, patch: { name?: string } & Record<string, unknown>) => void;
}

/**
 * 기존 PagesPanel 이 기대하는 useEditor() 표면을 그대로 제공합니다.
 * 컴포넌트 측은 import 한 줄만 교체하면 됩니다.
 */
export function usePagesAdapter(): PagesAdapterResult {
    const engine = useEngine();
    const ctrl = usePagesController();
    const R = ctrl.reader();
    const W = ctrl.writer();

    // 컨트롤러의 list() => { id, title }[]  -> Page 로 적절히 매핑
    const pages: Page[] = React.useMemo(() => {
        return R.list().map(p => {
            // Page 최소 필드 가정: { id: string; name: string; rootId?: string; ... }
            const page: Page = {
                id: p.id,
                // title -> name 으로 매핑
                name: p.title ?? '',
                // 필요 시 rootId 등 추가 맵핑이 가능 (엔진/프로젝트 모델 확인 후 보강)
            } as Page;
            return page;
        });
    }, [R]);

    const currentPageId: string | null = React.useMemo(() => R.current(), [R]);

    const addPage = React.useCallback((title: string): string => {
        return W.addPage(title);
    }, [W]);

    const selectPage = React.useCallback((id: string): void => {
        W.selectPage(id);
    }, [W]);

    const removePage = React.useCallback((id: string): void => {
        W.removePage(id);
    }, [W]);

    // 새 페이지 id 반환 -> 호출측에서 if (id) selectPage(id) 가능
    const duplicatePage = React.useCallback((id: string): string | null => {
        const list = R.list();
        const src = list.find(p => p.id === id);
        if (!src) return null;

        const name = src.title ? `Copy of ${src.title}` : 'Copy';
        const newId = W.addPage(name);

        engine.notify('페이지가 복제되었습니다.');
        return newId;
    }, [R, W, engine]);

    const updatePageMeta = React.useCallback((id: string, patch: { name?: string } & Record<string, unknown>) => {
        if (typeof patch?.name === 'string') {
            W.renamePage(id, patch.name);
        }
        // 다른 meta 필드가 실제 사용된다면 engine.update 로 보강 가능
    }, [W]);

    return {
        project: engine.project,
        ui: engine.ui,
        pages,
        currentPageId,
        addPage,
        selectPage,
        duplicatePage,
        removePage,
        updatePageMeta,
    };
}