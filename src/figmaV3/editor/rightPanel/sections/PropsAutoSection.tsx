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

import { RightDomain, useRightControllerFactory } from '../../../controllers/right/RightControllerFactory';

// ✅ 컨테이너 태그 목록(선택 차단용)
//   - 단일 컴포넌트(컨테이너 아님)에서는 이 태그들이 셀렉트에 절대 나타나지 않도록 필터링합니다.
const CONTAINER_TAGS = new Set([
    'div', 'section', 'article', 'main', 'nav', 'aside', 'header', 'footer'
]);

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
function filterByTagAndDef(defTitle: string | undefined, selTag: string, entries: any[]) {
    if (defTitle === 'Image' && selTag !== 'img') {
        // img가 아닐 때는 src/alt 숨김
        return entries.filter((e) => e.key !== 'src' && e.key !== 'alt');
    }
    return entries;
}

export function PropsAutoSection({ nodeId, defId }: { nodeId: NodeId; defId: string }) {
    // ✅ Right 패널 컨트롤러 사용
    const { reader, writer } = useRightControllerFactory(RightDomain.Policy);

    // ✅ 공통 읽기
    const project = reader.getProject();
    const ui = reader.getUI();

    // ✅ 쓰기 액션
    const { updateNodeProps } = writer as {
        updateNodeProps: (nodeId: NodeId, patch: Record<string, unknown>) => void;
    };

    const node = project.nodes[nodeId];
    const def = getDefinition(defId);
    const [binding, setBinding] = useState<{ propKey: string; anchorEl: HTMLElement } | null>(null);

    // ⬇️ 스키마가 비어 있어도(= Box 등) As(Tag)와 Tag Attrs를 보여야 하므로 조기 return 하지 않음
    const schema = (def?.propsSchema ?? []) as any[];

    /** As(Tag) — 항상 표시 (기준: ComponentDefinition.capabilities.allowedTags) */
    const allowedTagsFromDef = (def as any)?.capabilities?.allowedTags as string[] | undefined;
    const defaultTagFromDef = (def as any)?.capabilities?.defaultTag as string | undefined;

    // 현재 노드 tag
    const currentTag = String(((node.props ?? {}) as any).__tag ?? (defaultTagFromDef ?? (allowedTagsFromDef?.[0] ?? 'div')));

    // ✅ 단일/컨테이너 여부
    const isContainerDef = !!(def as any)?.capabilities?.canHaveChildren;

    // ✅ 최종 Tag 선택지:
    //  - 기본적으로 Definition이 허용하는 태그 목록을 기반으로 하되,
    //  - “단일 컴포넌트(컨테이너 아님)”이면 CONTAINER_TAGS 를 **아예 제거**하여 노출 차단.
    //  - TagPolicy가 컨테이너 태그를 허용하더라도 여기서는 원천 차단합니다.
    const selectableTags: string[] = useMemo(() => {
        const base = allowedTagsFromDef && allowedTagsFromDef.length > 0
            ? allowedTagsFromDef
            : [defaultTagFromDef ?? 'div'];

        if (!isContainerDef) {
            // 단일 컴포넌트 → 컨테이너 태그 제거
            const filtered = base.filter((t: string) => !CONTAINER_TAGS.has(t));
            // 만약 필터 결과가 비어서 셀렉트가 비정상 동작할 여지가 있으면, 현재 tag만 단독으로 유지
            return filtered.length > 0 ? filtered : [currentTag];
        }
        return base;
    }, [allowedTagsFromDef, defaultTagFromDef, isContainerDef, currentTag]);

    // 현재 선택 UI 상태
    const [selTag, setSelTag] = useState<string>(currentTag);
    React.useEffect(() => setSelTag(currentTag), [currentTag, nodeId, defId]);

    // 변경 가능 판단(옵션이 2개 이상이거나, 1개지만 현재와 다른 경우)
    const canChangeTag = useMemo(() => {
        const unique = Array.from(new Set(selectableTags));
        if (unique.length <= 1) return false;
        // 여러 개면 변경 가능
        return true;
    }, [selectableTags]);

    // Tag 적용(여기서는 컨테이너로의 승격/경고 로직을 **원천 제거**합니다)
    const applyTag = () => {
        // 방어: selectableTags에 없는 값을 억지로 적용하려는 경우 무시
        if (!selectableTags.includes(selTag)) return;
        updateNodeProps(nodeId, { __tag: selTag || undefined });
    };

    /** 정책 기반 필터 + Tag 기반 보정 */
    const baseEntries = useMemo(() => {
        const entries = schema.filter((e) => !RESERVED_PROP_KEYS.has(e.key));
        const forceAll = !!ui.inspector?.forceTagPolicy;

        // 페이지 모드 & 전문가모드 아님 & 강제표시 아님 → 컴포넌트 정책 적용
        if (ui.mode === 'Page' && !ui.expertMode && !forceAll) {
            const componentPolicy = project.policies?.components?.[def?.title ?? ''];
            if (componentPolicy) {
                return entries.filter((entry: any) => {
                    const controlKey = `props:${entry.key}`;
                    return componentPolicy.inspector?.controls?.[controlKey]?.visible !== false;
                });
            }
        }
        return entries;
    }, [schema, ui.mode, ui.expertMode, ui.inspector?.forceTagPolicy, project.policies, def?.title]);

    const visibleEntries = useMemo(
        () => filterByTagAndDef(def?.title, selTag, baseEntries),
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
                                        options={[...selectableTags]}
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
                                onClick={() => addAttr()}
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
                                onClick={() => addAttr()}
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