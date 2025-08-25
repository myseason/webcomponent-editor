'use client';
/**
 * FlowsPanel
 * - from(nodeId,event) → to(Navigate/OpenFragment/CloseFragment) 플로우를 관리
 * - when 조건식 편집기(WhenBuilder) 포함
 * - 템플릿 정책(flows.allowKinds, actions.allowEvents) 반영
 *   (전문가 모드 ON이면 템플릿 정책 무시)
 *
 * 규칙
 * - 훅은 최상위에서만 호출(useEditor, useState 등)
 * - any 금지
 * - 스토어 갱신은 얕은 복사 규약(update/개별 액션) 사용
 */

import React from 'react';
import type { SupportedEvent, FlowEdge, NodeId, EditorState } from '../../../core/types';
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
    const defaultFrom = state.ui.selectedId ?? state.project.rootId;
    const [fromNode, setFromNode] = React.useState<NodeId>(defaultFrom);

    // 정책 계산을 위해 fromNode가 바뀔 때마다 대상 노드/정책을 구합니다
    const fromNodeObj = state.project.nodes[fromNode];
    const expert = Boolean(state.ui.expertMode);
    const filter = fromNodeObj ? state.project.inspectorFilters?.[fromNodeObj.componentId] : undefined;

    // 이벤트 정책
    const allowedEvents = (!expert && filter?.actions?.allowEvents) ? new Set(filter.actions.allowEvents) : null;
    const firstAllowedEvent: SupportedEvent = React.useMemo(() => {
        if (allowedEvents && allowedEvents.size > 0) return Array.from(allowedEvents)[0] as SupportedEvent;
        return 'onClick';
    }, [allowedEvents]);
    const [evt, setEvt] = React.useState<SupportedEvent>(firstAllowedEvent);
    React.useEffect(() => {
        if (allowedEvents && !allowedEvents.has(evt)) setEvt(firstAllowedEvent);
    }, [allowedEvents, evt, firstAllowedEvent]);

    // toKind 정책
    const allowedKinds = (!expert && filter?.flows?.allowKinds) ? new Set(filter.flows.allowKinds) : null;
    const firstAllowedKind: ToKind = React.useMemo(() => {
        if (allowedKinds && allowedKinds.size > 0) return Array.from(allowedKinds)[0] as ToKind;
        return 'Navigate';
    }, [allowedKinds]);
    const [toKind, setToKind] = React.useState<ToKind>(firstAllowedKind);
    React.useEffect(() => {
        if (allowedKinds && !allowedKinds.has(toKind)) setToKind(firstAllowedKind);
    }, [allowedKinds, toKind, firstAllowedKind]);

    // 대상(페이지/프래그먼트) 선택 상태 — 공용 셀렉트와 함께 사용
    const [toPage, setToPage] = React.useState<string>(state.project.pages[0]?.id ?? 'page_home');
    const [toFrag, setToFrag] = React.useState<string>(state.project.fragments[0]?.id ?? '');

    // 3) 행별 when 편집 토글 상태
    const [editingEdgeId, setEditingEdgeId] = React.useState<string | null>(null);

    // 4) 현재 플로우 목록
    const edges: FlowEdge[] = React.useMemo(() => Object.values(state.flowEdges), [state.flowEdges]);

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
        <div className="p-2 text-sm">
            <div className="font-semibold mb-2">Flows</div>

            {/* 작성 폼 */}
            <div className="mb-3 space-y-2">
                {/* from (node id) */}
                <div className="flex items-center gap-2">
                    <span className="w-12 text-[12px] text-gray-600">from</span>
                    <input
                        className="flex-1 border rounded px-2 py-1 text-sm"
                        value={fromNode}
                        onChange={(e) => setFromNode(e.target.value as NodeId)}
                        placeholder="node id"
                    />
                </div>

                {/* event (정책 반영) */}
                <div className="flex items-center gap-2">
                    <span className="w-12 text-[12px] text-gray-600">event</span>
                    <select
                        className="flex-1 border rounded px-2 py-1 bg-white text-sm"
                        value={evt}
                        onChange={(e) => setEvt(e.target.value as SupportedEvent)}
                    >
                        {SUPPORTED_EVENTS.filter((ev) => !allowedEvents || allowedEvents.has(ev)).map((ev) => (
                            <option key={ev} value={ev}>
                                {ev}
                            </option>
                        ))}
                    </select>
                    {!expert && allowedEvents && (
                        <span className="text-[12px] text-gray-500">
              제한 이벤트: {Array.from(allowedEvents).join(', ')}
            </span>
                    )}
                </div>

                {/* to kind (정책 반영) */}
                <div className="flex items-center gap-2">
                    <span className="w-12 text-[12px] text-gray-600">to</span>
                    <select
                        className="flex-1 border rounded px-2 py-1 bg-white text-sm"
                        value={toKind}
                        onChange={(e) => setToKind(e.target.value as ToKind)}
                    >
                        {(['Navigate', 'OpenFragment', 'CloseFragment'] as ToKind[])
                            .filter((k) => !allowedKinds || allowedKinds.has(k))
                            .map((k) => (
                                <option key={k} value={k}>
                                    {k}
                                </option>
                            ))}
                    </select>
                    {!expert && allowedKinds && (
                        <span className="text-[12px] text-gray-500">
              제한 동작: {Array.from(allowedKinds).join(', ')}
            </span>
                    )}
                </div>

                {/* to target (페이지/프래그먼트) */}
                <div className="flex items-center gap-2">
                    <span className="w-12" />
                    {toKind === 'Navigate' ? (
                        <SelectPage value={toPage} onChange={setToPage} />
                    ) : (
                        <SelectFragment value={toFrag} onChange={setToFrag} />
                    )}
                </div>

                <div className="flex items-center justify-end">
                    <button className="text-[12px] border rounded px-2 py-1" onClick={onAdd}>
                        추가
                    </button>
                </div>
            </div>

            {/* 목록 */}
            <div className="space-y-2">
                {edges.map((e: FlowEdge) => (
                    <div key={e.id ?? `${e.from.nodeId}-${e.from.event}-${Math.random()}`} className="border rounded p-2">
                        <div className="flex items-center justify-between">
                            <div className="text-xs">
                                <b>
                                    {e.from.nodeId}.{e.from.event}
                                </b>{' '}
                                →
                                {e.to.kind === 'Navigate'
                                    ? ` ${e.to.toPageId}`
                                    : e.to.kind === 'OpenFragment'
                                        ? ` open:${e.to.fragmentId}`
                                        : ` close:${e.to.fragmentId ?? '(top)'}`}
                                <span className="ml-2 text-[11px] text-gray-500">
                  {e.when?.expr ? `when: ${e.when.expr}` : 'when: (none)'}
                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    className="text-[12px] border rounded px-2 py-1"
                                    onClick={() => setEditingEdgeId(editingEdgeId === e.id ? null : (e.id ?? null))}
                                >
                                    조건
                                </button>
                                <button className="text-[12px] border rounded px-2 py-1" onClick={() => onRemove(e.id)}>
                                    삭제
                                </button>
                            </div>
                        </div>

                        {/* when 편집기 (토글 렌더; 훅 호출 아님 → 안전) */}
                        {editingEdgeId === e.id && e.id && (
                            <div className="mt-2">
                                <WhenBuilder
                                    value={e.when?.expr ?? ''}
                                    onChange={(expr) => {
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
                    <div className="text-[12px] text-gray-500">등록된 플로우가 없습니다. 위에서 추가하세요.</div>
                )}
            </div>
        </div>
    );
}