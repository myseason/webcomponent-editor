'use client';

import React, { useState, useMemo } from 'react';
import { useEditor } from '../../useEditor';
import { getDefinition } from '../../../core/registry';
import type { NodeId } from '../../../core/types';
import { Database } from 'lucide-react';
import { DataBindingPopover } from './DataBindingPopover';
import { PermissionLock } from './styles/common';

// 신규 레이아웃 유틸
import {
    SectionShellV1,
    RowV1,
    RowLeftV1,
    RowRightGridV1,
    MiniInputV1,
    MiniSelectV1,
    IconBtnV1,
} from './styles/layoutV1';

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

export function PropsAutoSection({ nodeId, defId }: { nodeId: NodeId; defId: string }) {
    const state = useEditor();
    const { project, ui, updateNodeProps } = state;

    const node = project.nodes[nodeId];
    const def = getDefinition(defId);
    const [binding, setBinding] = useState<{ prop: string; anchor: HTMLElement } | null>(null);

    const schema = (def?.propsSchema ?? []) as any[];
    if (!def || schema.length === 0) return null;

    const visibleEntries = useMemo(() => {
        const baseEntries = schema.filter((e) => !RESERVED_PROP_KEYS.has(e.key));
        if (ui.mode === 'Page' && !ui.expertMode) {
            const componentPolicy = project.policies?.components?.[def.title];
            if (componentPolicy) {
                return baseEntries.filter((entry: any) => {
                    const controlKey = `props:${entry.key}`;
                    return componentPolicy.inspector?.controls?.[controlKey]?.visible !== false;
                });
            }
        }
        return baseEntries;
    }, [schema, ui.mode, ui.expertMode, project.policies, def?.title]);

    const getCurrent = (key: string): unknown => (node.props as Record<string, unknown>)?.[key];
    const setProp = (key: string, value: unknown) => updateNodeProps(nodeId, { [key]: value });

    const renderLock = (_propKey: string) => {
        if (ui.mode === 'Component') {
            // return <PermissionLock controlKey={`props:${_propKey}`} componentId={defId} />;
            return null;
        }
        return null;
    };

    if (visibleEntries.length === 0) return null;

    const [open, setOpen] = useState(true);

    return (
        <SectionShellV1
            title="Props"
            open={open}
            onToggle={() => setOpen((v) => !v)}
        >
            {visibleEntries.map((entry: any) => {
                const value = getCurrent(entry.key);

                const bindingBtn = (
                    <IconBtnV1
                        title="Bind"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                            setBinding({ prop: entry.key, anchor: e.currentTarget as unknown as HTMLElement })
                        }
                        square24
                    >
                        <Database size={16} />
                    </IconBtnV1>
                );

                // ---- text: [label] | input(4col, fullWidth) | empty | button
                if (entry.type === 'text') {
                    return (
                        <RowV1 key={entry.key}>
                            <RowLeftV1 title={entry.label ?? entry.key} />
                            <RowRightGridV1>
                                <div className="col-span-4 min-w-0">
                                    <MiniInputV1
                                        value={(value as string) ?? ''}
                                        onChange={(v) => setProp(entry.key, v)}
                                        placeholder={entry.placeholder ?? ''}
                                        size="auto"          // 셀 폭을 꽉 채우므로 size는 auto로 두고
                                        fullWidth={true}     // w-full block min-w-0 적용
                                    />
                                </div>
                                <div /> {/* spacer: 1칸 */}
                                <div className="col-span-1 flex items-center justify-end">
                                    {bindingBtn}
                                </div>
                            </RowRightGridV1>
                        </RowV1>
                    );
                }

                // ---- select: [label] | select(4col, fullWidth) | empty | button
                if (entry.type === 'select') {
                    const opts = entry.options ?? [];
                    const current = (value as string | undefined) ?? (opts[0]?.value ?? '');
                    return (
                        <RowV1 key={entry.key}>
                            <RowLeftV1 title={entry.label ?? entry.key} />
                            <RowRightGridV1>
                                <div className="col-span-4 min-w-0">
                                    <MiniSelectV1
                                        value={current}
                                        options={opts.map((o: any) => o.value)}
                                        onChange={(v) => setProp(entry.key, v)}
                                        // fullWidth는 기본 true
                                    />
                                </div>
                                <div /> {/* spacer: 1칸 */}
                                <div className="col-span-1 flex items-center justify-end">
                                    {bindingBtn}
                                </div>
                            </RowRightGridV1>
                        </RowV1>
                    );
                }

                // 필요시 다른 타입도 같은 패턴으로 확장
                return null;
            })}

            {binding && (
                <DataBindingPopover
                    nodeId={nodeId}
                    propKey={binding.prop}
                    anchorEl={binding.anchor}
                    onClose={() => setBinding(null)}
                />
            )}
        </SectionShellV1>
    );
}