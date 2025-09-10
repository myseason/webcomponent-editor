'use client';
/**
 * SelectFragment
 * - 프로젝트의 fragments 배열을 기반으로 프래그먼트를 선택
 * - 현재 value가 목록에 없을 경우, 첫 항목으로 자동 보정(마운트/목록 변경 시)
 */
import React from 'react';
import type { Fragment } from '../../core/types';

export function SelectFragment({
                                   value,
                                   onChange,
                                   fragments, // ✅ fragments 목록을 props로 받음
                                   className,
                                   allowEmpty = false,
                               }: {
    value: string | undefined;
    onChange: (id: string) => void;
    fragments: Fragment[]; // ✅ props 타입 추가
    className?: string;
    allowEmpty?: boolean;
}) {
    React.useEffect(() => {
        if (allowEmpty && (value ?? '') === '') return;
        const exists = fragments.some((f) => f.id === value);
        if (!exists) {
            if (fragments.length > 0) {
                onChange(fragments[0].id);
            } else if (allowEmpty) {
                onChange('');
            }
        }
    }, [fragments, value, onChange, allowEmpty]);

    if (fragments.length === 0 && !allowEmpty) {
        return (
            <select className={className ?? 'border rounded px-2 py-1 text-xs'} disabled>
                <option>no fragments</option>
            </select>
        );
    }

    return (
        <select
            className={className ?? 'border rounded px-2 py-1 text-xs'}
            value={value ?? (allowEmpty ? '' : fragments[0]?.id ?? '')}
            onChange={(e) => onChange(e.target.value)}
        >
            {allowEmpty && <option value="">(none)</option>}
            {fragments.map((f) => (
                <option key={f.id} value={f.id}>
                    {f.name || f.id}
                </option>
            ))}
        </select>
    );
}