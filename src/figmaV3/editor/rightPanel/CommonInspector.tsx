'use client';

import * as React from 'react';
import { Database, Plus } from 'lucide-react';

import { getDefinition } from '../../core/registry';
import type { NodeId, ComponentDefinition } from '../../core/types';
import { RightDomain, useRightControllerFactory } from '../../controllers/right/RightControllerFactory';
import { DataBindingPopover } from './sections/DataBindingPopover';

// StyleInspector 공용 UI
import {
    SectionFrame,
    GroupHeader,
    RowShell,
    LeftCell,
    RightCell,
} from './styleInspector/ui';

type AttrMap = Record<string, string>;

type Entry =
    | { key: string; type: 'text'; label?: string }
    | { key: string; type: 'select'; label?: string; options?: unknown[] };

// Select 옵션 key 충돌 방지용 정규화
function normOpt(op: unknown): { value: string; label: string } {
    if (op == null) return { value: '', label: '' };
    if (typeof op === 'object') {
        const any = op as any;
        const v =
            any?.value != null
                ? String(any.value)
                : (() => {
                    try {
                        return JSON.stringify(any);
                    } catch {
                        return String(any);
                    }
                })();
        const l =
            (typeof any.label === 'string' && any.label) ||
            (typeof any.label === 'object' && (any.label.ko || any.label.en)) ||
            v;
        return { value: v, label: String(l) };
    }
    const v = String(op);
    return { value: v, label: v };
}

