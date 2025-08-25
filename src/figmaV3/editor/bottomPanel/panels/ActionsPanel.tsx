'use client';
/**
 * ActionsPanel
 * - 선택된 노드의 이벤트별(Action) 스텝을 구성/실행합니다.
 * - 추가: 이벤트 단위의 조건(when.expr) 빌더(WhenBuilder) 통합
 *
 * 규칙:
 * - 훅은 최상위에서만 호출(useEditor, useState 등)
 * - any 금지
 * - 스토어 갱신은 얕은 복사 규약(updateNodeProps / update) 사용
 */
import React, { useState } from 'react';
import type { SupportedEvent, ActionStep } from '../../../core/types';
import { useEditor } from '../../useEditor';
import { editorStore } from '../../../store/editStore';
import { runActions } from '../../../runtime/actions';
import { SelectPage } from '../../common/SelectPage';
import { SelectFragment } from '../../common/SelectFragment';
import { WhenBuilder } from '../../common/WhenBuilder';
import { evalWhenExpr } from '../../../runtime/expr';

const SUPPORTED_EVENTS: SupportedEvent[] = ['onClick', 'onChange', 'onSubmit', 'onLoad'];

/** 이벤트별 액션 컨테이너 타입(when 추가) */
type ActionsBag = Record<
    SupportedEvent,
    {
        steps: ActionStep[];
        when?: { expr: string };
    }
>;

