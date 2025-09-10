'use client';
/**
 * ActionsPanel (Scope 구조 반영)
 * - 상단 스코프 탭: Page / Fragment / Component
 * - (현 단계) Component 스코프만 실동작:
 *   · 이벤트(onLoad/onClick/onChange/onSubmit) 선택
 *   · Step 목록/추가/삭제
 *   · Tag 전환(동적) + Tag Attributes(동적) → SetProps 스텝으로 추가
 * - Page/Fragment 스코프는 골격만(향후 Flows·FragmentsPanel 연계)
 */
import * as React from 'react';
import {getDefinition} from '../../../core/registry';
import type {ActionStep, EditorState, Node, NodeId, Page, SupportedEvent} from '../../../core/types';
import {BottomDomain, useBottomControllerFactory} from '@/figmaV3/controllers/bottom/BottomControllerFactory';

const EVENTS: SupportedEvent[] = ['onLoad', 'onClick', 'onChange', 'onSubmit'];
type ActionsBag = Partial<Record<SupportedEvent, { steps: ActionStep[] }>>;
type Scope = 'Page' | 'Fragment' | 'Component';

/* 공통 유틸 */
function isSetProps(step: ActionStep): step is Extract<ActionStep, { kind: 'SetProps' }> {
    return step.kind === 'SetProps';
}

/* ───────────── Component: Tag 전환(동적) ───────────── */
function TagSwitchRow({
                          node,
                          event,
                          readSteps,
                          writeSteps,
                      }: {
    node: Node;
    event: SupportedEvent;
    readSteps: () => ActionStep[];
    writeSteps: (next: ActionStep[]) => void;
}) {
    const def = React.useMemo(() => getDefinition(node.componentId), [node.componentId]);
    const allowed = def?.capabilities?.allowedTags ?? [];

    const currentTag = React.useMemo(() => {
        const props = (node?.props ?? {}) as Record<string, unknown>;
        const defTag = (def as any)?.capabilities?.defaultTag ?? '';
        return String((props.__tag as string | undefined) ?? defTag ?? '');
    }, [node?.props, def]);

    const [sel, setSel] = React.useState<string>(currentTag);
    React.useEffect(() => setSel(currentTag), [currentTag]);

    const add = () => {
        if (!sel) return;
        const steps = readSteps();
        const patch = { __tag: sel };
        const next: ActionStep = { kind: 'SetProps', nodeId: node.id, patch };
        const dup = steps.some(
            (s) => isSetProps(s) && s.nodeId === node.id && JSON.stringify(s.patch) === JSON.stringify(patch),
        );
        if (dup) return;
        writeSteps([...steps, next]);
    };

    if (allowed.length <= 1) return null;

    return (
        <div className="flex items-center gap-2 px-1">
            <div className="text-xs w-24 shrink-0 text-neutral-500">Tag</div>
            <select
                className="text-[11px] border rounded px-2 py-1"
                value={sel}
                onChange={(e) => setSel(e.target.value)}
            >
                {allowed.map((t) => (
                    <option key={t} value={t}>
                        {t}
                    </option>
                ))}
            </select>
            <button
                type="button"
                className="text-[11px] px-2 py-1 border rounded hover:bg-neutral-50"
                onClick={add}
                title="선택한 태그로 SetProps 스텝 추가"
            >
                Set
            </button>
        </div>
    );
}

