'use client';

import React, { useState, useMemo } from 'react';
import { getDefinition } from '../../../core/registry';
import type { NodeId } from '../../../core/types';
import { Database, Plus } from 'lucide-react';
import { DataBindingPopover } from './DataBindingPopover';
import { PermissionLock } from './styles/common';

import {
    SectionShellV1,
    RowV1,
    RowLeftV1,
    RowRightGridV1,
    MiniInputV1,
    MiniSelectV1,
    IconBtnV1,
} from './styles/layoutV1';

import { RightDomain, useRightControllerFactory } from '../../../controllers/right/RightControllerFactory';

type AttrMap = Record<string, string>;

const CONTAINER_TAGS = ['div', 'section', 'article', 'ul', 'ol'];

function filterByTagAndDef(_componentTitle: string | undefined, _tag: string, entries: any[]) {
    // 필요 시 확장
    return entries;
}

export function PropsAutoSection(props: {
    nodeId: NodeId;
    defId: string;
    /** Inspector.tsx 수정 없이 사용 가능하도록 선택 props */
    open?: boolean;
    onToggle?: () => void;
}) {
    const { nodeId, defId } = props;
    const open = props.open ?? true;
    const onToggle = props.onToggle ?? (() => {});

    // ✅ 컨트롤러
    const { reader, writer } = useRightControllerFactory(RightDomain.Inspector);
    const ui = reader.getUI();
    const project = reader.getProject();

    const node = project.nodes[nodeId];
    if (!node) return null;

    const def = getDefinition(defId);
    const [binding, setBinding] = useState<{ propKey: string; anchorEl: HTMLElement } | null>(null);

    const schema = (def?.propsSchema ?? []) as any[];

    /** As(Tag) */
    const allowedTagsFromDef = (def as any)?.capabilities?.allowedTags as string[] | undefined;
    const defaultTagFromDef = (def as any)?.capabilities?.defaultTag as string | undefined;

    const currentTag = String(
        ((node.props ?? {}) as any).__tag ?? (defaultTagFromDef ?? (allowedTagsFromDef?.[0] ?? 'div')),
    );

    const isContainerDef = !!(def as any)?.capabilities?.canHaveChildren;

    const selectableTags: string[] = useMemo(() => {
        const base =
            allowedTagsFromDef && allowedTagsFromDef.length > 0 ? allowedTagsFromDef : [defaultTagFromDef ?? 'div'];
        if (!isContainerDef) {
            return base.filter((t) => !CONTAINER_TAGS.includes(t));
        }
        return base;
    }, [allowedTagsFromDef, defaultTagFromDef, isContainerDef]);

    const lockControl = (controlKey: string) => {
        if (ui.expertMode) return;
        const componentId = def?.title ?? '';
        const normalized = controlKey.replace(/:/g, '.');
        writer.updateComponentPolicy(componentId, {
            inspector: {
                controls: {
                    [normalized]: { visible: false },
                },
            } as any,
        });
    };

    const baseEntries = useMemo(() => {
        const entries: Array<{ key: string; type: 'text' | 'select'; label?: string; options?: string[] }> = [];
        for (const f of schema) {
            if (!f || !f.key) continue;
            const key = String(f.key);
            if (f.type === 'string') {
                entries.push({ key, type: 'text', label: f.label ?? key });
            } else if (f.type === 'select') {
                const options = Array.isArray(f.options) ? f.options.map(String) : [];
                entries.push({ key, type: 'select', label: f.label ?? key, options });
            }
        }
        return entries;
    }, [schema]);

    const visibleEntries = useMemo(
        () => filterByTagAndDef(def?.title, currentTag, baseEntries),
        [def?.title, defId, currentTag, baseEntries],
    );

    const getCurrent = (key: string): unknown => (node.props as Record<string, unknown>)?.[key];
    const setProp = (key: string, value: unknown) => writer.updateNodeProps(nodeId, { [key]: value });

    /** Tag Attributes */
    const attrsObj = (((node.props ?? {}) as any).__tagAttrs ?? {}) as AttrMap;
    const attrsList = useMemo(
        () => Object.entries(attrsObj).map(([k, v]) => ({ key: String(k), value: String(v) })),
        [attrsObj],
    );
    const [newKey, setNewKey] = useState('');
    const [newVal, setNewVal] = useState('');

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

    const updateAttr = (k: string, v: string) => {
        const next: AttrMap = { ...attrsObj, [k]: v };
        writer.updateNodeProps(nodeId, { __tagAttrs: next });
    };

    return (
        <div className="mt-4">
            <SectionShellV1 title="Props & Tag" open={open} onToggle={onToggle}>
                {/* As(Tag) */}
                <RowV1>
                    <RowLeftV1
                        title={
                            <>
                                As (tag)
                                {!ui.expertMode && (
                                    <span className="ml-1 inline-flex">
                    <PermissionLock
                        controlKey="props:tag"
                        componentId={def?.title ?? ''}
                        disabled={ui.expertMode}
                        onClick={() => lockControl('props:tag')}
                    />
                  </span>
                                )}
                            </>
                        }
                    />
                    <RowRightGridV1>
                        <div className="col-span-6 min-w-0">
                            <MiniSelectV1
                                value={currentTag}
                                options={selectableTags}
                                onChange={(v) => writer.updateNodeProps(nodeId, { __tag: v })}
                                title="As(tag)"
                            />
                        </div>
                    </RowRightGridV1>
                </RowV1>

                {/* Auto schema props */}
                <div key={currentTag}>
                    {visibleEntries.map((entry: any) => {
                        const value = getCurrent(entry.key);

                        const bindingBtn = (
                            <IconBtnV1
                                title="bind"
                                onClick={(e) =>
                                    setBinding({
                                        propKey: entry.key,
                                        anchorEl: e.currentTarget as unknown as HTMLElement,
                                    })
                                }
                                square24
                            >
                                <Database size={16} />
                            </IconBtnV1>
                        );

                        if (entry.type === 'text') {
                            return (
                                <RowV1 key={entry.key}>
                                    <RowLeftV1 title={entry.label ?? entry.key} />
                                    <RowRightGridV1>
                                        <div className="col-span-5 min-w-0">
                                            <MiniInputV1
                                                value={(value as string) ?? ''}
                                                onChange={(v) => setProp(entry.key, v)}
                                                placeholder=""
                                                size="full"
                                                title={entry.key}
                                            />
                                        </div>
                                        <div className="col-span-1 min-w-0">{bindingBtn}</div>
                                    </RowRightGridV1>
                                </RowV1>
                            );
                        }

                        if (entry.type === 'select') {
                            return (
                                <RowV1 key={entry.key}>
                                    <RowLeftV1 title={entry.label ?? entry.key} />
                                    <RowRightGridV1>
                                        <div className="col-span-5 min-w-0">
                                            <MiniSelectV1
                                                value={(value as string) ?? ''}
                                                options={entry.options ?? []}
                                                onChange={(v) => setProp(entry.key, v)}
                                                title={entry.key}
                                            />
                                        </div>
                                        <div className="col-span-1 min-w-0">{bindingBtn}</div>
                                    </RowRightGridV1>
                                </RowV1>
                            );
                        }

                        return null;
                    })}
                </div>

                {/* Tag Attributes 입력행 (+ add 버튼 포함) */}
                <RowV1>
                    <RowLeftV1 title="Attrs" />
                    <RowRightGridV1>
                        <div className="col-span-3 min-w-0">
                            <MiniInputV1 value={newKey} onChange={setNewKey} placeholder="key" size="full" />
                        </div>
                        <div className="col-span-2 min-w-0">
                            <MiniInputV1 value={newVal} onChange={setNewVal} placeholder="value" size="full" />
                        </div>
                        <div className="col-span-1 min-w-0 flex justify-end">
                            <IconBtnV1 title="add" onClick={addAttr} square24>
                                <Plus size={16} />
                            </IconBtnV1>
                        </div>
                    </RowRightGridV1>
                </RowV1>

                {/* 기존 속성 리스트 */}
                <div className="mt-1">
                    {attrsList.map(({ key, value }) => (
                        <RowV1 key={key}>
                            <RowLeftV1 title={key} />
                            <RowRightGridV1>
                                <div className="col-span-5 min-w-0">
                                    <MiniInputV1 value={value} onChange={(v) => updateAttr(key, v)} size="full" />
                                </div>
                                <div className="col-span-1 min-w-0">
                                    <IconBtnV1 title="remove" onClick={() => removeAttr(key)} square24>
                                        ×
                                    </IconBtnV1>
                                </div>
                            </RowRightGridV1>
                        </RowV1>
                    ))}
                </div>

                {binding && (
                    <DataBindingPopover
                        nodeId={nodeId}
                        propKey={binding.propKey}
                        anchorEl={binding.anchorEl}
                        onClose={() => setBinding(null)}
                    />
                )}
            </SectionShellV1>
        </div>
    );
}