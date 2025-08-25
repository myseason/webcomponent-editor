'use client';
/**
 * SelectFragment
 * - 프로젝트의 fragments 배열을 기반으로 프래그먼트를 선택
 * - 현재 value가 목록에 없을 경우, 첫 항목으로 자동 보정(마운트/목록 변경 시)
 */
import React from 'react';
import { useEditor } from '../useEditor';

export function SelectFragment({
                                   value,
                                   onChange,
                                   className,
                                   allowEmpty = false,
                               }: {
    value: string | undefined;
    onChange: (id: string) => void;
    className?: string;
    /** true이면 "(none)" 옵션을 추가하여 빈 선택 허용 (CloseFragment 등에서 사용 가능) */
    allowEmpty?: boolean;
}) {
    const state = useEditor();
    const frags = state.project.fragments;

    React.useEffect(() => {
        if (allowEmpty && (value ?? '') === '') return; // 빈 값 허용 모드면 건너뜀
        const exists = frags.some((f) => f.id === value);
        if (!exists) {
            if (frags.length > 0) onChange(frags[0].id);
            else if (allowEmpty) onChange('');
        }
    }, [frags, value, onChange, allowEmpty]);

    if (frags.length === 0 && !allowEmpty) {
        return (
            <select className={className ?? 'border rounded px-2 py-1 text-xs'} disabled>
                <option>no fragments</option>
            </select>
        );
    }

    return (
        <select
            className={className ?? 'border rounded px-2 py-1 text-xs'}
            value={value ?? (allowEmpty ? '' : frags[0]?.id ?? '')}
            onChange={(e) => onChange(e.target.value)}
        >
            {allowEmpty && <option value="">(none)</option>}
            {frags.map((f) => (
                <option key={f.id} value={f.id}>
                    {f.name || f.id}
                </option>
            ))}
        </select>
    );
}