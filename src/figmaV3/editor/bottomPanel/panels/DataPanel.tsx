'use client';
/**
 * DataPanel
 * - 전역 data 스코프(JSON)를 편집/적용
 * - 바인딩 예: Text.content = "Hello {{data.user}}"
 */
import React, { useState } from 'react';
import { useEditor } from '../../useEditor';

export function DataPanel() {
    const state = useEditor(); // 상태+액션
    const [text, setText] = useState<string>(JSON.stringify(state.data, null, 2));

    const onApply = () => {
        try {
            const obj = JSON.parse(text) as Record<string, unknown>;
            state.update((s) => {
                s.data = obj; // 얕은 복사 update() 규약 준수(상위에서 shallow copy 처리)
            });
        } catch {
            alert('JSON 파싱 오류');
        }
    };

    return (
        <div className="p-3 space-y-2">
            <div className="text-xs font-semibold text-gray-500">Data</div>
            <textarea
                className="w-full h-32 border rounded p-2 text-xs font-mono"
                value={text}
                onChange={(e) => setText(e.target.value)}
            />
            <div className="flex">
                <button className="ml-auto text-xs px-2 py-1 rounded border" onClick={onApply}>
                    적용
                </button>
            </div>
        </div>
    );
}