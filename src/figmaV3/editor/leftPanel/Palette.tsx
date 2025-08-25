'use client';
/**
 * Palette: 등록된 컴포넌트 정의 목록을 보여주고, 클릭 시 선택된 부모 혹은 루트에 추가.
 */
import React from 'react';
import { listDefinitions } from '../../core/registry';
import { editorStore } from '../../store/editStore';

export function Palette() {
    const defs = listDefinitions();

    const onInsert = (defId: string) => {
        const state = editorStore.getState(); // 상태+액션
        const parent = state.ui.selectedId ?? state.project.rootId;
        state.addByDef(defId, parent);
    };

    return (
        <div className="p-3 space-y-2">
            <div className="text-xs font-semibold text-gray-500">Palette</div>
            {defs.map((d) => (
                <button
                    key={d.id}
                    className="w-full text-left px-2 py-1 rounded border border-gray-200 hover:bg-gray-50"
                    onClick={() => onInsert(d.id)}
                >
                    {d.title}
                </button>
            ))}
        </div>
    );
}