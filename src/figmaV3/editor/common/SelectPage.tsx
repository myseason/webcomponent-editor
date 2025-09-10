'use client';
/**
 * SelectPage
 * - 프로젝트의 pages 배열을 기반으로 페이지를 선택하는 공통 셀렉트 컴포넌트
 * - 상태는 내부에서 useEditor()로 구독
 * - 현재 value가 목록에 없을 경우, 첫 항목으로 자동 보정(마운트/목록 변경 시)
 */
import React from 'react';
import type { Page } from '../../core/types';

export function SelectPage({
                               value,
                               onChange,
                               pages, // ✅ pages 목록을 props로 받음
                               className,
                           }: {
    value: string | undefined;
    onChange: (id: string) => void;
    pages: Page[]; // ✅ props 타입 추가
    className?: string;
}) {
    // value가 삭제 등으로 목록에 없다면 첫 항목으로 보정
    React.useEffect(() => {
        if (!pages || pages.length === 0) return;
        const exists = pages.some((p) => p.id === value);
        if (!exists) {
            onChange(pages[0].id);
        }
    }, [pages, value, onChange]);

    if (!pages || pages.length === 0) {
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