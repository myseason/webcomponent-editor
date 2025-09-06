'use client';

import { useMemo } from 'react';
import { EditorEngine } from '../../engine/EditorEngine';

/**
 * DataBindingPopover → applyBinding() 전환 지원
 * - 기존 구조(props.__bindings[propKey] = { expr }) 유지
 * - 내부 구현만 EditorEngine 파사드 기반으로 교체
 */
export interface BindingReader {
    /** 현재 expr 조회 */
    getBindingExpr(nodeId: string, propKey: string): string | undefined;
    /** 노드의 전체 바인딩 맵 조회 */
    getBindings(nodeId: string): Record<string, { expr: string }> | undefined;
}

export interface BindingWriter {
    /** expr 적용(없으면 삭제) */
    applyBinding(nodeId: string, propKey: string, expr: string | null): void;
    /** 여러 키 패치 */
    patchBindings(nodeId: string, patch: Record<string, string | null>): void;
    /** 모든 바인딩 제거(옵션) */
    clearBindings(nodeId: string): void;
}

export interface BindingController {
    reader(): BindingReader;
    writer(): BindingWriter;
}

function readBox(nodeId: string) {
    const node = EditorEngine.nodes.getNodeById(nodeId);
    return (node?.props as any)?.__bindings as Record<string, { expr: string }> | undefined;
}

function buildReader(): BindingReader {
    return {
        getBindingExpr(nodeId, propKey) {
            const box = readBox(nodeId);
            return box?.[propKey]?.expr;
        },
        getBindings(nodeId) {
            return readBox(nodeId);
        },
    };
}

function buildWriter(): BindingWriter {
    return {
        applyBinding(nodeId, propKey, expr) {
            EditorEngine.update((draft) => {
                const node = draft.project.nodes[nodeId];
                if (!node) return;
                const box = ((node.props as any).__bindings ??= {});
                if (expr && expr.trim().length > 0) {
                    box[propKey] = { expr };
                } else {
                    delete box[propKey];
                }
            }, true);
        },

        patchBindings(nodeId, patch) {
            EditorEngine.update((draft) => {
                const node = draft.project.nodes[nodeId];
                if (!node) return;
                const box = ((node.props as any).__bindings ??= {});
                for (const [k, v] of Object.entries(patch)) {
                    if (v && v.trim().length > 0) box[k] = { expr: v };
                    else delete box[k];
                }
            }, true);
        },

        clearBindings(nodeId) {
            EditorEngine.update((draft) => {
                const node = draft.project.nodes[nodeId];
                if (!node) return;
                if ((node.props as any).__bindings) {
                    delete (node.props as any).__bindings;
                }
            }, true);
        },
    };
}

export function useBindingController(): BindingController {
    const reader = useMemo(() => buildReader(), []);
    const writer = useMemo(() => buildWriter(), []);
    return useMemo(() => ({ reader: () => reader, writer: () => writer }), [reader, writer]);
}