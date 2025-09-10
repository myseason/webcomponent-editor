'use client';

import React from 'react';
import type { SupportedEvent, FlowEdge, NodeId, BindingScope } from '../../../core/types';
import { SelectPage } from '../../common/SelectPage';
import { SelectFragment } from '../../common/SelectFragment';
import { WhenBuilder } from '../../common/WhenBuilder';
import {BottomDomain, useBottomControllerFactory} from '@/figmaV3/controllers/bottom/BottomControllerFactory';

const SUPPORTED_EVENTS: SupportedEvent[] = ['onClick', 'onChange', 'onSubmit', 'onLoad'];
type ToKind = 'Navigate' | 'OpenFragment' | 'CloseFragment';

export function FlowsPanel() {
    // 1) Controller를 통해 reader와 writer를 가져옵니다.
    const { reader, writer } = useBottomControllerFactory(BottomDomain.Flows);

    // 2) reader를 사용하여 필요한 모든 상태를 조회합니다.
    const ui = reader.ui.getUI();
    const project = reader.project.getProject();
    const flowEdgesMap: Record<string, FlowEdge> = reader.flow.getFlowEdges();

    // 3) SelectPage와 SelectFragment에 전달할 목록을 준비합니다.
    const pages = reader.pages.getPages();
    const fragments = reader.fragments.getFragments();

    // 4) 로컬 상태 관리 (기존 로직 유지)
    const defaultFrom = ui?.selectedId ?? project?.rootId;
    const [fromNode, setFromNode] = React.useState<NodeId>(defaultFrom);
    const [evt, setEvt] = React.useState<SupportedEvent>('onClick');
    const [toKind, setToKind] = React.useState<ToKind>('Navigate');
    const [toPage, setToPage] = React.useState<string>(pages?.[0]?.id ?? '');
    const [toFrag, setToFrag] = React.useState<string>(fragments?.[0]?.id ?? '');
    const [editingEdgeId, setEditingEdgeId] = React.useState<string | null>(null);

    const edges: FlowEdge[] = React.useMemo(() => Object.values(flowEdgesMap), [flowEdgesMap]);

    // 5) Writer를 사용한 액션 함수 (기존 로직 유지)
    const onAdd = () => {
        if (!project) return;
        const edge: Omit<FlowEdge, 'id'> =
            toKind === 'Navigate'
                ? { from: { nodeId: fromNode, event: evt }, to: { kind: 'Navigate', toPageId: toPage } }
                : toKind === 'OpenFragment'
                    ? { from: { nodeId: fromNode, event: evt }, to: { kind: 'OpenFragment', fragmentId: toFrag } }
                    : { from: { nodeId: fromNode, event: evt }, to: { kind: 'CloseFragment', fragmentId: toFrag || undefined } };
        writer.flow.addFlowEdge(edge);
    };

    const onRemove = (id?: string) => {
        if (!id) return;
        writer.flow.removeFlowEdge(id);
        if (editingEdgeId === id) setEditingEdgeId(null);
    };

    return (
        <div className="p-2 text-sm">
            <div className="font-semibold mb-2">Flows</div>
            <div className="mb-3 space-y-2">
                <div className="flex items-center gap-2">
                    <span className="w-12 text-[12px] text-gray-600">from</span>
                    <input
                        className="flex-1 border rounded px-2 py-1 text-sm"
                        value={fromNode}
                        onChange={(e) => setFromNode(e.target.value as NodeId)}
                        placeholder="node id"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-12 text-[12px] text-gray-600">event</span>
                    <select
                        className="flex-1 border rounded px-2 py-1 bg-white text-sm"
                        value={evt}
                        onChange={(e) => setEvt(e.target.value as SupportedEvent)}
                    >
                        {SUPPORTED_EVENTS.map((ev) => (
                            <option key={ev} value={ev}>{ev}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-12 text-[12px] text-gray-600">to</span>
                    <select
                        className="flex-1 border rounded px-2 py-1 bg-white text-sm"
                        value={toKind}
                        onChange={(e) => setToKind(e.target.value as ToKind)}
                    >
                        {(['Navigate', 'OpenFragment', 'CloseFragment'] as ToKind[]).map((k) => (
                            <option key={k} value={k}>{k}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-12" />
                    {toKind === 'Navigate' ? (
                        <SelectPage value={toPage} onChange={setToPage} pages={pages} />
                    ) : (
                        <SelectFragment value={toFrag} onChange={setToFrag} fragments={fragments} allowEmpty={toKind === 'CloseFragment'} />
                    )}
                </div>
                <div className="flex items-center justify-end">
                    <button className="text-[12px] border rounded px-2 py-1" onClick={onAdd}>
                        추가
                    </button>
                </div>
            </div>
            <div className="space-y-2">
                {edges.map((e: FlowEdge) => {
                    // ✅ WhenBuilder에 전달할 bindingScope를 여기서 구성합니다.
                    const bindingScope: BindingScope = {
                        data: reader.data.getData(),
                        project: project,
                        node: reader.nodes.getNode(e.from.nodeId),
                    };
                    return (
                        <div key={e.id ?? `${e.from.nodeId}-${e.from.event}-${Math.random()}`} className="border rounded p-2">
                            <div className="flex items-center justify-between">
                                <div className="text-xs">
                                    <b>{e.from.nodeId}.{e.from.event}</b>{' '}→
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
                            {editingEdgeId === e.id && e.id && (
                                <div className="mt-2">
                                    <WhenBuilder
                                        value={e.when?.expr ?? ''}
                                        onChange={(expr) => {
                                            const trimmed = expr.trim();
                                            writer.flow.updateFlowEdge(e.id!, trimmed ? { when: { expr: trimmed } } : { when: undefined });
                                        }}
                                        bindingScope={bindingScope}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
                {edges.length === 0 && (
                    <div className="text-[12px] text-gray-500">
                        등록된 플로우가 없습니다. 위에서 추가하세요.
                    </div>
                )}
            </div>
        </div>
    );
}