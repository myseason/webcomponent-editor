'use client';
/**
 * FragmentsPanel
 * - 생성/이름 변경/삭제/미리보기(오버레이 Open) + (열린 경우) Close
 */
import React, { useMemo, useState } from 'react';
import { useEditor } from '../../useEditor';
import type { ActionStep, FlowEdge, Fragment } from '../../../core/types';

export function FragmentsPanel() {
    const state = useEditor();

    // refs 카운트(Flows + Actions)
    const refCountById = useMemo<Record<string, number>>(() => {
        const counts: Record<string, number> = Object.create(null);
        const edges: FlowEdge[] = Object.values(state.flowEdges);
        for (const e of edges) {
            if (e.to.kind === 'OpenFragment') counts[e.to.fragmentId] = (counts[e.to.fragmentId] ?? 0) + 1;
            else if (e.to.kind === 'CloseFragment' && e.to.fragmentId) {
                counts[e.to.fragmentId] = (counts[e.to.fragmentId] ?? 0) + 1;
            }
        }
        const nodes = state.project.nodes;
        for (const node of Object.values(nodes)) {
            const bag = (node.props as Record<string, unknown>).__actions as
                | Record<string, { steps: ActionStep[] }>
                | undefined;
            if (!bag) continue;
            for (const v of Object.values(bag)) {
                for (const s of v.steps) {
                    if (s.kind === 'OpenFragment') counts[s.fragmentId] = (counts[s.fragmentId] ?? 0) + 1;
                    else if (s.kind === 'CloseFragment' && s.fragmentId) {
                        counts[s.fragmentId] = (counts[s.fragmentId] ?? 0) + 1;
                    }
                }
            }
        }
        return counts;
    }, [state.flowEdges, state.project.nodes]);

    const openSet = useMemo<Set<string>>(
        () => new Set(state.ui.overlays),
        [state.ui.overlays],
    );

    const [newName, setNewName] = useState<string>('');
    const frags: Fragment[] = state.project.fragments;

    const onCreate = () => {
        const name = newName.trim() || `Fragment ${state.project.fragments.length + 1}`;
        const id = state.addFragment(name);
        void id;
        setNewName('');
    };
    const onOpen = (fragmentId: string) => state.openFragment(fragmentId);
    const onClose = (fragmentId: string) => state.closeFragment(fragmentId);
    const onDelete = (fragmentId: string) => {
        const used = refCountById[fragmentId] ?? 0;
        if (used > 0 && !confirm(`이 프래그먼트를 참조하는 항목이 ${used}개 있습니다.\n그래도 삭제하시겠습니까?`)) {
            return;
        }
        state.closeFragment(fragmentId);
        state.removeFragment(fragmentId);
    };
    const onRename = (fragmentId: string, name: string) => {
        const next = name.trim();
        if (!next) return;
        state.update((s) => {
            s.project.fragments = s.project.fragments.map((f) =>
                f.id === fragmentId ? { ...f, name: next } : f,
            );
        });
    };

    return (
        <div className="p-3 space-y-3">
            <div className="text-xs font-semibold text-gray-500">Fragments</div>

            <div className="flex items-center gap-2">
                <input
                    className="flex-1 border rounded px-2 py-1 text-xs"
                    placeholder="Fragment name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                />
                <button className="text-xs border rounded px-2 py-1" onClick={onCreate}>
                    + New
                </button>
            </div>

            <div className="space-y-2">
                {frags.length === 0 && (
                    <div className="text-xs text-gray-400">프래그먼트가 없습니다. 위에서 생성하세요.</div>
                )}
                {frags.map((f) => {
                    const opened = openSet.has(f.id);
                    const [draft, setDraft] = React.useState<string>(f.name ?? '');
                    // 각 행마다 훅이 동일 순서로 호출되도록 map 내부에서 React.useState 호출 OK(항상 같은 순서)
                    return (
                        <div key={f.id} className="border rounded p-2 text-xs flex items-center gap-2">
                            <span className="px-1 rounded bg-gray-100 text-gray-700">{f.id}</span>
                            <input
                                className="border rounded px-2 py-1 flex-1"
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                placeholder="Name"
                            />
                            <button className="border rounded px-2 py-1" onClick={() => onRename(f.id, draft)}>
                                Apply
                            </button>
                            {!opened ? (
                                <button className="border rounded px-2 py-1" onClick={() => onOpen(f.id)}>
                                    Open
                                </button>
                            ) : (
                                <button className="border rounded px-2 py-1" onClick={() => onClose(f.id)}>
                                    Close
                                </button>
                            )}
                            <button className="border rounded px-2 py-1 text-red-600" onClick={() => onDelete(f.id)}>
                                Delete
                            </button>
                            <span className="ml-2 text-[10px] text-gray-500">{(refCountById[f.id] ?? 0)} refs</span>
                            {opened && <span className="text-[10px] ml-1 px-1 rounded bg-emerald-50 text-emerald-700">open</span>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}