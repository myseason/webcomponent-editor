'use client';

/**
 * PageFacadeController
 * - 페이지 도메인에 대한 읽기/쓰기 파사드
 * - EditorEngine 파사드에만 의존 (zustand 직접 접근 금지)
 * - rename/updateMeta까지 포함 (Engine.update 캡슐화)
 */

import { useMemo } from 'react';
import type { Page, Project } from '../../core/types';
import { useEngine } from '../adapters/useEngine';
import type { EditorEngine } from '../../engine/EditorEngine';

export interface PageReader {
    list(): ReadonlyArray<Page>;
    currentPageId(): string | null;
    token(): string;
}

export interface PageWriter {
    setSelected(pageId: string): void;               // (구 selectPage)
    add(title?: string): string;
    remove(pageId: string): void;
    duplicate(pageId: string): string | null;
    rename(pageId: string, title: string): void;     // 구현됨
    updateMeta(pageId: string, patch: Partial<Page>): void; // 구현됨
}

export interface PageFacadeController {
    reader(): PageReader;
    writer(): PageWriter;
}

function computeCurrentPageId(project: Project): string | null {
    if (!project?.pages?.length) return null;
    const matched = project.pages.find((p) => p.rootId === project.rootId);
    return matched?.id ?? null;
}

function buildReader(engine: EditorEngine): PageReader {
    return {
        list(): ReadonlyArray<Page> {
            const p = engine.getProject();
            return (p?.pages ?? []) as ReadonlyArray<Page>;
        },
        currentPageId(): string | null {
            const p = engine.getProject();
            return computeCurrentPageId(p);
        },
        token(): string {
            const p = engine.getProject();
            const rootId = String(p?.rootId ?? '');
            const len = Array.isArray(p?.pages) ? p.pages.length : 0;
            return `${rootId}::${len}`;
        },
    };
}

function buildWriter(engine: EditorEngine): PageWriter {
    return {
        setSelected(pageId: string): void {
            engine.selectPage(pageId);
        },
        add(title?: string): string {
            return engine.addPage(title);
        },
        remove(pageId: string): void {
            engine.removePage(pageId);
        },
        duplicate(pageId: string): string | null {
            const beforeList = (engine.getProject().pages ?? []) as Page[];
            const beforeLen = beforeList.length;

            engine.duplicatePage(pageId);

            const afterList = (engine.getProject().pages ?? []) as Page[];
            if (afterList.length <= beforeLen) return null;
            const added = afterList[afterList.length - 1];
            return added?.id ?? null;
        },
        rename(pageId: string, title: string): void {
            engine.renamePage(pageId, title);
        },
        updateMeta(pageId: string, patch: Partial<Page>): void {
            engine.updatePageMeta(pageId, patch as any);
        },
    };
}

export function usePagesController(): PageFacadeController {
    const engine = useEngine();
    const reader = useMemo(() => buildReader(engine), [engine]);
    const writer = useMemo(() => buildWriter(engine), [engine]);
    return useMemo(() => ({ reader: () => reader, writer: () => writer }), [reader, writer]);
}