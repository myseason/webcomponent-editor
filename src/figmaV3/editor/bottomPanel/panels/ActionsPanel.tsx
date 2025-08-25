'use client';
/**
 * ActionsPanel
 * - 선택된 노드의 이벤트별 ActionStep 목록을 편집/실행
 * - 저장 위치: node.props.__actions[event] = { steps }
 * - 템플릿 정책(actions.allowEvents)을 반영해 이벤트 탭을 제한
 *   (전문가 모드가 ON이면 정책 무시)
 */

import React from 'react';
import type { SupportedEvent, ActionStep, EditorState } from '../../../core/types';
import { useEditor } from '../../useEditor';
import { editorStore } from '../../../store/editStore';
import { runActions } from '../../../runtime/actions';

const SUPPORTED_EVENTS: SupportedEvent[] = ['onClick', 'onChange', 'onSubmit', 'onLoad'];

type ActionsBag = Partial<Record<SupportedEvent, { steps: ActionStep[] }>>;

export function ActionsPanel() {
    const state = useEditor();

    // --- 선택 노드 ---
    const nodeId = state.ui.selectedId;
    if (!nodeId) return <>노드를 선택하세요</>;
    const node = state.project.nodes[nodeId];

    // --- 템플릿 정책(actions.allowEvents) 계산 ---
    const expert = Boolean(state.ui.expertMode);
    const filter = state.project.inspectorFilters?.[node.componentId];
    const policyAllowed = (!expert && filter?.actions?.allowEvents) ? new Set(filter.actions.allowEvents) : null;

    // 이벤트 선택 상태(허용 집합이 바뀌면 보정)
    const firstAllowed = React.useMemo<SupportedEvent>(() => {
        if (policyAllowed && policyAllowed.size > 0) {
            const first = Array.from(policyAllowed)[0] as SupportedEvent;
            return first;
        }
        return 'onClick';
    }, [policyAllowed]);

    const [evt, setEvt] = React.useState<SupportedEvent>(firstAllowed);
    React.useEffect(() => {
        if (policyAllowed && !policyAllowed.has(evt)) {
            setEvt(firstAllowed);
        }
    }, [policyAllowed, evt, firstAllowed]);

    // --- 현재 이벤트의 스텝 목록 ---
    const actions = (node.props as Record<string, unknown>).__actions as ActionsBag | undefined;
    const steps: ActionStep[] = actions?.[evt]?.steps ?? [];

    // --- 스텝 갱신 헬퍼 ---
    const setSteps = (next: ActionStep[]) => {
        const nextActions: ActionsBag = { ...(actions ?? {}), [evt]: { steps: next } };
        state.updateNodeProps(nodeId, { __actions: nextActions });
    };

    // --- 스텝 추가 샘플(필요 시 확장) ---
    const addAlert = () => setSteps([...steps, { kind: 'Alert', message: 'Hello' }]);
    const addNavigate = () =>
        setSteps([
            ...steps,
            { kind: 'Navigate', toPageId: state.project.pages[0]?.id ?? 'page_home' },
        ]);

    // --- 즉시 실행(미리보기) ---
    const runNow = async () => {
        await runActions(steps, {
            alert: (msg) => alert(msg),
            setData: (path, value) => editorStore.getState().setData(path, value),
            setProps: (nid, patch) => editorStore.getState().updateNodeProps(nid, patch),
            navigate: (toPageId) => editorStore.getState().selectPage(toPageId),
            openFragment: (_id) => {},
            closeFragment: (_id) => {},
            http: async (m, url, body, headers) => {
                const res = await fetch(url, {
                    method: m,
                    headers,
                    body: body ? JSON.stringify(body) : undefined,
                });
                try {
                    return await res.json();
                } catch {
                    return await res.text();
                }
            },
            emit: (_t, _p) => {},
        });
    };

    // --- 렌더 ---
    return (
        <div className="p-2 text-sm">
            <div className="font-semibold mb-2">Actions</div>

            {/* 이벤트 선택 (정책에 맞게 필터링) */}
            <div className="mb-2 flex gap-2">
                <select
                    className="border rounded px-2 py-1 bg-white"
                    value={evt}
                    onChange={(e) => setEvt(e.target.value as SupportedEvent)}
                >
                    {SUPPORTED_EVENTS.filter((e) => !policyAllowed || policyAllowed.has(e)).map((e) => (
                        <option key={e} value={e}>
                            {e}
                        </option>
                    ))}
                </select>

                {!expert && policyAllowed && (
                    <span className="text-[12px] text-gray-500 self-center">
            제한 이벤트: {Array.from(policyAllowed).join(', ')}
          </span>
                )}
            </div>

            {/* 스텝 목록 */}
            {steps.length === 0 && (
                <div className="text-[12px] text-gray-500 mb-2">스텝이 없습니다. 아래 버튼으로 추가하세요.</div>
            )}

            <div className="space-y-2">
                {steps.map((s: ActionStep, i: number) => (
                    <div key={i} className="border rounded p-2 flex items-center justify-between">
                        <div className="text-xs">
                            <b>{s.kind}</b>{' '}
                            {s.kind === 'Alert' && `“${s.message}”`}
                            {s.kind === 'Navigate' && `→ ${s.toPageId}`}
                        </div>
                        <button
                            className="text-[12px] border rounded px-2 py-1"
                            onClick={() => setSteps(steps.filter((_, idx: number) => idx !== i))}
                        >
                            삭제
                        </button>
                    </div>
                ))}
            </div>

            {/* 추가/실행 */}
            <div className="mt-3 flex gap-2">
                <button className="text-[12px] border rounded px-2 py-1" onClick={addAlert}>
                    + Alert
                </button>
                <button className="text-[12px] border rounded px-2 py-1" onClick={addNavigate}>
                    + Navigate
                </button>
                <button className="ml-auto text-[12px] border rounded px-2 py-1" onClick={runNow}>
                    Run Now
                </button>
            </div>
        </div>
    );
}