'use client';
/**
 * FlowsPanel
 * - from(nodeId,event) → to(Navigate/Open/Close)
 * - 대상(to)은 toKind에 따라 드롭다운(페이지/프래그먼트)로 선택
 */
import React, { useMemo, useState } from 'react';

import { SelectPage } from '../../common/SelectPage';
import { SelectFragment } from '../../common/SelectFragment';

import type { SupportedEvent, FlowEdge, NodeId } from '../../../core/types';
import { useEditor } from '../../useEditor';

const SUPPORTED_EVENTS: SupportedEvent[] = ['onClick', 'onChange', 'onSubmit', 'onLoad'];
type ToKind = 'Navigate' | 'OpenFragment' | 'CloseFragment';

export function FlowsPanel() {
    const state = useEditor();

    const [fromNode, setFromNode] = useState<NodeId>(state.ui.selectedId ?? state.project.rootId);
    const [evt, setEvt] = useState<SupportedEvent>('onClick');
    const [toKind, setToKind] = useState<ToKind>('Navigate');

    // 대상 선택 상태
    const [toPage, setToPage] = useState<string>(state.project.pages[0]?.id ?? 'page_home');
    const [toFrag, setToFrag] = useState<string>(state.project.fragments[0]?.id ?? '');

    const edges: FlowEdge[] = Object.values(state.flowEdges);

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
    };

    return (
        <div className="p-3 space-y-3">
            <div className="text-xs font-semibold text-gray-500">Flows</div>

            <div className="grid grid-cols-12 gap-2 text-xs items-center">
                <label className="col-span-5 flex items-center gap-2">
                    <span className="w-10">from</span>
                    <input
                        className="flex-1 border rounded px-2 py-1"
                        value={fromNode}
                        onChange={(e) => setFromNode(e.target.value as NodeId)}
                        placeholder="node id"
                    />
                </label>

                <label className="col-span-2">
                    <select
                        className="w-full border rounded px-2 py-1"
                        value={evt}
                        onChange={(e) => setEvt(e.target.value as SupportedEvent)}
                    >
                        {SUPPORTED_EVENTS.map((e: SupportedEvent) => (
                            <option key={e} value={e}>{e}</option>
                        ))}
                    </select>
                </label>

                <label className="col-span-2">
                    <select
                        className="w-full border rounded px-2 py-1"
                        value={toKind}
                        onChange={(e) => setToKind(e.target.value as ToKind)}
                    >
                        <option value="Navigate">Navigate</option>
                        <option value="OpenFragment">OpenFragment</option>
                        <option value="CloseFragment">CloseFragment</option>
                    </select>
                </label>

                {/* 대상 선택: 페이지/프래그먼트 */}
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
                            allowEmpty={toKind === 'CloseFragment'}
                        />
                    </label>
                )}

                <div className="col-span-12 flex">
                    <button className="ml-auto text-xs px-2 py-1 rounded border" onClick={onAdd}>추가</button>
                </div>
            </div>

            <div className="space-y-1">
                {edges.map((e: FlowEdge, idx: number) => (
                    <div key={e.id ?? `edge-${idx}`} className="text-xs border rounded px-2 py-1 flex items-center gap-2">
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
                        <button className="ml-auto text-red-500" onClick={() => onRemove(e.id)}>
                            삭제
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}