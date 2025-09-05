'use client';

import * as React from 'react';
import type { NodeId } from '../core/types';
import { useEngine } from '../engine/EditorEngine';
import { bindingService } from '../domain/binding/BindingService';

export interface BindingReader {
    // 확장 포인트(미리보기 등) — 필요 시 추가
    preview(nodeId: NodeId, propKey: string, expr: string): { ok: boolean; value?: unknown; reason?: string };
}
export interface BindingWriter {
    apply(nodeId: NodeId, propKey: string, expr: string): void;
}
export interface BindingController {
    reader(): BindingReader;
    writer(): BindingWriter;
}

export function useBindingController(): BindingController {
    const eng = useEngine();

    const reader = React.useMemo<BindingReader>(() => ({
        preview(_nodeId, _propKey, expr) {
            const r = bindingService.preview(eng as any, expr);
            return r.ok ? { ok: true, value: r.value } : { ok: false, reason: r.reason };
        },
    }), [eng]);

    const writer = React.useMemo<BindingWriter>(() => ({
        apply(nodeId, propKey, expr) {
            // 현재 v1.4 BindingService에는 'apply' 동작이 없으므로,
            // 엔진 상태에 raw expr을 저장하는 보편 방식으로 처리.
            eng.update((s: any) => {
                const n = s.project?.nodes?.[nodeId]; if (!n) return;
                n.props = { ...(n.props ?? {}), [propKey]: expr };
            });
            eng.notify('바인딩이 적용되었습니다.');
        },
    }), [eng]);

    return React.useMemo(() => ({ reader: () => reader, writer: () => writer }), [reader, writer]);
}