'use client';
/**
 * ActionsPanel
 * - 선택된 노드의 이벤트별 ActionStep 목록을 편집/실행
 * - 제공 스텝: Alert / Navigate / OpenFragment / CloseFragment
 */
import React, { useMemo, useState } from 'react';
import type { SupportedEvent, ActionStep } from '../../../core/types';
import { useEditor } from '../../useEditor';
import { editorStore } from '../../../store/editStore';
import { runActions } from '../../../runtime/actions';

const SUPPORTED_EVENTS: SupportedEvent[] = ['onClick', 'onChange', 'onSubmit', 'onLoad'];

type ActionsBag = Record<SupportedEvent, { steps: ActionStep[] }>;

export function ActionsPanel() {
    const state = useEditor();
    const nodeId = state.ui.selectedId;
    if (!nodeId) return <div className="p-3 text-xs text-gray-500">노드를 선택하세요</div>;

    const node = state.project.nodes[nodeId];
    const actions = (node.props as Record<string, unknown>).__actions as ActionsBag | undefined;

    const [evt, setEvt] = useState<SupportedEvent>('onClick');
    const steps: ActionStep[] = actions?.[evt]?.steps ?? [];

    const pages = state.project.pages;
    const fragments = state.project.fragments;

    // 드롭다운 선택 상태
    const [navPageId, setNavPageId] = useState<string>(pages[0]?.id ?? 'page_home');
    const [openFragId, setOpenFragId] = useState<string>(fragments[0]?.id ?? '');

    const setSteps = (next: ActionStep[]) => {
        const nextActions: ActionsBag = { ...(actions ?? ({} as ActionsBag)), [evt]: { steps: next } };
        state.updateNodeProps(nodeId, { __actions: nextActions });
    };

    const addAlert = () => setSteps([...steps, { kind: 'Alert', message: 'Hello' }]);
    const addNavigate = () => setSteps([...steps, { kind: 'Navigate', toPageId: navPageId }]);
    const addOpenFragment = () => setSteps([...steps, { kind: 'OpenFragment', fragmentId: openFragId }]);
    const addCloseFragment = () => setSteps([...steps, { kind: 'CloseFragment' }]); // top-of-stack 닫기

    const runNow = async () => {
        await runActions(steps, {
            alert: (msg) => alert(msg),
            setData: (path, value) => editorStore.getState().setData(path, value),
            setProps: (nid, patch) => editorStore.getState().updateNodeProps(nid, patch),
            navigate: (toPageId) => editorStore.getState().selectPage(toPageId),
            openFragment: (id) => editorStore.getState().openFragment(id),
            closeFragment: (id) => editorStore.getState().closeFragment(id),
            http: async (m, url, body, headers) => {
                const res = await fetch(url, { method: m, headers, body: body ? JSON.stringify(body) : undefined });
                try { return await res.json(); } catch { return await res.text(); }
            },
            emit: (_t, _p) => {},
        });
    };

    const StepRow = ({ s, i }: { s: ActionStep; i: number }) => {
        return (
            <div className="text-xs border rounded px-2 py-1 flex items-center gap-2">
                <span className="px-1 rounded bg-gray-100">{s.kind}</span>
                {s.kind === 'Alert' && <span className="text-gray-600 truncate">“{s.message}”</span>}
                {s.kind === 'Navigate' && <span className="text-gray-600">→ {s.toPageId}</span>}
                {s.kind === 'OpenFragment' && <span className="text-gray-600">open: {s.fragmentId}</span>}
                {s.kind === 'CloseFragment' && <span className="text-gray-600">close {s.fragmentId ?? '(top)'}</span>}
                <button
                    className="ml-auto text-red-500"
                    onClick={() => setSteps(steps.filter((_, idx: number) => idx !== i))}
                >
                    삭제
                </button>
            </div>
        );
    };

    return (
        <div className="p-3 space-y-3">
            <div className="flex items-center gap-2">
                <div className="text-xs font-semibold text-gray-500">Actions</div>
                <select
                    className="text-xs border rounded px-1 py-0.5 ml-auto"
                    value={evt}
                    onChange={(e) => setEvt(e.target.value as SupportedEvent)}
                >
                    {SUPPORTED_EVENTS.map((e: SupportedEvent) => (
                        <option key={e} value={e}>{e}</option>
                    ))}
                </select>
            </div>

            {/* 현재 스텝 프리뷰 */}
            <div className="space-y-1">
                {steps.length === 0 && (
                    <div className="text-xs text-gray-400">스텝이 없습니다. 아래 컨트롤로 추가하세요.</div>
                )}
                {steps.map((s: ActionStep, i: number) => (
                    <StepRow key={`${s.kind}-${i}`} s={s} i={i} />
                ))}
            </div>

            {/* 컨트롤: 타겟 선택 + 스텝 추가 */}
            <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs items-center">
                    <label className="col-span-6 flex items-center gap-2">
                        <span className="w-14">Navigate</span>
                        <select
                            className="flex-1 border rounded px-2 py-1"
                            value={navPageId}
                            onChange={(e) => setNavPageId(e.target.value)}
                        >
                            {pages.map((p) => <option key={p.id} value={p.id}>{p.name || p.id}</option>)}
                        </select>
                    </label>
                    <button className="col-span-2 text-xs px-2 py-1 rounded border" onClick={addNavigate}>+ Navigate</button>

                    <label className="col-span-6 flex items-center gap-2">
                        <span className="w-14">Fragment</span>
                        <select
                            className="flex-1 border rounded px-2 py-1"
                            value={openFragId}
                            onChange={(e) => setOpenFragId(e.target.value)}
                        >
                            {fragments.map((f) => <option key={f.id} value={f.id}>{f.name || f.id}</option>)}
                        </select>
                    </label>
                    <div className="col-span-6 flex gap-2">
                        <button className="text-xs px-2 py-1 rounded border" onClick={addOpenFragment}>+ OpenFragment</button>
                        <button className="text-xs px-2 py-1 rounded border" onClick={addCloseFragment}>+ CloseFragment</button>
                    </div>
                </div>
            </div>

            <div className="flex">
                <button className="ml-auto text-xs px-2 py-1 rounded border bg-blue-600 text-white" onClick={runNow}>
                    Run Now
                </button>
            </div>
        </div>
    );
}