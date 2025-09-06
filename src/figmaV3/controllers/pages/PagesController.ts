'use client';

/**
 * PageFacadeController
 * - 페이지 도메인에 대한 읽기/쓰기 파사드
 * - 내부 구현만 EditorEngine 파사드로 교체 (기존 API/시그니처 보존)
 */
import { useMemo } from 'react';
import type { Page } from '../../core/types';
import { EditorEngine } from '../../engine/EditorEngine';

export interface PageReader {
    list(): ReadonlyArray<Page>;
    currentPageId(): string | null;
    token(): string;
}

export interface PageWriter {
    setSelected(pageId: string): void; // (구 selectPage)
    add(title?: string): string;
    remove(pageId: string): void;
    duplicate(pageId: string): string | null;
    rename(pageId: string, title: string): void; // 구현됨
    updateMeta(pageId: string, patch: Partial<Page>): void; // 구현됨
}

export interface PageFacadeController {
    reader(): PageReader;
    writer(): PageWriter;
}

function buildReader(): PageReader {
    return {
        list(): ReadonlyArray<Page> {
            return EditorEngine.pages.getPages();
        },
        currentPageId(): string | null {
            return EditorEngine.pages.getSelectedPageId();
        },
        token(): string {
            // 기존 token 의미 유지: "선택ID :: 총 페이지수"
            const selected = EditorEngine.pages.getSelectedPageId() ?? '';
            const len = EditorEngine.pages.getPages().length;
            return `${selected}::${len}`;
        },
    };
}

function buildWriter(): PageWriter {
    return {
        setSelected(pageId: string): void {
            EditorEngine.pages.setSelectedPageId(pageId);
        },
        add(title?: string): string {
            return EditorEngine.pages.addPage(title);
        },
        remove(pageId: string): void {
            EditorEngine.pages.removePage(pageId);
        },
        duplicate(pageId: string): string | null {
            // 결과 페이지 ID를 반환해야 하므로, 호출 전후 길이 비교로 추가분 추정
            const before = EditorEngine.pages.getPages();
            EditorEngine.pages.duplicatePage(pageId);
            const after = EditorEngine.pages.getPages();
            if (after.length <= before.length) return null;
            const added = after[after.length - 1];
            return added?.id ?? null;
        },
        rename(pageId: string, title: string): void {
            EditorEngine.pages.renamePage(pageId, title);
        },
        updateMeta(pageId: string, patch: Partial<Page>): void {
            EditorEngine.pages.updatePageMeta(pageId, patch);
        },
    };
}

export function usePagesController(): PageFacadeController {
    const reader = useMemo(() => buildReader(), []);
    const writer = useMemo(() => buildWriter(), []);
    return useMemo(() => ({ reader: () => reader, writer: () => writer }), [reader, writer]);
}