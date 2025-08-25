'use client';
/**
 * FlowsPanel
 * - from(nodeId,event) → to(Navigate/OpenFragment/CloseFragment) 플로우를 관리합니다.
 * - when 조건식 편집기를 내장(WhenBuilder)하여 안전 표현식을 바로 구성/저장할 수 있습니다.
 *
 * 규칙
 * - 훅은 최상위에서만 호출(useEditor, useState 등)
 * - any 금지
 * - 스토어 갱신은 얕은 복사 규약(update/개별 액션) 사용
 */

import React, { useState } from 'react';
import type { SupportedEvent, FlowEdge, NodeId } from '../../../core/types';
import { useEditor } from '../../useEditor';
import { SelectPage } from '../../common/SelectPage';
import { SelectFragment } from '../../common/SelectFragment';
import { WhenBuilder } from '../../common/WhenBuilder';

const SUPPORTED_EVENTS: SupportedEvent[] = ['onClick', 'onChange', 'onSubmit', 'onLoad'];
type ToKind = 'Navigate' | 'OpenFragment' | 'CloseFragment';

export function FlowsPanel() {
    // 1) 훅은 최상위에서만 호출
    const state = useEditor();

    // 2) 입력 폼 상태 (from/event/toKind/target)
    const [fromNode, setFromNode] = useState<NodeId>(
        state.ui.selectedId ?? state.project.rootId,
    );
    const [evt, setEvt] = useState<SupportedEvent>('onClick');
    const [toKind, setToKind] = useState<ToKind>('Navigate');

    // 대상(페이지/프래그먼트) 선택 상태 — 공용 셀렉트와 함께 사용
    const [toPage, setToPage] = useState<string>(state.project.pages[0]?.id ?? 'page_home');
    const [toFrag, setToFrag] = useState<string>(state.project.fragments[0]?.id ?? '');

    // 3) 행별 when 편집 토글 상태
    const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);

    // 4) 현재 플로우 목록
    const edges: FlowEdge[] = Object.values(state.flowEdges);

    // 5) 액션
    const onAdd = () => {
        const edge: FlowEdge =
            toKind === 'Navigate'
                ? { from: { nodeId: fromNode, event: evt }, to: { kind: 'Navigate', toPageId: toPage } }
                : toKind === 'OpenFragment'
                    ? { from: { nodeId: fromNode, event: evt }, to: { kind: 'OpenFragment', fragmentId: toFrag } }
                    : { from: { nodeId: fromNode, event: evt }, to: { kind: 'CloseFragment', fragmentId: toFrag || undefined } };

        state.addFlowEdge(edge);
    };

    const onRemove = (id?: string) => {
        if (!id) return;
        state.removeFlowEdge(id);
        if (editingEdgeId === id) setEditingEdgeId(null);
    };

    // 6) 렌더
    return (
        <div className="p-3 space-y-3">
            <div className="text-xs font-semibold text-gray-500">Flows</div>

            {/* 작성 폼 */}
            <div className="grid grid-cols-12 gap-2 text-xs items-center">
                {/* from (node id) */}
                <label className="col-span-5 flex items-center gap-2">
                    <span className="w-10">from</span>
                    <input
                        className="flex-1 border rounded px-2 py-1"
                        value={fromNode}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFromNode(e.target.value as NodeId)
                        }
                        placeholder="node id"
                    />
                </label>

                {/* event */}
                <label className="col-span-2">
                    <select
                        className="w-full border rounded px-2 py-1"
                        value={evt}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                            setEvt(e.target.value as SupportedEvent)
                        }
                    >
                        {SUPPORTED_EVENTS.map((ev: SupportedEvent) => (
                            <option key={ev} value={ev}>
                                {ev}
                            </option>
                        ))}
                    </select>
                </label>

                {/* to kind */}
                <label className="col-span-2">
                    <select
                        className="w-full border rounded px-2 py-1"
                        value={toKind}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                            setToKind(e.target.value as ToKind)
                        }
                    >
                        <option value="Navigate">Navigate</option>
                        <option value="OpenFragment">OpenFragment</option>
                        <option value="CloseFragment">CloseFragment</option>
                    </select>
                </label>

                {/* to target (페이지/프래그먼트) */}
                {toKind === 'Navigate' ? (
                    <label className="col-span-3 flex items-center gap-2">
                        <span className="w-6">to</span>
                        <SelectPage
                            className="flex-1 border rounded px-2 py-1"
                            value={toPage}
                            onChange={setToPage}
                        />
                    </label>
                ) : (
                    <label className="col-span-3 flex items-center gap-2">
                        <span className="w-6">to</span>
                        <SelectFragment
                            className="flex-1 border rounded px-2 py-1"
                            value={toFrag}
                            onChange={setToFrag}
                            allowEmpty={toKind === 'CloseFragment'} // Close는 (none)=top-of-stack 허용
                        />
                    </label>
                )}

                <div className="col-span-12 flex">
                    <button className="ml-auto text-xs px-2 py-1 rounded border" onClick={onAdd}>
                        추가
                    </button>
                </div>
            </div>

            {/* 목록 */}
            <div className="space-y-1">
                {edges.map((e: FlowEdge, idx: number) => (
                    <div key={e.id ?? `edge-${idx}`} className="text-xs border rounded px-2 py-1">
                        <div className="flex items-center gap-2">
              <span className="px-1 rounded bg-gray-100">
                {e.from.nodeId}.{e.from.event}
              </span>

                            <span className="text-gray-600">
                →
                                {e.to.kind === 'Navigate'
                                    ? ` ${e.to.toPageId}`
                                    : e.to.kind === 'OpenFragment'
                                        ? ` open:${e.to.fragmentId}`
                                        : ` close:${e.to.fragmentId ?? '(top)'}`}
              </span>

                            {/* 현재 조건 스니펫 */}
                            <span className="ml-2 text-[10px] text-gray-500">
                {e.when?.expr ? `when: ${e.when.expr}` : 'when: (none)'}
              </span>

                            <button
                                className="ml-auto"
                                onClick={() => setEditingEdgeId(editingEdgeId === e.id ? null : (e.id ?? null))}
                            >
                                조건
                            </button>
                            <button className="text-red-500" onClick={() => onRemove(e.id)}>
                                삭제
                            </button>
                        </div>

                        {/* when 편집기 (토글 렌더; 훅 호출 아님 → 안전) */}
                        {editingEdgeId === e.id && e.id && (
                            <div className="mt-2">
                                <WhenBuilder
                                    value={e.when?.expr}
                                    onChange={(expr: string) => {
                                        const trimmed = expr.trim();
                                        state.updateFlowEdge(
                                            e.id as string,
                                            trimmed ? { when: { expr: trimmed } } : { when: undefined },
                                        );
                                    }}
                                    previewNodeId={e.from.nodeId}
                                />
                            </div>
                        )}
                    </div>
                ))}
                {edges.length === 0 && (
                    <div className="text-xs text-gray-400">등록된 플로우가 없습니다. 위에서 추가하세요.</div>
                )}
            </div>
        </div>
    );
}