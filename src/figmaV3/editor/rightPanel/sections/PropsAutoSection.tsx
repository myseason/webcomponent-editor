'use client';

import React, { useState, useMemo } from 'react';
import { useEditor } from '../../useEditor';
import { getDefinition } from '../../../core/registry';
import type { NodeId, PropSchemaEntry } from '../../../core/types';
import { Database } from 'lucide-react';
import { DataBindingPopover } from './DataBindingPopover';
import { PermissionLock } from './styles/common';

function Row({ children }: { children: React.ReactNode }) {
    return <div className="flex items-center gap-2 px-1 py-0.5">{children}</div>;
}
function Label({ children }: { children: React.ReactNode }) {
    return <div className="text-xs w-28 shrink-0 text-neutral-500 select-none">{children}</div>;
}
const RESERVED_PROP_KEYS = new Set<string>([
    'as', 'href', 'tag', '__tag', '__tagAttrs', 'id', 'name', 'slotId',
]);


export function PropsAutoSection({ nodeId, defId }: { nodeId: NodeId; defId: string }) {
    const state = useEditor();
    const { project, ui, updateNodeProps } = state;
    const node = project.nodes[nodeId];
    const def = getDefinition(defId);

    const [binding, setBinding] = useState<{ prop: string; anchor: HTMLElement } | null>(null);

    const schema: PropSchemaEntry[] = def?.propsSchema ?? [];
    if (!def || schema.length === 0) return null;

    // ✨ [수정] ComponentPolicy를 확인하여 페이지 빌더에게 보여줄 속성만 필터링합니다.
    const visibleEntries = useMemo(() => {
        const baseEntries = schema.filter((e) => !RESERVED_PROP_KEYS.has(e.key));
        if (ui.mode === 'Page' && !ui.expertMode) {
            const componentPolicy = project.policies?.components?.[def.title];
            if (componentPolicy) {
                return baseEntries.filter(entry => {
                    const controlKey = `props:${entry.key}`;
                    return componentPolicy.inspector?.controls?.[controlKey]?.visible !== false;
                });
            }
        }
        return baseEntries;
    }, [schema, ui.mode, ui.expertMode, project.policies, def?.title]);


    const getCurrent = (key: string): unknown => (node.props as Record<string, unknown>)?.[key];
    const setProp = (key: string, value: unknown) => updateNodeProps(nodeId, { [key]: value });

    const renderLock = (propKey: string) => {
        if (ui.mode === 'Component') {
            return <PermissionLock componentId={defId} controlKey={`props:${propKey}`} />;
        }
        return null;
    };


    if (visibleEntries.length === 0) return null;

    return (
        <section>
            <div className="space-y-1">
                {visibleEntries.map((entry) => {
                    const value = getCurrent(entry.key);
                    const isBound = typeof value === 'string' && value.includes('{{');

                    const renderBindingButton = (
                        <button
                            title="Bind data"
                            className={`p-1 rounded ${isBound ? 'text-blue-500 bg-blue-100' : 'text-gray-400 hover:bg-gray-100'}`}
                            onClick={(e) => setBinding({ prop: entry.key, anchor: e.currentTarget })}
                        >
                            <Database size={14} />
                        </button>
                    );

                    if (entry.type === 'text') {
                        return (
                            <Row key={entry.key}>
                                <Label>{entry.label ?? entry.key}</Label>
                                {renderLock(entry.key)}
                                <div className="flex-1 flex items-center gap-1">
                                    <input
                                        className="text-[11px] border rounded px-2 py-1 flex-1 min-w-0"
                                        placeholder={entry.placeholder ?? ''}
                                        value={String(value ?? '')}
                                        onChange={(e) => setProp(entry.key, e.target.value)}
                                    />
                                    {renderBindingButton}
                                </div>
                            </Row>
                        );
                    }

                    if (entry.type === 'select') {
                        const opts = entry.options ?? [];
                        const current = value ?? (opts[0]?.value ?? '');
                        return (
                            <Row key={entry.key}>
                                <Label>{entry.label ?? entry.key}</Label>
                                {renderLock(entry.key)}
                                <div className="flex-1 flex items-center gap-1">
                                    <select
                                        className="text-[11px] border rounded px-2 py-1 flex-1 min-w-0"
                                        value={String(current)}
                                        onChange={(e) => setProp(entry.key, e.target.value)}
                                    >
                                        {opts.map((o, i) => (
                                            <option key={`${entry.key}-${i}`} value={String(o.value)}>
                                                {o.label}
                                            </option>
                                        ))}
                                    </select>
                                    {renderBindingButton}
                                </div>
                            </Row>
                        );
                    }
                    return null;
                })}
            </div>
            {binding && (
                <DataBindingPopover
                    nodeId={nodeId}
                    propKey={binding.prop}
                    anchorEl={binding.anchor}
                    onClose={() => setBinding(null)}
                />
            )}
        </section>
    );
}