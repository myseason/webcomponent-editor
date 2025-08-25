'use client';
/**
 * ActionsPanel
 * - 선택된 노드의 이벤트별 ActionStep 목록을 편집/실행
 * - 저장 위치: node.props.__actions[event] = { steps }
 * - 초기 스텝: Alert, Navigate (확장 용이)
 */
import React, { useState } from 'react';
import type { SupportedEvent, ActionStep } from '../../../core/types';
import { useEditor } from '../../useEditor';
import { editorStore } from '../../../store/editStore';
import { runActions } from '../../../runtime/actions';

const SUPPORTED_EVENTS: SupportedEvent[] = ['onClick', 'onChange', 'onSubmit', 'onLoad'];

type ActionsBag = Record<SupportedEvent, { steps: ActionStep[] }>;

export function ActionsPanel() {
    const state = useEditor(); // 상태+액션
    const nodeId = state.ui.selectedId;
    if (!nodeId) return <div className="p-3 text-xs text-gray-500">노드를 선택하세요</div>;

    const node = state.project.nodes[nodeId];
    const actions = (node.props as Record<string, unknown>).__actions as ActionsBag | undefined;

    const [evt, setEvt] = useState<SupportedEvent>('onClick');
    const steps: ActionStep[] = actions?.[evt]?.steps ?? [];

    const setSteps = (next: ActionStep[]) => {
        const nextActions: ActionsBag = { ...(actions ?? ({} as ActionsBag)), [evt]: { steps: next } };
        state.updateNodeProps(nodeId, { __actions: nextActions });
    };

    const addAlert = () => setSteps([...steps, { kind: 'Alert', message: 'Hello' }]);
    const addNavigate = () =>
        setSteps([
            ...steps,
            { kind: 'Navigate', toPageId: state.project.pages[0]?.id ?? 'page_home' },
        ]);

    const runNow = async () => {
        await runActions(steps, {
            alert: (msg) => alert(msg),
            setData: (path, value) => editorStore.getState().setData(path, value),
            setProps: (nid, patch) => editorStore.getState().updateNodeProps(nid, patch),
            navigate: (toPageId) => editorStore.getState().selectPage(toPageId),
            openFragment: (_id) => {},
            closeFragment: (_id) => {},
            http: async (m, url, body, headers) => {
                const res = await fetch(url, { method: m, headers, body: body ? JSON.stringify(body) : undefined });
                try { return await res.json(); } catch { return await res.text(); }
            },
            emit: (_t, _p) => {},
        });
    };

    return (
        <div className="p-3 space-y-2">
            <div className="flex items-center gap-2">
                <div className="text-xs font-semibold text-gray-500">Actions</div>
                <select
                    className="text-xs border rounded px-1 py-0.5 ml-auto"
                    value={evt}
                    onChange={(e) => setEvt(e.target.value as SupportedEvent)}
                >
                    {SUPPORTED_EVENTS.map((e: SupportedEvent) => (
                        <option key={e} value={e}>
                            {e}
                        </option>
                    ))}
                </select>
            </div>

            <div className="space-y-1">
                {steps.length === 0 && (
                    <div className="text-xs text-gray-400">스텝이 없습니다. 아래 버튼으로 추가하세요.</div>
                )}
                {steps.map((s: ActionStep, i: number) => (
                    <div key={`${s.kind}-${i}`} className="text-xs border rounded px-2 py-1 flex items-center gap-2">
                        <span className="px-1 rounded bg-gray-100">{s.kind}</span>
                        {s.kind === 'Alert' && <span className="text-gray-600 truncate">“{s.message}”</span>}
                        {s.kind === 'Navigate' && <span className="text-gray-600">→ {s.toPageId}</span>}
                        <button
                            className="ml-auto text-red-500"
                            onClick={() => setSteps(steps.filter((_, idx: number) => idx !== i))}
                        >
                            삭제
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex gap-2">
                <button className="text-xs px-2 py-1 rounded border" onClick={addAlert}>+ Alert</button>
                <button className="text-xs px-2 py-1 rounded border" onClick={addNavigate}>+ Navigate</button>
                <button className="ml-auto text-xs px-2 py-1 rounded border bg-blue-600 text-white" onClick={runNow}>
                    Run Now
                </button>
            </div>
        </div>
    );
}