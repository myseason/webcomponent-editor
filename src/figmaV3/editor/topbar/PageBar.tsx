'use client';
/**
 * PageBar: 페이지 생성/선택/이름·슬러그 수정/삭제를 제공하는 상단 바.
 * - 상태 접근: useEditor() (상태+액션 일원화)
 * - 삭제 시 현재 페이지라면, 우선 다른 페이지로 전환 후 삭제
 * - 규칙: 훅은 최상위에서만 호출, any 금지, 얕은 복사 update() 사용
 */
import React, { useMemo, useState } from 'react';
import { useEditor } from '../useEditor';
import type { Page } from '../../core/types';

export default function PageBar() {
    const state = useEditor();

    // 현재 표시 중인 rootId로 페이지 역탐색
    const currentPage = useMemo<Page | undefined>(() => {
        return state.project.pages.find((p) => p.rootId === state.project.rootId);
    }, [state.project.pages, state.project.rootId]);

    const pageId = currentPage?.id ?? state.project.pages[0]?.id ?? '';
    const [nameDraft, setNameDraft] = useState<string>(currentPage?.name ?? '');
    const [slugDraft, setSlugDraft] = useState<string>(currentPage?.slug ?? '');

    // currentPage 변경 시 draft 동기화
    React.useEffect(() => {
        setNameDraft(currentPage?.name ?? '');
        setSlugDraft(currentPage?.slug ?? '');
    }, [currentPage?.id, currentPage?.name, currentPage?.slug]);

    const onSelectPage = (id: string) => {
        state.selectPage(id);
    };

    const onCreatePage = () => {
        const idx = state.project.pages.length + 1;
        const newId = state.addPage(`Page ${idx}`);
        state.selectPage(newId);
    };

    const onApplyMeta = () => {
        if (!currentPage) return;
        // 이름/슬러그 수정은 store.update()로 패치
        state.update((s) => {
            s.project.pages = s.project.pages.map((p) =>
                p.id === currentPage.id ? { ...p, name: nameDraft, slug: slugDraft || undefined } : p,
            );
        });
    };

    const onRemovePage = () => {
        if (!currentPage) return;
        // 현재 페이지 삭제 금지 정책이 있으므로(스토어에서 가드),
        // 삭제 전 다른 페이지로 이동 후 삭제 수행.
        const other = state.project.pages.find((p) => p.id !== currentPage.id);
        if (!other) {
            alert('마지막 페이지는 삭제할 수 없습니다.');
            return;
        }
        // 다른 페이지로 전환 후 삭제
        state.selectPage(other.id);
        state.removePage(currentPage.id);
    };

    return (
        <div className="w-full border-b bg-white px-3 py-2 flex items-center gap-3">
            {/* 페이지 선택 */}
            <label className="text-xs flex items-center gap-2">
                <span className="text-gray-500">Page</span>
                <select
                    className="border rounded px-2 py-1 text-xs"
                    value={pageId}
                    onChange={(e) => onSelectPage(e.target.value)}
                >
                    {state.project.pages.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name || p.id}
                        </option>
                    ))}
                </select>
            </label>

            {/* 이름/슬러그 편집 */}
            <label className="text-xs flex items-center gap-2">
                <span className="text-gray-500">Name</span>
                <input
                    className="border rounded px-2 py-1 text-xs w-40"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    placeholder="Page name"
                />
            </label>
            <label className="text-xs flex items-center gap-2">
                <span className="text-gray-500">Slug</span>
                <input
                    className="border rounded px-2 py-1 text-xs w-40"
                    value={slugDraft}
                    onChange={(e) => setSlugDraft(e.target.value)}
                    placeholder="/, /about, /contacts"
                />
            </label>
            <button
                className="text-xs border rounded px-2 py-1"
                onClick={onApplyMeta}
                title="이름/슬러그 적용"
            >
                Apply
            </button>

            <div className="ml-auto flex items-center gap-2">
                <button className="text-xs border rounded px-2 py-1" onClick={onCreatePage}>
                    + New Page
                </button>
                <button
                    className="text-xs border rounded px-2 py-1 text-red-600"
                    onClick={onRemovePage}
                    title="현재 페이지 삭제"
                >
                    Delete
                </button>
            </div>
        </div>
    );
}