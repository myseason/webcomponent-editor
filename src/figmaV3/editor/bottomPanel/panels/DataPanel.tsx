'use client';
/**
 * DataPanel
 * - 전역 data 스코프(JSON)를 편집/적용
 * - 바인딩 예: Text.content = "Hello {{data.user}}"
 */
import React, { useEffect, useMemo, useState } from 'react';
import type { EditorState } from '@/figmaV3/core/types';
import {BottomDomain, useBottomControllerFactory} from '@/figmaV3/controllers/bottom/BottomControllerFactory';

export function DataPanel() {
    const { reader, writer } = useBottomControllerFactory(BottomDomain.Data);

    // 호환 접근(getData 우선, 구형 시그니처 폴백)
    const dataObj = useMemo<Record<string, unknown>>(() => reader.getData() ?? {} as Record<string, unknown>,[reader.getData()]);
    const [text, setText] = useState<string>(JSON.stringify(dataObj, null, 2));

    // 외부에서 data가 갱신되면 textarea도 동기화
    useEffect(() => {
        setText(JSON.stringify(dataObj, null, 2));
    }, [dataObj]);

    const onApply = () => {
        try {
            const obj = JSON.parse(text) as Record<string, unknown>;
            /*
            (writer as any).update?.((s: EditorState) => {
                s.data = obj; // 얕은 복사 update 규약에 맞춰 저장
            });
            */
            writer.setData(obj);
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