export function CommonInspector(props: {
    nodeId: NodeId;
    defId: string;
    open?: boolean;
    onToggle?: () => void;
}) {
    const { nodeId, defId } = props;
    const { reader, writer } = useRightControllerFactory(RightDomain.Inspector);

    // SectionFrame은 collapsed 플래그 사용
    const [collapsed, setCollapsed] = React.useState<boolean>(props.open === undefined ? false : !props.open);
    const notifyToggle = props.onToggle ?? (() => {});

    const project = reader.getProject();
    const node = project.nodes[nodeId];
    if (!node) return null;

    const def = getDefinition(defId) as ComponentDefinition | undefined;
    const propsObj = (node.props ?? {}) as Record<string, unknown>;

    // ─────────────────────────────────────────────────────────────
    // 일반(공통) 입력 상태 (id/name/slotId)
    // ─────────────────────────────────────────────────────────────
    const initialAttrs = (propsObj.__tagAttrs as AttrMap | undefined) ?? {};
    const [elemId, setElemId] = React.useState(String(initialAttrs.id ?? node.id));
    const [name, setName] = React.useState(String(propsObj.name ?? ''));
    const [slotId, setSlotId] = React.useState(String(propsObj.slotId ?? ''));

    // nodeId 변경 시 동기화
    React.useEffect(() => {
        const pj = reader.getProject();
        const n = pj.nodes[nodeId];
        if (!n) return;

        const p = (n.props ?? {}) as Record<string, unknown>;
        const a = (p.__tagAttrs as AttrMap | undefined) ?? {};

        const nextElemId = String((a.id as string | undefined) ?? n.id ?? '');
        const nextName = String((p as any).name ?? '');
        const nextSlotId = String((p as any).slotId ?? '');

        setElemId((prev) => (Object.is(prev, nextElemId) ? prev : nextElemId));
        setName((prev) => (Object.is(prev, nextName) ? prev : nextName));
        setSlotId((prev) => (Object.is(prev, nextSlotId) ? prev : nextSlotId));
    }, [nodeId, reader]);

    // 저장(일반)
    const saveBasic = React.useCallback(() => {
        // name/slotId
        writer.updateNodeProps(nodeId, { name, slotId });

        // attrs(id)
        const curAttrs = ((reader.getProject().nodes[nodeId].props ?? {}) as any).__tagAttrs as AttrMap | undefined;
        const next: AttrMap = { ...(curAttrs ?? {}) };

        const trimmed = elemId.trim();
        if (trimmed.length > 0) next.id = trimmed;
        else delete next.id;

        writer.updateNodeProps(nodeId, { __tagAttrs: next });
    }, [nodeId, name, slotId, elemId, reader, writer]);

    // ─────────────────────────────────────────────────────────────
    // 태그 & 속성
    // ─────────────────────────────────────────────────────────────
    const allowedTagsFromDef = (def as any)?.capabilities?.allowedTags as string[] | undefined;
    const defaultTagFromDef = (def as any)?.capabilities?.defaultTag as string | undefined;
    const isContainerDef = !!(def as any)?.capabilities?.canHaveChildren;

    const CONTAINER_TAGS = React.useMemo(() => ['div', 'section', 'article', 'ul', 'ol'], []);
    const selectableTags: string[] = React.useMemo(() => {
        const base =
            allowedTagsFromDef && allowedTagsFromDef.length > 0
                ? allowedTagsFromDef
                : [defaultTagFromDef ?? 'div'];
        if (!isContainerDef) {
            return base.filter((t) => !CONTAINER_TAGS.includes(t));
        }
        return base;
    }, [allowedTagsFromDef, defaultTagFromDef, isContainerDef, CONTAINER_TAGS]);

    const currentTag = String(
        ((node.props ?? {}) as any).__tag ?? (defaultTagFromDef ?? (selectableTags[0] ?? 'div')),
    );

    // 자동 schema 엔트리(기존 PropsAutoSection 로직 호환)
    const schema = (def?.propsSchema ?? []) as any[];
    const baseEntries = React.useMemo(() => {
        const entries: Entry[] = [];
        for (const f of schema) {
            if (!f || !f.key) continue;
            const key = String(f.key);
            if (f.type === 'string') {
                entries.push({ key, type: 'text', label: f.label ?? key });
            } else if (f.type === 'select') {
                const options = Array.isArray(f.options) ? f.options : [];
                entries.push({ key, type: 'select', label: f.label ?? key, options });
            }
        }
        return entries;
    }, [schema]);

    const visibleEntries = React.useMemo(() => baseEntries, [baseEntries]);

    // 그룹 락 (StyleInspector 방식)
    const [lockedTagGroup, setLockedTagGroup] = React.useState(false);
    const toggleTagGroupLock = React.useCallback(() => setLockedTagGroup((v) => !v), []);

    // 바인딩 팝오버
    const [binding, setBinding] = React.useState<{ propKey: string; anchorEl: HTMLElement } | null>(null);

    // Attrs
    const attrsObj = (((node.props ?? {}) as any).__tagAttrs ?? {}) as AttrMap;
    const attrsList = React.useMemo(
        () => Object.entries(attrsObj).map(([k, v]) => ({ k: String(k), v: String(v) })),
        [attrsObj],
    );

    // Attrs 입력행 상태
    const [newKey, setNewKey] = React.useState('');
    const [newVal, setNewVal] = React.useState('');

    const addAttr = () => {
        const k = newKey.trim();
        if (!k) return;
        const next: AttrMap = { ...attrsObj, [k]: newVal };
        writer.updateNodeProps(nodeId, { __tagAttrs: next });
        setNewKey('');
        setNewVal('');
    };

    const removeAttr = (k: string) => {
        const next: AttrMap = { ...attrsObj };
        delete next[k];
        writer.updateNodeProps(nodeId, { __tagAttrs: next });
    };

    const updateAttrKey = (oldK: string, newK: string) => {
        const k2 = newK.trim();
        if (!k2 || k2 === oldK) return;
        const next: AttrMap = { ...attrsObj };
        const val = next[oldK];
        delete next[oldK];
        next[k2] = val;
        writer.updateNodeProps(nodeId, { __tagAttrs: next });
    };

    const updateAttrVal = (k: string, v: string) => {
        const next: AttrMap = { ...attrsObj, [k]: v };
        writer.updateNodeProps(nodeId, { __tagAttrs: next });
    };

    return (
        <div className="mt-4">
            <SectionFrame
                title="공통"
                collapsed={collapsed}
                onToggle={() => {
                    setCollapsed((c) => !c);
                    notifyToggle();
                }}
            >
                {/* ───────────────────── 서브 그룹: 일반 ───────────────────── */}
                <div className="border-b border-neutral-200">
                    <GroupHeader label="일반" />

                    {/* id */}
                    <RowShell>
                        <LeftCell title="id" />
                        <RightCell>
                            <input
                                className="h-6 px-1 border border-neutral-200 rounded text-[11px] w-full min-w-0"
                                value={elemId}
                                onChange={(e) => setElemId(e.target.value)}
                                onBlur={saveBasic}
                                placeholder="element id"
                                title="id"
                            />
                        </RightCell>
                    </RowShell>

                    {/* name */}
                    <RowShell>
                        <LeftCell title="name" />
                        <RightCell>
                            <input
                                className="h-6 px-1 border border-neutral-200 rounded text-[11px] w-full min-w-0"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onBlur={saveBasic}
                                placeholder="friendly name"
                                title="name"
                            />
                        </RightCell>
                    </RowShell>

                    {/* slotId */}
                    <RowShell>
                        <LeftCell title="slotId" />
                        <RightCell>
                            <input
                                className="h-6 px-1 border border-neutral-200 rounded text-[11px] w-full min-w-0"
                                value={slotId}
                                onChange={(e) => setSlotId(e.target.value)}
                                onBlur={saveBasic}
                                placeholder="slot identifier"
                                title="slotId"
                            />
                        </RightCell>
                    </RowShell>
                </div>

                {/* ──────────────── 서브 그룹: 태그 & 속성 (잠금 버튼 有) ──────────────── */}
                <div className="border-b border-neutral-200">
                    <GroupHeader
                        label="태그 & 속성"
                        locked={lockedTagGroup}
                        onToggleLock={toggleTagGroupLock}
                    />

                    {/* As(tag) */}
                    <RowShell>
                        <LeftCell title="As (tag)" />
                        <RightCell>
                            <select
                                className="h-6 px-1 border border-neutral-200 rounded text-[11px] w-full min-w-0"
                                title="As(tag)"
                                value={currentTag}
                                onChange={(e) => writer.updateNodeProps(nodeId, { __tag: e.target.value })}
                                disabled={lockedTagGroup}
                            >
                                {selectableTags.map((t, i) => (
                                    <option key={`as:opt:${t}:${i}`} value={t}>
                                        {t}
                                    </option>
                                ))}
                            </select>
                        </RightCell>
                    </RowShell>

                    {/* Auto schema props */}
                    <div key={currentTag}>
                        {visibleEntries.map((entry) => {
                            const value = (node.props as Record<string, unknown>)?.[entry.key];

                            const bindingBtn = (
                                <button
                                    title="bind"
                                    onClick={(e) =>
                                        setBinding({
                                            propKey: entry.key,
                                            anchorEl: e.currentTarget as unknown as HTMLElement,
                                        })
                                    }
                                    className="inline-flex items-center justify-center h-6 w-6 rounded border border-neutral-200 hover:bg-neutral-50"
                                    type="button"
                                >
                                    <Database size={16} />
                                </button>
                            );

                            if (entry.type === 'text') {
                                return (
                                    <RowShell key={`auto:text:${entry.key}`}>
                                        <LeftCell title={entry.label ?? entry.key} />
                                        <RightCell>
                                            <div className="grid grid-cols-10 gap-2 items-center w-full">
                                                <div className="col-span-9">
                                                    <input
                                                        className="h-6 px-1 border border-neutral-200 rounded text-[11px] w-full min-w-0"
                                                        value={(value as string) ?? ''}
                                                        onChange={(e) => writer.updateNodeProps(nodeId, { [entry.key]: e.target.value })}
                                                        placeholder=""
                                                        title={entry.key}
                                                        disabled={lockedTagGroup}
                                                    />
                                                </div>
                                                <div className="col-span-1 flex justify-center">{bindingBtn}</div>
                                            </div>
                                        </RightCell>
                                    </RowShell>
                                );
                            }

                            if (entry.type === 'select') {
                                return (
                                    <RowShell key={`auto:select:${entry.key}`}>
                                        <LeftCell title={entry.label ?? entry.key} />
                                        <RightCell>
                                            <div className="grid grid-cols-10 gap-2 items-center w-full">
                                                <div className="col-span-9">
                                                    <select
                                                        className="h-6 px-1 border border-neutral-200 rounded text-[11px] w-full min-w-0"
                                                        value={(value as string) ?? ''}
                                                        onChange={(e) => writer.updateNodeProps(nodeId, { [entry.key]: e.target.value })}
                                                        title={entry.key}
                                                        disabled={lockedTagGroup}
                                                    >
                                                        {(entry.options ?? []).map((op, i) => {
                                                            const { value: ov, label: ol } = normOpt(op);
                                                            return (
                                                                <option key={`${entry.key}:opt:${ov}:${i}`} value={ov}>
                                                                    {ol}
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                </div>
                                                <div className="col-span-1 flex justify-center">{bindingBtn}</div>
                                            </div>
                                        </RightCell>
                                    </RowShell>
                                );
                            }

                            return null;
                        })}
                    </div>

                    {/* Attrs 입력행: 왼쪽 비우고 오른쪽만 사용 (key/value/+) */}
                    <RowShell>
                        <div className="col-span-2" />
                        <RightCell>
                            <div className="grid grid-cols-10 gap-2 items-center w-full">
                                <div className="col-span-4">
                                    <input
                                        className="h-6 px-1 border border-neutral-200 rounded text-[11px] w-full min-w-0"
                                        placeholder="key"
                                        value={newKey}
                                        onChange={(e) => setNewKey(e.target.value)}
                                        disabled={lockedTagGroup}
                                    />
                                </div>
                                <div className="col-span-4">
                                    <input
                                        className="h-6 px-1 border border-neutral-200 rounded text-[11px] w-full min-w-0"
                                        placeholder="value"
                                        value={newVal}
                                        onChange={(e) => setNewVal(e.target.value)}
                                        disabled={lockedTagGroup}
                                    />
                                </div>
                                <div className="col-span-2 flex justify-end">
                                    <button
                                        className="inline-flex items-center justify-center h-6 w-6 rounded border border-neutral-200 hover:bg-neutral-50"
                                        title="add"
                                        onClick={addAttr}
                                        type="button"
                                        disabled={lockedTagGroup}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        </RightCell>
                    </RowShell>

                    {/* 기존 Attrs 리스트: 왼쪽 비움, 오른쪽에 key input / value input / 삭제 버튼 */}
                    <div className="mt-1">
                        {attrsList.map(({ k, v }) => (
                            <RowShell key={`attr:${k}`}>
                                <div className="col-span-2" />
                                <RightCell>
                                    <div className="grid grid-cols-10 gap-2 items-center w-full">
                                        <div className="col-span-4">
                                            <input
                                                className="h-6 px-1 border border-neutral-200 rounded text-[11px] w-full min-w-0"
                                                value={k}
                                                onChange={(e) => updateAttrKey(k, e.target.value)}
                                                disabled={lockedTagGroup}
                                            />
                                        </div>
                                        <div className="col-span-4">
                                            <input
                                                className="h-6 px-1 border border-neutral-200 rounded text-[11px] w-full min-w-0"
                                                value={v}
                                                onChange={(e) => updateAttrVal(k, e.target.value)}
                                                disabled={lockedTagGroup}
                                            />
                                        </div>
                                        <div className="col-span-2 flex justify-end">
                                            <button
                                                className="inline-flex items-center justify-center h-6 px-2 rounded border border-neutral-200 hover:bg-neutral-50"
                                                title="remove"
                                                onClick={() => removeAttr(k)}
                                                type="button"
                                                disabled={lockedTagGroup}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                </RightCell>
                            </RowShell>
                        ))}
                    </div>
                </div>

                {binding && (
                    <DataBindingPopover
                        nodeId={nodeId}
                        propKey={binding.propKey}
                        anchorEl={binding.anchorEl}
                        onClose={() => setBinding(null)}
                    />
                )}
            </SectionFrame>
        </div>
    );
}

export default CommonInspector;