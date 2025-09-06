'use client';

import React, { useState, useMemo } from 'react';
import { getDefinition } from '../../../core/registry';
import type { NodeId } from '../../../core/types';
import { Database } from 'lucide-react';
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
import {useInspectorController} from "@/figmaV3/controllers/inspector/InspectorFacadeController";

const RESERVED_PROP_KEYS = new Set([
    'as',
    'href',
    'tag',
    '__tag',
    '__tagAttrs',
    'id',
    'name',
    'slotId',
]);

type AttrMap = Record<string, string>;

/** 태그/컴포넌트별로 숨겨야 할 prop을 최소 규칙으로 처리 */
function filterByTagAndDef(defTitle: string, selTag: string, entries: any[]) {
    if (defTitle === 'Image' && selTag !== 'img') {
        // img가 아닐 때는 src/alt 숨김
        return entries.filter((e) => e.key !== 'src' && e.key !== 'alt');
    }
    return entries;
}

export function PropsAutoSection({ nodeId, defId }: { nodeId: NodeId; defId: string }) {
    const { reader, writer } = useInspectorController();
    const R = reader(); const W = writer();

    const state = {
  ui: R.ui(),
  project: R.project(),
  data: R.data(),
  getEffectiveDecl: R.getEffectiveDecl.bind(R),
  updateNodeStyles: W.updateNodeStyles.bind(W),
  updateNodeProps: W.updateNodeProps.bind(W),
  setNotification: W.setNotification.bind(W),
  saveNodeAsComponent: W.saveNodeAsComponent.bind(W),
  updateComponentPolicy: W.updateComponentPolicy.bind(W),
  update: W.update.bind(W),
};
    const { project, ui, updateNodeProps } = state;

    const node = project.nodes[nodeId];
    const def = getDefinition(defId);
    const [binding, setBinding] = useState<{ propKey: string; anchorEl: HTMLElement } | null>(null);

    // ⬇️ 스키마가 비어 있어도(= Box 등) As(Tag)와 Tag Attrs를 보여야 하므로 조기 return 하지 않음
    const schema = (def?.propsSchema ?? []) as any[];

    /** As(Tag) — 항상 표시 */
    const allowedTags = (def as any)?.capabilities?.allowedTags ?? ['div'];
    const defaultTag = (def as any)?.capabilities?.defaultTag ?? allowedTags[0] ?? 'div';

    const currentTag = String(((node.props ?? {}) as any).__tag ?? defaultTag);
    const [selTag, setSelTag] = useState(currentTag);
    React.useEffect(() => setSelTag(currentTag), [currentTag, nodeId, defId]);

    const canChangeTag = allowedTags.length > 1;
    const applyTag = () => updateNodeProps(nodeId, { __tag: selTag || undefined });

    /** 정책 기반 필터 + Tag 기반 보정 */
    const baseEntries = useMemo(() => {
        const entries = schema.filter((e) => !RESERVED_PROP_KEYS.has(e.key));
        if (ui.mode === 'Page' && !ui.expertMode) {
            const componentPolicy = project.policies?.components?.[def?.title ?? ''];
            if (componentPolicy) {
                return entries.filter((entry: any) => {
                    const controlKey = `props:${entry.key}`;
                    return componentPolicy.inspector?.controls?.[controlKey]?.visible !== false;
                });
            }
        }
        return entries;
    }, [schema, ui.mode, ui.expertMode, project.policies, def?.title]);

    const visibleEntries = useMemo(
        () => filterByTagAndDef(def?.title ?? '', selTag, baseEntries),
        [def?.title, defId, selTag, baseEntries]
    );

    const getCurrent = (key: string): unknown => (node.props as Record<string, unknown>)?.[key];
    const setProp = (key: string, value: unknown) => updateNodeProps(nodeId, { [key]: value });

    /** Tag Attributes (맨 하단) */
    const attrsObj = (((node.props ?? {}) as any).__tagAttrs ?? {}) as AttrMap;
    const attrsList = useMemo(
        () => Object.entries(attrsObj).map(([k, v]) => ({ key: String(k), value: String(v) })),
        [attrsObj]
    );
    const [newKey, setNewKey] = useState('');
    const [newVal, setNewVal] = useState('');

    const addAttr = () => {
        const k = newKey.trim();
        if (!k) return;
        const next: AttrMap = { ...attrsObj, [k]: newVal };
        updateNodeProps(nodeId, { __tagAttrs: next });
        setNewKey('');
        setNewVal('');
    };
    const updateAttr = (k: string, v: string) => {
        const next: AttrMap = { ...attrsObj, [k]: v };
        updateNodeProps(nodeId, { __tagAttrs: next });
    };
    const removeAttr = (k: string) => {
        const next: AttrMap = { ...attrsObj };
        delete next[k];
        updateNodeProps(nodeId, { __tagAttrs: next });
    };

    const [open, setOpen] = useState(true);

    return (
        <div className="mt-4">
            <SectionShellV1 title="Props" open={open} onToggle={() => setOpen((v) => !v)}>
                {/* ───── As (Tag) — 항상 노출 ───── */}
                <RowV1>
                    <RowLeftV1 title="As (Tag)" />
                    <RowRightGridV1>
                        {canChangeTag ? (
                            <>
                                <div className="col-span-4 min-w-0">
                                    {/* 고급 모드에서는 자물쇠 숨김 */}
                                    {!ui.expertMode && (
                                        <PermissionLock controlKey="tag" componentId={def?.title ?? ''} />
                                    )}
                                    <MiniSelectV1
                                        value={selTag}
                                        options={[...allowedTags] as unknown as string[]}
                                        onChange={(v) => setSelTag(String(v || ''))}
                                        title="html tag"
                                        fullWidth
                                    />
                                </div>
                                <div className="col-span-2 min-w-0">
                                    <button
                                        className="h-[28px] w-full rounded border border-gray-300 text-[12px]"
                                        onClick={applyTag}
                                        title="apply tag"
                                    >
                                        apply
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="col-span-6 min-w-0">
                                {!ui.expertMode && (
                                    <PermissionLock controlKey="tag" componentId={def?.title ?? ''} />
                                )}
                                <MiniInputV1 value={currentTag} onChange={() => {}} size="full" title="tag (read only)" />
                            </div>
                        )}
                    </RowRightGridV1>
                </RowV1>

                {/* ───── Tag에 따른 “속성 편집 UI” — 바로 아래, 태그 변경 시 리마운트 ───── */}
                <div key={selTag}>
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
                                                value={String(value ?? '')}
                                                onChange={(v) => setProp(entry.key, v)}
                                                placeholder={entry.placeholder ?? ''}
                                                size="auto"
                                                fullWidth
                                            />
                                        </div>
                                        <div className="col-span-1 min-w-0">{bindingBtn}</div>
                                    </RowRightGridV1>
                                </RowV1>
                            );
                        }

                        if (entry.type === 'select') {
                            const opts = entry.options ?? [];
                            const current = (value as string | undefined) ?? (opts[0]?.value ?? '');
                            return (
                                <RowV1 key={entry.key}>
                                    <RowLeftV1 title={entry.label ?? entry.key} />
                                    <RowRightGridV1>
                                        <div className="col-span-5 min-w-0">
                                            <MiniSelectV1
                                                value={String(current)}
                                                options={opts.map((o: any) => String(o.value))}
                                                onChange={(v) => setProp(entry.key, v)}
                                                fullWidth
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

                {binding && (
                    <DataBindingPopover
                        nodeId={nodeId}
                        propKey={binding.propKey}
                        anchorEl={binding.anchorEl}
                        onClose={() => setBinding(null)}
                    />
                )}

                {/* ───── Tag Attributes — 섹션 맨 하단 ───── */}
                <RowV1>
                    <RowLeftV1 title="tag attrs" />
                    <RowRightGridV1>
                        <div className="col-span-3" />
                        <div className="col-span-3 min-w-0">
                            <button
                                className="h-[28px] w-full rounded border border-gray-300 text-[12px]"
                                onClick={addAttr}
                                title="add attribute"
                            >
                                + add attribute
                            </button>
                        </div>
                    </RowRightGridV1>
                </RowV1>

                {/* 추가 폼: key(3) | value(2) | add(1) */}
                <RowV1>
                    <RowLeftV1 title="" />
                    <RowRightGridV1>
                        <div className="col-span-3 min-w-0">
                            <MiniInputV1
                                value={newKey}
                                onChange={setNewKey}
                                placeholder="data-role"
                                size="auto"
                                title="attr key"
                                fullWidth
                            />
                        </div>
                        <div className="col-span-2 min-w-0">
                            <MiniInputV1
                                value={newVal}
                                onChange={setNewVal}
                                placeholder="value"
                                size="auto"
                                title="attr value"
                                fullWidth
                            />
                        </div>
                        <div className="col-span-1 min-w-0">
                            <button
                                className="h-[28px] w-full rounded border border-gray-300 text-[12px]"
                                onClick={addAttr}
                                title="add"
                            >
                                add
                            </button>
                        </div>
                    </RowRightGridV1>
                </RowV1>

                {attrsList.length === 0 ? (
                    <RowV1>
                        <RowLeftV1 title="" />
                        <RowRightGridV1>
                            <div className="col-span-6 text-[11px] text-gray-500">
                                tag attributes를 추가할 수 있습니다
                            </div>
                        </RowRightGridV1>
                    </RowV1>
                ) : (
                    attrsList.map(({ key, value }) => (
                        <RowV1 key={key}>
                            <RowLeftV1 title="" />
                            <RowRightGridV1>
                                <div className="col-span-3 min-w-0">
                                    <MiniInputV1 value={key} onChange={() => {}} title="attr key" fullWidth />
                                </div>
                                <div className="col-span-2 min-w-0">
                                    <MiniInputV1
                                        value={value}
                                        onChange={(v) => updateAttr(key, v)}
                                        title="attr value"
                                        fullWidth
                                    />
                                </div>
                                <div className="col-span-1 min-w-0">
                                    <button
                                        className="h-[28px] w-full rounded border border-gray-300 text-[12px]"
                                        onClick={() => removeAttr(key)}
                                        title="remove"
                                    >
                                        ×
                                    </button>
                                </div>
                            </RowRightGridV1>
                        </RowV1>
                    ))
                )}
            </SectionShellV1>
        </div>
    );
}