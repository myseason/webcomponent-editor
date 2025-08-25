'use client';
/**
 * SelectPage
 * - 프로젝트의 pages 배열을 기반으로 페이지를 선택하는 공통 셀렉트 컴포넌트
 * - 상태는 내부에서 useEditor()로 구독
 * - 현재 value가 목록에 없을 경우, 첫 항목으로 자동 보정(마운트/목록 변경 시)
 */
import React from 'react';
import { useEditor } from '../useEditor';

export function SelectPage({
                               value,
                               onChange,
                               className,
                           }: {
    value: string | undefined;
    onChange: (id: string) => void;
    className?: string;
}) {
    const state = useEditor();
    const pages = state.project.pages;

    // value가 삭제 등으로 목록에 없다면 첫 항목으로 보정
    React.useEffect(() => {
        const exists = pages.some((p) => p.id === value);
        if (!exists && pages.length > 0) {
            onChange(pages[0].id);
        }
        // pages/value 변할 때마다 체크
    }, [pages, value, onChange]);

    if (pages.length === 0) {
        return (
            <select className={className ?? 'border rounded px-2 py-1 text-xs'} disabled>
                <option>no pages</option>
            </select>
        );
    }

    return (
        <select
            className={className ?? 'border rounded px-2 py-1 text-xs'}
            value={value ?? pages[0].id}
            onChange={(e) => onChange(e.target.value)}
        >
            {pages.map((p) => (
                <option key={p.id} value={p.id}>
                    {p.name || p.id}
                </option>
            ))}
        </select>
    );
}