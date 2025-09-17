'use client';

import * as React from 'react';
import {
    Database,
    Plus,
    Hash,
    Tag as TagIcon,
    Settings2,
} from 'lucide-react';

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
} from './util/ui';

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

/** StyleInspector와 동일한 그리드 레이아웃을 유지하면서
 *  우측에 바인딩 버튼을 배치하는 래퍼(UI 변경만, 기능 변경 없음) */
const FieldWithBind: React.FC<{
    children: React.ReactNode;
    bindButton?: React.ReactNode;
}> = ({ children, bindButton }) => {
    return (
        <div className="grid grid-cols-10 gap-2 items-center w-full">
            <div className="col-span-9">{children}</div>
            <div className="col-span-1 flex justify-center">{bindButton}</div>
        </div>
    );
};

export function CommonInspector(props: {
    nodeId: NodeId;
    defId: string;
    open?: boolean;
    onToggle?: () => void;
    /** StyleInspector처럼 섹션 패널의 고정 너비(px). 기본 360 */
    width?: number;
}) {
    const {
        nodeId,
        defId,
        width = 360,            // ← 추가: 폭 주입(기본 360)
    } = props;

    const { reader, writer } = useRightControllerFactory(RightDomain.Inspector);

    // SectionFrame은 collapsed 플래그 사용 (StyleInspector와 동일 UX)
    const [collapsed, setCollapsed] = React.useState<boolean>(
        props.open === undefined ? false : !props.open,
    );
    const notifyToggle = props.onToggle ?? (() => {});

    const project = reader.getProject();
    const node = project.nodes[nodeId];
    if (!node) return null;

    const def = getDefinition(defId) as ComponentDefinition | undefined;
    const propsObj = (node.props ?? {}) as Record<string, unknown>;

    // ─────────────────────────────────────────────────────────────
    // 일반(공통) 입력 상태 (id/name/slotId) — 기존 동작 그대로 유지
    // ─────────────────────────────────────────────────────────────
    const initialAttrs = (propsObj.__tagAttrs as AttrMap | undefined) ?? {};
    const [elemId, setElemId] = React.useState(String(initialAttrs.id ?? node.id));
    const [name, setName] = React.useState(String((propsObj as any).name ?? ''));
    const [slotId, setSlotId] = React.useState(String((propsObj as any).slotId ?? ''));

    // nodeId 변경 시 동기화 (기존 로직 유지)
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

    // 저장(일반) — 기존 동작 그대로
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

    // 자동 schema 엔트리(기존 PropsAutoSection 로직 호환) — 기존 그대로
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
        // ← StyleInspector와 동일하게 width 적용
        <div style={{ width }} className="mt-4 text-[11px] text-neutral-800 overflow-x-hidden">
            <SectionFrame
                title="공통"
                Icon={Settings2}
                collapsed={collapsed}
                onToggle={() => {
                    setCollapsed((c) => !c);
                    notifyToggle();
                }}
            >
                {/* ───────────────────── 서브 그룹: 일반 ───────────────────── */}
                <div className="border-b border-neutral-200">
                    <GroupHeader label="일반" Icon={Hash} />

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
                        Icon={TagIcon}
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
                                            <FieldWithBind bindButton={bindingBtn}>
                                                <input
                                                    className="h-6 px-1 border border-neutral-200 rounded text-[11px] w-full min-w-0"
                                                    value={(value as string) ?? ''}
                                                    onChange={(e) => writer.updateNodeProps(nodeId, { [entry.key]: e.target.value })}
                                                    placeholder=""
                                                    title={entry.key}
                                                    disabled={lockedTagGroup}
                                                />
                                            </FieldWithBind>
                                        </RightCell>
                                    </RowShell>
                                );
                            }

                            if (entry.type === 'select') {
                                return (
                                    <RowShell key={`auto:select:${entry.key}`}>
                                        <LeftCell title={entry.label ?? entry.key} />
                                        <RightCell>
                                            <FieldWithBind bindButton={bindingBtn}>
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
                                            </FieldWithBind>
                                        </RightCell>
                                    </RowShell>
                                );
                            }

                            return null;
                        })}
                    </div>

                    {/* Attrs 입력행 */}
                    <RowShell>
                        <LeftCell title="Attr" />
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

                    {/* 기존 Attrs 리스트 */}
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