'use client';

/**
 * ActionsPanel
 * - UI/레이아웃/텍스트: 기존 그대로
 * - 핵심 수정:
 *   1) steps useMemo 제거 → 매 렌더마다 직접 읽기 (stale 방지)
 *   2) setSteps는 state.update로 node.props 재할당(렌더 보장)
 *   3) Run은 항상 최신 steps를 즉시 읽어 실행
 */

import * as React from 'react';
import { useActionsController } from '../../../controllers/ActionsController';
import { editorStore } from '../../../store/editStore';
import { runActions } from '../../../runtime/actions';
import { getDefinition } from '../../../core/registry';
import type { SupportedEvent, ActionStep, NodeId, EditorState } from '../../../core/types';

const EVENTS: SupportedEvent[] = ['onLoad', 'onClick', 'onChange', 'onSubmit'];
type ActionsBag = Partial<Record<SupportedEvent, { steps: ActionStep[] }>>;
type Scope = 'Page' | 'Fragment' | 'Component';

function isSetProps(step: ActionStep): step is Extract<ActionStep, { kind: 'SetProps' }> {
    return step.kind === 'SetProps';
}

/** 안전한 dynamicTag 읽기 */
function readDynamicTag(def: any) {
    const dyn = def?.capabilities;
    const allowed: string[] = Array.isArray(dyn?.allowedTags) ? dyn!.allowedTags : [];
    const defaultTag: string = typeof dyn?.defaultTag === 'string' ? dyn!.defaultTag : 'div';
    return { allowed, defaultTag };
}

/* ───────────── Component: Tag 전환(동적) ───────────── */
function TagSwitchRow({ nodeId, event }: { nodeId: NodeId; event: SupportedEvent }) {
    const ctl = useActionsController();

    const node = state.project.nodes[nodeId];

    const def = getDefinition(node.componentId);
    const { allowed, defaultTag } = readDynamicTag(def as any);

    const currentTag = String((node.props as Record<string, unknown>).__tag ?? defaultTag);
    const [sel, setSel] = React.useState(currentTag);

    React.useEffect(() => {
        setSel(currentTag);
    }, [nodeId, currentTag]);

    const readSteps = (): ActionStep[] => {
        const bag = (node.props as Record<string, unknown>).__actions as ActionsBag | undefined;
        return bag?.[event]?.steps ?? [];
    };

    const writeSteps = (next: ActionStep[]) => {
        actionsAdapter.update((s: EditorState) => {
            const p = s.project.nodes[nodeId].props as Record<string, unknown>;
            const bag = (p.__actions as ActionsBag | undefined) ?? {};
            bag[event] = { steps: next };
            // ✅ 명시 재할당(렌더 보장)
            (s.project.nodes[nodeId] as any).props = { ...p, __actions: bag };
        });
    };

    const add = () => {
        if (!sel) return;
        const steps = readSteps();
        const patch = { __tag: sel };
        const next: ActionStep = { kind: 'SetProps', nodeId, patch };
        const dup = steps.some(
            (s) => isSetProps(s) && s.nodeId === nodeId && JSON.stringify(s.patch) === JSON.stringify(patch),
        );
        if (dup) return;
        writeSteps([...steps, next]);
    };

    if (allowed.length <= 1) return null;

    return (
        <div className="flex items-center gap-2 px-1">
            <div className="text-xs w-24 shrink-0 text-neutral-500">Tag</div>
            <select className="text-[11px] border rounded px-2 py-1" value={sel} onChange={(e) => setSel(e.target.value)}>
                {allowed.map((t) => (
                    <option key={t} value={t}>
                        {t}
                    </option>
                ))}
            </select>
            <button className="px-2 py-1 text-[11px] rounded border hover:bg-neutral-50" onClick={add}>
                Set
            </button>
        </div>
    );
}

