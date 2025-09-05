'use client';

/**
 * PagesFacadeController (Composite)
 * - PageFacadeController + UiController를 결합한 단일 파사드.
 * - View는 이 컨트롤러 하나만 사용하여 Page/UI 관련 읽기·쓰기를 수행합니다.
 *
 * Reader API
 *  - pages(): ReadonlyArray<Page>
 *  - selectedPageId(): string | null
 *  - editingFragmentId(): string | null
 *  - editorMode(): string | undefined
 *  - uiHubTab(): string | undefined
 *  - facadeToken(): string   // page/ui 변경을 모두 추적할 합성 토큰
 *
 * Writer API
 *  - setSelectedPageId(id: string): void
 *  - setSelectedNodeId(id: string | null): void
 *  - addPage(title?: string): string
 *  - removePage(id: string): void
 *  - duplicatePage(id: string): string | null
 *  - renamePage(id: string, title: string): void
 *  - updatePageMeta(id: string, patch: Partial<Page>): void
 *  - setEditorMode(mode: string): void
 *  - setNotification(msg: string): void
 *  - setUiHubTab(tab: string): void
 */

import { useMemo } from 'react';
import type { Page } from '../../core/types';
import { usePagesController } from './PagesController';
import { useUiController } from '../ui/UiController';

export interface PagesFacadeReader {
    pages(): ReadonlyArray<Page>;
    selectedPageId(): string | null;
    editingFragmentId(): string | null;
    editorMode(): string | undefined;
    hubTab(): string | undefined;
    facadeToken(): string;
}

export interface PagesFacadeWriter {
    setSelectedPageId(id: string): void;
    setSelectedNodeId(id: string | null): void;

    addPage(title?: string): string;
    removePage(id: string): void;
    duplicatePage(id: string): string | null;
    renamePage(id: string, title: string): void;
    updatePageMeta(id: string, patch: Partial<Page>): void;

    setEditorMode(mode: string): void;
    setNotification(msg: string): void;
    setHubTab(tab: string): void;
}

export interface PagesFacadeController {
    reader(): PagesFacadeReader;
    writer(): PagesFacadeWriter;
}

function buildReader(
    pageReaderFn: ReturnType<typeof usePagesController>['reader'],
    uiReaderFn: ReturnType<typeof useUiController>['reader'],
): PagesFacadeReader {
    const PR = pageReaderFn();
    const UR = uiReaderFn();

    return {
        pages() {
            return PR.list() as ReadonlyArray<Page>;
        },
        selectedPageId() {
            return PR.currentPageId();
        },
        editingFragmentId() {
            return UR.editingFragmentId() ?? null;
        },
        editorMode() {
            return UR.mode();
        },
        hubTab() {
            return UR.hubTab();
        },
        facadeToken() {
            // page 변경(PR.token) + ui 변경(UR.token)을 모두 포함한 합성 토큰
            return `${PR.token()}||${UR.token()}`;
        },
    };
}

function buildWriter(
    pageWriterFn: ReturnType<typeof usePagesController>['writer'],
    uiWriterFn: ReturnType<typeof useUiController>['writer'],
): PagesFacadeWriter {
    const PW = pageWriterFn();
    const UW = uiWriterFn();

    return {
        setSelectedPageId(id: string) {
            PW.setSelected(id);
        },
        setSelectedNodeId(id: string | null) {
            UW.setSelected(id);
        },

        addPage(title?: string) {
            return PW.add(title);
        },
        removePage(id: string) {
            PW.remove(id);
        },
        duplicatePage(id: string) {
            return PW.duplicate(id);
        },
        renamePage(id: string, title: string) {
            PW.rename(id, title);
        },
        updatePageMeta(id: string, patch: Partial<Page>) {
            PW.updateMeta(id, patch);
        },

        setEditorMode(mode: string) {
            UW.setMode(mode);
        },
        setNotification(msg: string) {
            UW.setNotification(msg);
        },
        setHubTab(tab: string) {
            UW.setHubTab(tab);
        },
    };
}

export function usePagesFacadeController(): PagesFacadeController {
    // 내부적으로 기존 컨트롤러 두 개를 재사용
    const P = usePagesController();
    const U = useUiController();

    const reader = useMemo(() => buildReader(P.reader, U.reader), [P, U]);
    const writer = useMemo(() => buildWriter(P.writer, U.writer), [P, U]);

    // 일관된 인터페이스 보장
    return useMemo(
        () => ({
            reader: () => reader,
            writer: () => writer,
        }),
        [reader, writer]
    );
}