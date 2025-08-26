'use client';
/**
 * ActionsPanel
 * - 선택 노드의 이벤트별(Action) 스텝을 구성/실행
 * - when 조건식(WhenBuilder) 토글 제공
 *
 * 규약:
 * - 훅은 최상위에서만 호출 (조기 return 이후 X)
 * - any 금지
 * - 스토어 갱신은 얕은 복사 규약(updateNodeProps / update) 사용
 */

import React from 'react';
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
    { steps: ActionStep[]; when?: { expr: string } }
>;

export function ActionsPanel() {
    // 1) 훅: 항상 최상위 고정 호출
    const state = useEditor(); // useSyncExternalStore 내부 사용
    const [evt, setEvt] = React.useState<SupportedEvent>('onClick');
    const [editingWhen, setEditingWhen] = React.useState<boolean>(false);
    const [navPageId, setNavPageId] = React.useState<string>(state.project.pages[0]?.id ?? '');
    const [openFragId, setOpenFragId] = React.useState<string>(state.project.fragments[0]?.id ?? '');

    // 2) 파생값: 훅 이후 "변수"로 계산 (훅 추가 금지)
    const nodeId = state.ui.selectedId;
    const node = nodeId ? state.project.nodes[nodeId] : undefined;

    const actions = (node?.props as Record<string, unknown> | undefined)?.__actions as
        | ActionsBag
        | undefined;

    const steps: ActionStep[] = actions?.[evt]?.steps ?? [];
    const whenExpr: string | undefined = actions?.[evt]?.when?.expr;

    // 3) 이벤트 선택 보정: 현재 evt가 목록에 없으면 첫 항목으로 보정
    React.useEffect(() => {
        if (!SUPPORTED_EVENTS.includes(evt)) {
            setEvt(SUPPORTED_EVENTS[0] ?? 'onClick');
        }
    }, [evt]);

    // 4) 저장기 (steps/when)
    const setSteps = (next: ActionStep[]) => {
        if (!nodeId) return;
        const nextBag: ActionsBag = {
            ...(actions ?? ({} as ActionsBag)),
            [evt]: { steps: next, when: actions?.[evt]?.when },
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

    // 5) 스텝 추가/삭제
    const addAlert = () => setSteps([...steps, { kind: 'Alert', message: 'Hello' }]);
    const addNavigate = () => setSteps([...steps, { kind: 'Navigate', toPageId: navPageId }]);
    const addOpenFragment = () => setSteps([...steps, { kind: 'OpenFragment', fragmentId: openFragId }]);
    const addCloseFragment = () => setSteps([...steps, { kind: 'CloseFragment' }]); // top-of-stack close
    const removeStep = (idx: number) => setSteps(steps.filter((_, i) => i !== idx));

    // 6) Run Now (현재 state에서 즉시 실행) — when 조건 평가 후 실행
    const runNow = async () => {
        if (!nodeId || !node) return;

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

    // 7) 선택 노드 없을 때 안내 (훅 호출 뒤 분기 — Rules of Hooks 안전)
    if (!nodeId || !node) {
        return (
            <div className="p-3 text-sm text-neutral-600">
                노드를 선택하세요
            </div>
        );
    }

    // 8) 뷰
    return (
        <div className="flex flex-col gap-3 p-3">
            {/* 헤더: 이벤트 선택 + 조건 토글 */}
            <div className="flex items-center gap-2">
                <div className="font-medium">Actions</div>
                <select
                    className="border rounded px-2 py-1"
                    value={evt}
                    onChange={(e) => setEvt(e.target.value as SupportedEvent)}
                >
                    {SUPPORTED_EVENTS.map((e) => (
                        <option key={e} value={e}>
                            {e}
                        </option>
                    ))}
                </select>

                <button
                    className={`ml-auto border rounded px-2 py-1 ${editingWhen ? 'bg-amber-100' : ''}`}
                    onClick={() => setEditingWhen((v) => !v)}
                    title="이 이벤트의 실행 조건(when)을 편집"
                >
                    조건
                </button>
            </div>

            {/* 조건(when) 빌더 — 토글 렌더 */}
            {editingWhen && (
                <div className="border rounded p-2">
                    <WhenBuilder value={whenExpr} onChange={setWhen} previewNodeId={nodeId} />
                </div>
            )}

            {/* 현재 스텝 목록 */}
            <div className="flex flex-col gap-2">
                {steps.length === 0 && (
                    <div className="text-neutral-500 text-sm">스텝이 없습니다. 아래 컨트롤로 추가하세요.</div>
                )}
                {steps.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                        <div className="min-w-[96px] font-mono">{s.kind}</div>
                        {s.kind === 'Alert' && <div>“{s.message}”</div>}
                        {s.kind === 'Navigate' && <div>→ {s.toPageId}</div>}
                        {s.kind === 'OpenFragment' && <div>open: {s.fragmentId}</div>}
                        {s.kind === 'CloseFragment' && <div>close {s.fragmentId ?? '(top)'} </div>}
                        <button
                            className="ml-auto border rounded px-2 py-1"
                            onClick={() => removeStep(i)}
                        >
                            삭제
                        </button>
                    </div>
                ))}
            </div>

            {/* 컨트롤: 대상 선택 + 스텝 추가 */}
            <div className="flex items-center gap-2">
                <div className="text-sm text-neutral-600">Navigate</div>
                <SelectPage value={navPageId} onChange={setNavPageId} />
                <button className="border rounded px-2 py-1" onClick={addNavigate}>
                    + Navigate
                </button>
            </div>

            <div className="flex items-center gap-2">
                <div className="text-sm text-neutral-600">Fragment</div>
                <SelectFragment value={openFragId} onChange={setOpenFragId} />
                <button className="border rounded px-2 py-1" onClick={addOpenFragment}>
                    + OpenFragment
                </button>
                <button className="border rounded px-2 py-1" onClick={addCloseFragment}>
                    + CloseFragment
                </button>
            </div>

            {/* 실행 */}
            <div className="flex">
                <button className="ml-auto border rounded px-3 py-1" onClick={runNow}>
                    Run Now
                </button>
            </div>
        </div>
    );
}