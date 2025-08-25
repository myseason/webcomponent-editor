'use client';
/**
 * Palette
 * - 레지스트리에 등록된 컴포넌트 정의 목록
 * - query로 id/title 매칭 필터링
 *
 * 규칙
 *  - any 금지
 *  - 훅 최상위
 *  - 얕은 복사 update()
 */

import React from 'react';
import { listDefinitions } from '../../core/registry';
import { useEditor } from '../useEditor';

function itemMatch(title: string, id: string, q: string): boolean {
    const qq = q.trim().toLowerCase();
    if (!qq) return true;
    return title.toLowerCase().includes(qq) || id.toLowerCase().includes(qq);
}

export function Palette({ query = '' }: { query?: string }) {
    const state = useEditor();
    const defs = listDefinitions().filter((d) => itemMatch(d.title, d.id, query));

    const onInsert = (defId: string) => {
        const parent = state.ui.selectedId ?? state.project.rootId;
        state.addByDef(defId, parent);
    };

    return (
        <div>
            {defs.length === 0 ? (
                <div className="text-[12px] text-gray-500">No components</div>
            ) : (
                <ul className="grid grid-cols-2 gap-2">
                    {defs.map((d) => (
                        <li key={d.id}>
                            <button
                                type="button"
                                className="w-full text-left px-2 py-2 border rounded hover:border-gray-300"
                                onClick={() => onInsert(d.id)}
                                title={d.id}
                            >
                                <div className="text-[12px] font-medium truncate">{d.title}</div>
                                <div className="text-[10px] text-gray-500 truncate">{d.id}</div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}