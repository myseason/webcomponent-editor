'use client';

import * as React from 'react';
import { useEngine } from '../engine/EditorEngine';
import type { NodeId } from '../core/types';

// 필요한 최소 타입 (core/types에 있으면 해당 타입 import로 대체하세요)
export type UIMode = 'view' | 'edit' | 'design' | string;
export interface Fragment { id: string; name?: string; [k: string]: unknown }

export interface LayersReader {
    // Layers 도메인 본연의 조회
    getRootId(): string | null;
    getNode(id: NodeId): any | null;
    getChildren(id: NodeId): ReadonlyArray<NodeId>;
    getSelectedId(): NodeId | null;
    isSelected(id: NodeId): boolean;
    /** 레이어 노드맵 변경을 감지하기 위한 의존성 토큰 (내부 구조 노출 X) */
    nodesToken(): unknown;

    // 👇 파사드: Layers 컴포넌트가 추가 컨트롤러를 몰라도 되도록 제공
    // UI(읽기)
    getMode(): UIMode;
    isExpertMode(): boolean;

    // Fragments(읽기)
    getEditingFragmentId(): string | null;
    getEditingFragment(): Fragment | null;
}

export interface LayersWriter {
    /** 선택 상태 설정 (기존 select 대체) */
    setSelected(id: NodeId): void;

    toggleVisibility(id: NodeId): void;
    toggleLock(id: NodeId): void;
    removeCascade(id: NodeId): void;
    setProps(id: NodeId, patch: Record<string, unknown>): void;

    // 👇 파사드: UI/Fragments 쓰기
    setMode(mode: UIMode): void;
    setEditingFragment(id: string | null): void;
    notify(msg: string): void;
}

export interface LayersController {
    reader(): LayersReader;
    writer(): LayersWriter;
}

export function useLayersController(): LayersController {
    const eng = useEngine();

    // ---------- Reader ----------
    const reader = React.useMemo<LayersReader>(() => ({
        // Layers 본연
        getRootId(): string | null {
            const rootId = (eng.project as any)?.rootId ?? null;
            return typeof rootId === 'string' ? rootId : null;
        },
        getNode(id: NodeId) {
            const n = (eng.project as any)?.nodes?.[id];
            return n ?? null;
        },
        getChildren(id: NodeId): ReadonlyArray<NodeId> {
            const n = (eng.project as any)?.nodes?.[id];
            const arr = (n?.children ?? []) as NodeId[];
            return Array.isArray(arr) ? arr : [];
        },
        getSelectedId(): NodeId | null {
            const sid = (eng.ui as any)?.selectedId ?? null;
            return (typeof sid === 'string' && sid.length > 0) ? sid : null;
        },
        isSelected(id: NodeId): boolean {
            return this.getSelectedId() === id;
        },
        nodesToken(): unknown {
            return (eng.project as any)?.nodes;
        },

        // 👇 UI 파사드(읽기)
        getMode(): UIMode {
            const m = (eng.ui as any)?.mode;
            return (typeof m === 'string' && m.length > 0) ? m : 'view';
        },
        isExpertMode(): boolean {
            return !!(eng.ui as any)?.expertMode;
        },

        // 👇 Fragments 파사드(읽기)
        getEditingFragmentId(): string | null {
            const fid = (eng.ui as any)?.editingFragmentId;
            return (typeof fid === 'string' && fid.length > 0) ? fid : null;
        },
        getEditingFragment(): Fragment | null {
            const fid = (eng.ui as any)?.editingFragmentId;
            const list: Fragment[] = (eng.project as any)?.fragments ?? [];
            if (!fid) return null;
            return (list.find((f) => f.id === fid) ?? null);
        },
    }), [eng.project, eng.ui]);

    // 내부 유틸: 선택 해제/삭제시 루트로 폴백
    const getRootFallback = React.useCallback((s: any): NodeId | null => {
        const rid = s.project?.rootId;
        return (typeof rid === 'string' && rid.length > 0) ? rid : null;
    }, []);

    // ---------- Writer ----------
    const writer = React.useMemo<LayersWriter>(() => {
        const api: LayersWriter = {
            setSelected(id: NodeId) {
                const node = (eng.project as any)?.nodes?.[id];
                if (!node) return; // 존재하지 않는 노드 무시
                eng.update((s: any) => {
                    (s.ui ??= {});
                    s.ui.selectedId = id;
                }, true);
            },

            toggleVisibility(id: NodeId) {
                eng.update((s: any) => {
                    const n = s.project?.nodes?.[id];
                    if (!n) return;
                    n.hidden = !n.hidden;
                }, true);
            },

            toggleLock(id: NodeId) {
                eng.update((s: any) => {
                    const n = s.project?.nodes?.[id];
                    if (!n) return;
                    n.locked = !n.locked;
                }, true);
            },

            removeCascade(id: NodeId) {
                eng.update((s: any) => {
                    const nodes = s.project?.nodes ?? {};
                    if (!nodes[id]) return;

                    const removeRec = (nid: NodeId) => {
                        const ch: NodeId[] = nodes[nid]?.children ?? [];
                        ch.forEach(removeRec);
                        delete nodes[nid];
                    };
                    // 부모에서 끊기
                    for (const key of Object.keys(nodes)) {
                        const n = nodes[key];
                        if (Array.isArray(n?.children)) {
                            n.children = n.children.filter((c: NodeId) => c !== id);
                        }
                    }
                    removeRec(id);

                    // 선택 상태 정리
                    if ((s.ui?.selectedId ?? null) === id) {
                        (s.ui ??= {});
                        s.ui.selectedId = getRootFallback(s);
                    }
                }, true);
            },

            setProps(id: NodeId, patch: Record<string, unknown>) {
                eng.update((s: any) => {
                    const n = s.project?.nodes?.[id];
                    if (!n) return;
                    n.props = { ...(n.props ?? {}), ...(patch as any) };
                }, true);
            },

            // 👇 UI/Fragments 파사드(쓰기)
            setMode(mode: UIMode) {
                eng.update((s: any) => {
                    (s.ui ??= {});
                    s.ui.mode = mode;
                }, true);
            },
            setEditingFragment(id: string | null) {
                eng.update((s: any) => {
                    (s.ui ??= {});
                    s.ui.editingFragmentId = id;
                }, true);
            },
            notify(msg: string) {
                eng.notify?.(msg);
            },
        };
        return api;
    }, [eng, getRootFallback]);

    return React.useMemo(() => ({ reader: () => reader, writer: () => writer }), [reader, writer]);
}