/* ───────────── Component: Attributes(동적) ───────────── */
function NodeAttrsDynamicSection({
                                     node,
                                     event,
                                     readSteps,
                                     writeSteps,
                                 }: {
    node: Node;
    event: SupportedEvent;
    readSteps: () => ActionStep[];
    writeSteps: (next: ActionStep[]) => void;
}) {
    const props = (node?.props ?? {}) as Record<string, any>;
    const tagAttrs = (props.__tagAttrs as Record<string, string> | undefined) ?? {};
    const [exprMap, setExprMap] = React.useState<Record<string, string>>({});

    React.useEffect(() => {
        const init: Record<string, string> = {};
        Object.entries(tagAttrs).forEach(([k, v]) => (init[k] = typeof v === 'string' ? v : ''));
        setExprMap(init);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [node.id, JSON.stringify(tagAttrs)]);

    const setExpr = (k: string, v: string) => setExprMap((m) => (m[k] === v ? m : { ...m, [k]: v }));

    const addSetAttr = (key: string, value: string) => {
        const steps = readSteps();
        const patch = { __tagAttrs: { ...(props.__tagAttrs as Record<string, string> ?? {}), [key]: value } };
        const next: ActionStep = { kind: 'SetProps', nodeId: node.id, patch };
        const dup = steps.some(
            (s) => isSetProps(s) && s.nodeId === node.id && JSON.stringify(s.patch) === JSON.stringify(patch),
        );
        if (dup) return;
        writeSteps([...steps, next]);
    };

    const keys = Object.keys(tagAttrs);
    if (keys.length === 0) {
        return (
            <div className="text-[11px] text-neutral-400 px-1">
                Tag Attributes 없음(정적 속성은 Inspector › props에서 추가)
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="text-[11px] font-semibold text-neutral-700 px-1">Attributes (Dynamic)</div>
            <div className="text-[11px] text-neutral-500 px-1 -mt-1">
                값은 일반 문자열 또는 머스태치 <code>{'{{ expr }}'}</code> 사용 가능
            </div>
            {keys.map((k) => {
                const cur = exprMap[k] ?? '';
                return (
                    <div key={k} className="flex items-center gap-2 px-1">
                        <div className="text-xs w-24 text-neutral-500 truncate" title={k}>
                            {k}
                        </div>
                        <input
                            className="text-[11px] border rounded px-2 py-1 flex-1"
                            value={cur}
                            onChange={(e) => setExpr(k, e.target.value)}
                            placeholder="e.g. /path or {{ data.link }}"
                        />
                        <button
                            className="text-[11px] px-2 py-1 border rounded hover:bg-neutral-50"
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
    const { reader, writer } = useBottomControllerFactory(BottomDomain.Actions);

    // 스냅샷
    const ui = reader.getUI();
    const project = reader.getProject();

    const [scope, setScope] = React.useState<Scope>('Component');

    // 선택 컨텍스트
    const selectedNodeId: NodeId | null = (ui.selectedId as NodeId) ?? null;
    const node: Node | null = selectedNodeId ? (project.nodes[selectedNodeId] as Node) ?? null : null;

    // Component 스코프만 실동작
    const [evt, setEvt] = React.useState<SupportedEvent>('onClick');

    // steps 읽기/쓰기 helper (node/evt에 의존)
    const readSteps = React.useCallback((): ActionStep[] => {
        if (!node) return [];
        const bag = ((node.props as any)?.__actions as ActionsBag | undefined) ?? {};
        return (bag[evt]?.steps as ActionStep[]) ?? [];
    }, [node, evt]);

    const writeSteps = React.useCallback(
        (next: ActionStep[]) => {
            if (!node) return;
            writer.update((s: EditorState) => {
                const n = s.project.nodes[node.id] as Node;
                const props = (n.props ?? {}) as Record<string, unknown>;
                const bag = (props.__actions as ActionsBag | undefined) ?? {};
                const cur = bag[evt]?.steps ?? [];
                if (JSON.stringify(cur) === JSON.stringify(next)) return; // 불필요 갱신 방지
                const newBag: ActionsBag = { ...bag, [evt]: { steps: next } };
                (n.props as any) = { ...props, __actions: newBag };
            });
        },
        [node, evt, writer],
    );

    const steps: ActionStep[] = React.useMemo(() => (node && scope === 'Component' ? readSteps() : []), [
        node,
        scope,
        readSteps,
    ]);

    const setSteps = (next: ActionStep[]) => writeSteps(next);

    const addAlert = () => setSteps([...(steps ?? []), { kind: 'Alert', message: 'Hello' }]);

    const addNavigate = () => {
        const firstPageId =
            (project.pages?.[0]?.id as string | undefined) ??
            project.pages.find((p: Page) => p.rootId === project.rootId)?.id ??
            '';
        setSteps([...(steps ?? []), { kind: 'Navigate', toPageId: firstPageId } as ActionStep]);
    };

    const runNow = () => {
        if (!node) return;
        // 지원 시 런타임 실행, 아니면 알림
        if ((writer as any).runActionSteps) {
            (writer as any).runActionSteps(node.id, evt);
        } else if ((writer as any).setNotification) {
            (writer as any).setNotification('Run Now executed.');
        }
    };

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

            {scope !== 'Component' && (
                <div className="text-[11px] text-neutral-500">
                    {scope} 액션은 향후 단계에서 Flows/Fragments와 통합됩니다.
                </div>
            )}

            {scope === 'Component' && (
                <>
                    {!node && <div className="text-[11px] text-neutral-400">노드를 선택하세요.</div>}
                    {node && (
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
                                <div className="text-[11px] text-neutral-500">이벤트별 액션을 구성합니다.</div>
                            </div>

                            {/* 스텝 목록 */}
                            {(steps?.length ?? 0) === 0 && (
                                <div className="text-[11px] text-neutral-400">스텝이 없습니다. 아래 버튼으로 추가하세요.</div>
                            )}
                            <div className="space-y-1">
                                {(steps ?? []).map((s, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between border rounded px-2 py-1 text-[11px]"
                                    >
                                        <div className="truncate">
                                            <span className="font-semibold">{s.kind}</span>{' '}
                                            {s.kind === 'Alert' && `“${(s as any).message}”`}
                                            {s.kind === 'Navigate' && `→ ${(s as any).toPageId}`}
                                            {isSetProps(s) && ` (SetProps ${s.nodeId})`}
                                        </div>
                                        <button
                                            className="text-[11px] px-2 py-1 border rounded hover:bg-neutral-50"
                                            onClick={() => setSteps((steps ?? []).filter((_, idx) => idx !== i))}
                                            type="button"
                                        >
                                            삭제
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* 기본 추가 & 실행 */}
                            <div className="flex items-center gap-2">
                                <button
                                    className="text-[11px] px-2 py-1 border rounded hover:bg-neutral-50"
                                    onClick={addAlert}
                                    type="button"
                                >
                                    + Alert
                                </button>
                                <button
                                    className="text-[11px] px-2 py-1 border rounded hover:bg-neutral-50"
                                    onClick={addNavigate}
                                    type="button"
                                >
                                    + Navigate
                                </button>
                                <button
                                    className="ml-auto text-[11px] px-2 py-1 border rounded hover:bg-neutral-50"
                                    onClick={runNow}
                                    type="button"
                                >
                                    Run Now
                                </button>
                            </div>

                            {/* 동적 Tag 전환 & 동적 Attributes */}
                            <div className="pt-2 border-t space-y-2">
                                <TagSwitchRow node={node} event={evt} readSteps={readSteps} writeSteps={writeSteps} />
                                <NodeAttrsDynamicSection
                                    node={node}
                                    event={evt}
                                    readSteps={readSteps}
                                    writeSteps={writeSteps}
                                />
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}