/* ───────────── Component: Attributes(동적) ───────────── */
function NodeAttrsDynamicSection({ nodeId, event }: { nodeId: NodeId; event: SupportedEvent }) {
    const actionsAdapter = useActionsAdapter();

    const node = actionsAdapter.project.nodes[nodeId];
    const props = (node.props ?? {}) as Record<string, unknown>;
    const tagAttrs = (props.__tagAttrs as Record<string, string> | undefined) ?? {};

    const [exprMap, setExprMap] = React.useState<Record<string, string>>({});
    React.useEffect(() => {
        const init: Record<string, string> = {};
        Object.entries(tagAttrs).forEach(([k, v]) => (init[k] = typeof v === 'string' ? v : ''));
        setExprMap(init);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodeId]);

    const setExpr = (k: string, v: string) => setExprMap((m) => (m[k] === v ? m : { ...m, [k]: v }));

    const readSteps = (): ActionStep[] => {
        const bag = (props.__actions as ActionsBag | undefined) ?? undefined;
        return bag?.[event]?.steps ?? [];
    };

    const writeSteps = (next: ActionStep[]) => {
        actionsAdapter.update((s: EditorState) => {
            const p = s.project.nodes[nodeId].props as Record<string, unknown>;
            const bag = (p.__actions as ActionsBag | undefined) ?? {};
            bag[event] = { steps: next };
            (s.project.nodes[nodeId] as any).props = { ...p, __actions: bag };
        });
    };

    const addSetAttr = (key: string, value: string) => {
        const steps = readSteps();
        const prev = (props.__tagAttrs as Record<string, string> | undefined) ?? {};
        const patch = { __tagAttrs: { ...prev, [key]: value } };
        const next: ActionStep = { kind: 'SetProps', nodeId, patch };
        const dup = steps.some(
            (s) => isSetProps(s) && s.nodeId === nodeId && JSON.stringify(s.patch) === JSON.stringify(patch),
        );
        if (dup) return;
        writeSteps([...steps, next]);
    };

    const keys = Object.keys(tagAttrs);
    if (keys.length === 0) {
        return <div className="text-[11px] text-neutral-400">Tag Attributes 없음(정적 속성은 Inspector › props에서 추가)</div>;
    }

    return (
        <div className="space-y-2 px-1">
            <div className="text-[11px] text-neutral-500 mb-1">
                값은 일반 문자열 또는 머스태치 <code>{'{{ expr }}'}</code> 사용 가능
            </div>
            {keys.map((k) => {
                const cur = exprMap[k] ?? '';
                return (
                    <div key={k} className="flex items-center gap-2">
                        <div className="text-xs w-24 shrink-0 text-neutral-500">{k}</div>
                        <input
                            className="text-[11px] border rounded px-2 py-1 flex-1"
                            value={cur}
                            onChange={(e) => setExpr(k, e.target.value)}
                            placeholder="e.g. /path or {{ data.link }}"
                        />
                        <button
                            className="px-2 py-1 text-[11px] rounded border hover:bg-neutral-50"
                            onClick={() => addSetAttr(k, cur)}
                            type="button"
                            title="이 값으로 SetProps 스텝 추가"
                        >
                            Set
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

/* ───────────── 메인 패널 ───────────── */
export function ActionsPanel() {
    const actionsAdapter = useActionsAdapter();
    const [scope, setScope] = React.useState<Scope>('Component');

    // 선택 컨텍스트
    const nodeId = actionsAdapter.ui.selectedId ?? null;

    // Component 스코프만 실동작
    const [evt, setEvt] = React.useState<SupportedEvent>('onClick');

    // ✅ 메모 제거: 항상 최신 값을 직접 읽음
    const readStepsNow = React.useCallback((): ActionStep[] => {
        if (!nodeId || scope !== 'Component') return [];
        const node = actionsAdapter.project.nodes[nodeId];
        const bag = (node.props as Record<string, unknown>).__actions as ActionsBag | undefined;
        return bag?.[evt]?.steps ?? [];
    }, [nodeId, scope, evt, actionsAdapter.project.nodes]);

    const setSteps = (next: ActionStep[]) => {
        if (!nodeId) return;
        actionsAdapter.update((s: EditorState) => {
            const p = s.project.nodes[nodeId].props as Record<string, unknown>;
            const bag = (p.__actions as ActionsBag | undefined) ?? {};
            bag[evt] = { steps: next };
            (s.project.nodes[nodeId] as any).props = { ...p, __actions: bag };
        });
    };

    const addAlert = () => setSteps([...(readStepsNow() ?? []), { kind: 'Alert', message: 'Hello' }]);
    const addNavigate = () =>
        setSteps([
            ...(readStepsNow() ?? []),
            { kind: 'Navigate', toPageId: actionsAdapter.project.pages[0]?.id ?? actionsAdapter.project.rootId },
        ]);

    const runNow = async () => {
        const steps = readStepsNow(); // ✅ 최신 스텝 즉시 읽기
        if (steps.length === 0) {
            actionsAdapter.setNotification?.('No steps.');
            return;
        }
        await runActions(steps, {
            alert: (m) => (typeof window !== 'undefined' && window.alert ? window.alert(m) : console.info('[Alert]', m)),
            setData: (p, v) => editorStore.getState().setData(p, v),
            setProps: (nid, patch) => editorStore.getState().updateNodeProps(nid, patch as Record<string, unknown>),
            navigate: (pid) => editorStore.getState().selectPage(pid),
            openFragment: () => {},
            closeFragment: () => {},
            http: async (m, url, body, headers) => {
                const res = await fetch(url, {
                    method: m,
                    headers: headers as any,
                    body: body ? JSON.stringify(body) : undefined,
                });
                try {
                    return await res.json();
                } catch {
                    return await res.text();
                }
            },
            emit: () => {},
        });
    };

    const steps = readStepsNow();

    return (
        <div className="p-2 space-y-3">
            <div className="flex items-center gap-1">
                {(['Page', 'Fragment', 'Component'] as Scope[]).map((s) => (
                    <button
                        key={s}
                        type="button"
                        className={`text-[11px] px-2 py-1 border rounded ${scope === s ? 'bg-neutral-100' : 'hover:bg-neutral-50'}`}
                        onClick={() => setScope(s)}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {/* Page/Fragment: 이후 단계에서 연결 */}
            {scope !== 'Component' && (
                <div className="text-[11px] text-neutral-500">{scope} 액션은 향후 단계에서 Flows/Fragments와 통합됩니다.</div>
            )}

            {/* Component scope */}
            {scope === 'Component' && (
                <>
                    {!nodeId && <div className="text-[11px] text-neutral-400">노드를 선택하세요.</div>}
                    {nodeId && (
                        <>
                            {/* 이벤트 선택 */}
                            <div className="flex items-center gap-2">
                                <select
                                    className="text-[11px] border rounded px-2 py-1"
                                    value={evt}
                                    onChange={(e) => setEvt(e.target.value as SupportedEvent)}
                                >
                                    {EVENTS.map((e) => (
                                        <option key={e} value={e}>
                                            {e}
                                        </option>
                                    ))}
                                </select>
                                <span className="text-[11px] text-neutral-500">이벤트별 액션을 구성합니다.</span>

                                <button className="px-2 py-1 text-[11px] rounded border hover:bg-neutral-50" onClick={runNow} disabled={!nodeId || steps.length === 0}>
                                    Run Now
                                </button>
                            </div>

                            {/* 스텝 목록 */}
                            {(steps?.length ?? 0) === 0 && (
                                <div className="p-2 text-[11px] text-neutral-400">스텝이 없습니다. 아래 버튼으로 추가하세요.</div>
                            )}
                            {(steps ?? []).map((s, i) => (
                                <div key={i} className="flex items-center justify-between px-2 py-1 border rounded mb-1">
                                    <div className="text-[11px]">
                                        {s.kind}{' '}
                                        {s.kind === 'Alert' && `“${(s as Extract<ActionStep, { kind: 'Alert' }>).message}”`}
                                        {s.kind === 'Navigate' && `→ ${(s as Extract<ActionStep, { kind: 'Navigate' }>).toPageId}`}
                                        {isSetProps(s) && ` (SetProps ${(s as Extract<ActionStep, { kind: 'SetProps' }>).nodeId})`}
                                    </div>
                                    <button
                                        className="px-2 py-1 text-[11px] rounded border hover:bg-neutral-50"
                                        onClick={() => setSteps((steps ?? []).filter((_, idx) => idx !== i))}
                                        type="button"
                                    >
                                        삭제
                                    </button>
                                </div>
                            ))}

                            {/* 기본 추가 & 실행 */}
                            <div className="flex items-center gap-2">
                                <button className="px-2 py-1 text-[11px] rounded border hover:bg-neutral-50" onClick={addAlert}>
                                    + Alert
                                </button>
                                <button className="px-2 py-1 text-[11px] rounded border hover:bg-neutral-50" onClick={addNavigate}>
                                    + Navigate
                                </button>
                                <button className="px-2 py-1 text-[11px] rounded border hover:bg-neutral-50" onClick={runNow} disabled={!nodeId || steps.length === 0}>
                                    Run Now
                                </button>
                            </div>

                            {/* 동적 Tag 전환 & 동적 Attributes */}
                            <div className="pt-2 border-t space-y-2">
                                <TagSwitchRow nodeId={nodeId} event={evt} />
                                <NodeAttrsDynamicSection nodeId={nodeId} event={evt} />
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}