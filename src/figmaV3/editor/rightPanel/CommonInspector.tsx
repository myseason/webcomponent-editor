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

function normOpt(op: unknown): { value: string; label: string } {
    if (op == null) return { value: '', label: '' };
    if (typeof op === 'object') {
        const any = op as any;
        const v =
            any?.value != null
                ? String(any.value)
                : (() => {
                    try { return JSON.stringify(any); } catch { return String(any); }
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

/** StyleInspector와 동일한 그리드 + 바인딩 버튼 */
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

/** 에디터 전역 단축키가 인풋 타이핑을 가로채지 않도록 보호 */
const inputGuardProps = {
    onKeyDown: (e: React.KeyboardEvent) => e.stopPropagation(),
    onKeyUp: (e: React.KeyboardEvent) => e.stopPropagation(),
    onKeyPress: (e: React.KeyboardEvent) => e.stopPropagation(),
    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
    onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
};

export function CommonInspector(props: {
    nodeId: NodeId;
    defId: string;
    open?: boolean;
    onToggle?: () => void;
    /** StyleInspector처럼 섹션 패널의 고정 너비(px). 기본 360 */
    width?: number;
}) {
    const { nodeId, defId, width = 360 } = props;

    const { reader, writer } = useRightControllerFactory(RightDomain.Inspector);

    // SectionFrame 접힘 상태 (StyleInspector와 동일 UX)
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
    // 일반(공통) 입력 상태 (id / name) — 저장은 onBlur에서만
    // ─────────────────────────────────────────────────────────────
    const initialAttrs = (propsObj.__tagAttrs as AttrMap | undefined) ?? {};
    const [elemId, setElemId] = React.useState(String(initialAttrs.id ?? node.id));
    const [name, setName] = React.useState(String((propsObj as any).name ?? ''));

    // ⚠️ nodeId 변경시에만 프로젝트값으로 초기 동기화
    React.useEffect(() => {
        const pj = reader.getProject();
        const n = pj.nodes[nodeId];
        if (!n) return;

        const p = (n.props ?? {}) as Record<string, unknown>;
        const a = (p.__tagAttrs as AttrMap | undefined) ?? {};

        const nextElemId = String((a.id as string | undefined) ?? n.id ?? '');
        const nextName = String((p as any).name ?? '');

        setElemId(nextElemId);
        setName(nextName);
        // ✅ deps에서 reader 제거 — 컨트롤러 재생성으로 인한 되감기 방지
    }, [nodeId]); // ← 오직 nodeId만

    const saveBasic = React.useCallback(() => {
        // name 저장
        writer.updateNodeProps(nodeId, { name });

        // id 저장 (__tagAttrs)
        const curAttrs = ((reader.getProject().nodes[nodeId].props ?? {}) as any).__tagAttrs as AttrMap | undefined;
        const next: AttrMap = { ...(curAttrs ?? {}) };

        const trimmed = elemId.trim();
        if (trimmed.length > 0) next.id = trimmed;
        else delete next.id;

        writer.updateNodeProps(nodeId, { __tagAttrs: next });
    }, [nodeId, name, elemId, reader, writer]);

    // ─────────────────────────────────────────────────────────────
    // 태그 & 속성
    // ─────────────────────────────────────────────────────────────
    const selectableTags = reader.getSelectableTagsForNode(nodeId) as string[]; // TagName[]
    const currentTag =
        String(((node.props ?? {}) as any).__tag ?? (selectableTags?.[0] ?? ''));

    // 자동 schema 엔트리 — __tag 항목은 제외(상단 전용)
    const schema = (def?.propsSchema ?? []) as any[];
    const entries: Entry[] = React.useMemo(() => {
        const out: Entry[] = [];
        for (const f of schema) {
            if (!f || !f.key) continue;
            const key = String(f.key);
            if (key === '__tag') continue; // Tag는 전용 셀렉트로 처리
            const t = String(f.type ?? f.control ?? 'string');
            if (t === 'string' || t === 'input' || t === 'text') {
                out.push({ key, type: 'text', label: f.label ?? key });
            } else if (t === 'select') {
                const options = Array.isArray(f.options) ? f.options : [];
                out.push({ key, type: 'select', label: f.label ?? key, options });
            }
        }
        return out;
    }, [schema]);

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
                                {...inputGuardProps}
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
                                {...inputGuardProps}
                                className="h-6 px-1 border border-neutral-200 rounded text-[11px] w-full min-w-0"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onBlur={saveBasic}
                                placeholder="friendly name"
                                title="name"
                            />
                        </RightCell>
                    </RowShell>
                </div>

                {/* ──────────────── 서브 그룹: 태그 & 속성 (락 버튼 없음) ──────────────── */}
                <div className="border-b border-neutral-200">
                    <GroupHeader
                        label="태그 & 속성"
                        Icon={TagIcon}
                        locked={false}
                        onToggleLock={undefined}
                    />

                    {/* As(tag) */}
                    <RowShell>
                        <LeftCell title="As (tag)" />
                        <RightCell>
                            <select
                                {...inputGuardProps}
                                className="h-6 px-1 border border-neutral-200 rounded text-[11px] w-full min-w-0"
                                title="As(tag)"
                                value={currentTag}
                                onChange={(e) => writer.updateNodeProps(nodeId, { __tag: e.target.value })}
                            >
                                {(selectableTags ?? []).map((t, i) => (
                                    <option key={`as:opt:${t}:${i}`} value={t}>
                                        {t}
                                    </option>
                                ))}
                            </select>
                        </RightCell>
                    </RowShell>

                    {/* Auto schema props ( __tag 제외 ) */}
                    <div key={currentTag}>
                        {entries.map((entry) => {
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
                                                    {...inputGuardProps}
                                                    className="h-6 px-1 border border-neutral-200 rounded text-[11px] w-full min-w-0"
                                                    value={(value as string) ?? ''}
                                                    onChange={(e) => writer.updateNodeProps(nodeId, { [entry.key]: e.target.value })}
                                                    placeholder=""
                                                    title={entry.key}
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
                                                    {...inputGuardProps}
                                                    className="h-6 px-1 border border-neutral-200 rounded text-[11px] w-full min-w-0"
                                                    value={(value as string) ?? ''}
                                                    onChange={(e) => writer.updateNodeProps(nodeId, { [entry.key]: e.target.value })}
                                                    title={entry.key}
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
                                        {...inputGuardProps}
                                        className="h-6 px-1 border border-neutral-200 rounded text-[11px] w-full min-w-0"
                                        placeholder="key"
                                        value={newKey}
                                        onChange={(e) => setNewKey(e.target.value)}
                                    />
                                </div>
                                <div className="col-span-4">
                                    <input
                                        {...inputGuardProps}
                                        className="h-6 px-1 border border-neutral-200 rounded text-[11px] w-full min-w-0"
                                        placeholder="value"
                                        value={newVal}
                                        onChange={(e) => setNewVal(e.target.value)}
                                    />
                                </div>
                                <div className="col-span-2 flex justify-end">
                                    <button
                                        className="inline-flex items-center justify-center h-6 w-6 rounded border border-neutral-200 hover:bg-neutral-50"
                                        title="add"
                                        onClick={addAttr}
                                        type="button"
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
                                                {...inputGuardProps}
                                                className="h-6 px-1 border border-neutral-200 rounded text-[11px] w-full min-w-0"
                                                value={k}
                                                onChange={(e) => updateAttrKey(k, e.target.value)}
                                            />
                                        </div>
                                        <div className="col-span-4">
                                            <input
                                                {...inputGuardProps}
                                                className="h-6 px-1 border border-neutral-200 rounded text-[11px] w-full min-w-0"
                                                value={v}
                                                onChange={(e) => updateAttrVal(k, e.target.value)}
                                            />
                                        </div>
                                        <div className="col-span-2 flex justify-end">
                                            <button
                                                className="inline-flex items-center justify-center h-6 px-2 rounded border border-neutral-200 hover:bg-neutral-50"
                                                title="remove"
                                                onClick={() => removeAttr(k)}
                                                type="button"
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