export function ActionsPanel() {
    // 1) 훅은 최상위에서 호출
    const state = useEditor();
    const [evt, setEvt] = useState<SupportedEvent>('onClick');
    const [editingWhen, setEditingWhen] = useState<boolean>(false);

    // 2) 선택 노드 파생값은 훅 이후에 계산
    const nodeId = state.ui.selectedId;
    const node = nodeId ? state.project.nodes[nodeId] : undefined;

    // 3) 현재 이벤트의 steps/when
    const actions = (node?.props as Record<string, unknown> | undefined)?.__actions as ActionsBag | undefined;
    const steps: ActionStep[] = actions?.[evt]?.steps ?? [];
    const whenExpr: string | undefined = actions?.[evt]?.when?.expr;

    // 4) 드롭다운 선택 상태 (목록 변화 시 보정은 SelectPage/SelectFragment 내부에서 처리)
    const [navPageId, setNavPageId] = useState<string>(state.project.pages[0]?.id ?? 'page_home');
    const [openFragId, setOpenFragId] = useState<string>(state.project.fragments[0]?.id ?? '');

    // 5) 저장기 (steps/when)
    const setSteps = (next: ActionStep[]) => {
        if (!nodeId) return;
        const nextBag: ActionsBag = {
            ...(actions ?? ({} as ActionsBag)),
            [evt]: {
                steps: next,
                when: actions?.[evt]?.when, // 기존 조건 유지
            },
        };
        state.updateNodeProps(nodeId, { __actions: nextBag });
    };

    const setWhen = (expr: string) => {
        if (!nodeId) return;
        const trimmed = expr.trim();
        const nextBag: ActionsBag = {
            ...(actions ?? ({} as ActionsBag)),
            [evt]: {
                steps: actions?.[evt]?.steps ?? [],
                when: trimmed ? { expr: trimmed } : undefined,
            },
        };
        state.updateNodeProps(nodeId, { __actions: nextBag });
    };

    // 6) 스텝 추가/삭제
    const addAlert = () => setSteps([...steps, { kind: 'Alert', message: 'Hello' }]);
    const addNavigate = () => setSteps([...steps, { kind: 'Navigate', toPageId: navPageId }]);
    const addOpenFragment = () => setSteps([...steps, { kind: 'OpenFragment', fragmentId: openFragId }]);
    const addCloseFragment = () => setSteps([...steps, { kind: 'CloseFragment' }]); // top-of-stack 닫기

    const removeStep = (idx: number) => setSteps(steps.filter((_, i) => i !== idx));

    // 7) Run Now (현재 state에서 즉시 실행) — when 조건 평가 후 실행
    const runNow = async () => {
        if (!nodeId || !node) return;
        // 이벤트 조건(when)을 먼저 평가
        if (whenExpr && whenExpr.trim()) {
            const ok = evalWhenExpr(whenExpr, { data: state.data, node, project: state.project });
            if (!ok) {
                alert('조건(when)이 false 이므로 실행되지 않습니다.');
                return;
            }
        }
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

    // 8) 선택 노드 없을 때 안내 (훅 호출 이후 분기라 안전)
    if (!nodeId || !node) {
        return <div className="p-3 text-xs text-gray-500">노드를 선택하세요</div>;
    }

    // 9) 뷰
    return (
        <div className="p-3 space-y-3">
            {/* 헤더: 이벤트 선택 + 조건 토글 */}
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
                <button
                    className={`text-xs border rounded px-2 py-1 ${editingWhen ? 'bg-gray-100' : ''}`}
                    onClick={() => setEditingWhen((v) => !v)}
                    title="이 이벤트의 실행 조건(when)을 편집"
                >
                    조건
                </button>
            </div>

            {/* 조건(when) 빌더 — 토글 렌더 */}
            {editingWhen && (
                <WhenBuilder
                    value={whenExpr}
                    onChange={setWhen}
                    previewNodeId={nodeId}
                    className="border rounded p-2 text-xs"
                />
            )}

            {/* 현재 스텝 목록 */}
            <div className="space-y-1">
                {steps.length === 0 && (
                    <div className="text-xs text-gray-400">스텝이 없습니다. 아래 컨트롤로 추가하세요.</div>
                )}
                {steps.map((s: ActionStep, i: number) => (
                    <div key={`${s.kind}-${i}`} className="text-xs border rounded px-2 py-1 flex items-center gap-2">
                        <span className="px-1 rounded bg-gray-100">{s.kind}</span>
                        {s.kind === 'Alert' && <span className="text-gray-600 truncate">“{s.message}”</span>}
                        {s.kind === 'Navigate' && <span className="text-gray-600">→ {s.toPageId}</span>}
                        {s.kind === 'OpenFragment' && <span className="text-gray-600">open: {s.fragmentId}</span>}
                        {s.kind === 'CloseFragment' && <span className="text-gray-600">close {s.fragmentId ?? '(top)'}</span>}
                        <button className="ml-auto text-red-500" onClick={() => removeStep(i)}>
                            삭제
                        </button>
                    </div>
                ))}
            </div>

            {/* 컨트롤: 대상 선택 + 스텝 추가 */}
            <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs items-center">
                    <label className="col-span-6 flex items-center gap-2">
                        <span className="w-14">Navigate</span>
                        <SelectPage
                            className="flex-1 border rounded px-2 py-1"
                            value={navPageId}
                            onChange={setNavPageId}
                        />
                    </label>
                    <button className="col-span-2 text-xs px-2 py-1 rounded border" onClick={addNavigate}>
                        + Navigate
                    </button>

                    <label className="col-span-6 flex items-center gap-2">
                        <span className="w-14">Fragment</span>
                        <SelectFragment
                            className="flex-1 border rounded px-2 py-1"
                            value={openFragId}
                            onChange={setOpenFragId}
                        />
                    </label>
                    <div className="col-span-6 flex gap-2">
                        <button className="text-xs px-2 py-1 rounded border" onClick={addOpenFragment}>
                            + OpenFragment
                        </button>
                        <button className="text-xs px-2 py-1 rounded border" onClick={addCloseFragment}>
                            + CloseFragment
                        </button>
                    </div>
                </div>
            </div>

            {/* 실행 */}
            <div className="flex">
                <button className="ml-auto text-xs px-2 py-1 rounded border bg-blue-600 text-white" onClick={runNow}>
                    Run Now
                </button>
            </div>
        </div>
    );
}