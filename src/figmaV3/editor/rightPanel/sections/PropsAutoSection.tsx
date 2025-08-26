'use client';

/**
 * PropsAutoSection (v2: 단순/안전 버전)
 * - 컴포넌트 고유 속성만 편집합니다.
 * - As/when/bind UI 전부 제거
 * - select / text 두 타입만 지원
 * - 저장은 모두 updateNodeProps(nodeId, { [key]: value })
 */

import * as React from 'react';
import { useEditor } from '../../useEditor';
import { getDefinition } from '../../../core/registry';
import type { NodeId, PropSchemaEntry } from '../../../core/types';

function SectionHeader({ children }: { children: React.ReactNode }) {
    // inspector 다른 섹션과 동일한 분리선 스타일
    return (
        <div className="flex items-center gap-2 mt-3 mb-1">
            <div className="text-[11px] text-neutral-700">{children}</div>
            <div className="flex-1 border-t border-neutral-200" />
        </div>
    );
}

function Row({ children }: { children: React.ReactNode }) {
    return <div className="flex items-center gap-2 px-1 py-0.5">{children}</div>;
}
function Label({ children }: { children: React.ReactNode }) {
    return <div className="text-xs w-28 shrink-0 text-neutral-500 select-none">{children}</div>;
}

// CommonSection에서 처리하거나 내부 메타로 사용하는 예약 키들(절대 노출 금지)
const RESERVED_PROP_KEYS = new Set<string>([
    'as',          // 과거 As(Tag) 키
    'href',        // 링크는 ActionsPanel/Tag Attributes에서만 설정
    'tag',         // 태그 관련
    '__tag',       // 내부 저장
    '__tagAttrs',  // 내부 저장
    'id',          // CommonSection에서 관리(id attr)
    'name',        // CommonSection에서 관리
    'slotId',      // CommonSection에서 관리
]);

export function PropsAutoSection({ nodeId, defId }: { nodeId: NodeId; defId: string }) {
    const state = useEditor();
    const node = state.project.nodes[nodeId];
    const def = getDefinition(defId);

    const schema: PropSchemaEntry[] = def?.propsSchema ?? [];
    if (!def || schema.length === 0) return null;

    // 현재 값
    const getCurrent = (key: string): unknown => {
        const props = node.props as Record<string, unknown>;
        return props?.[key];
    };

    // 변경 시 즉시 저장
    const setProp = (key: string, value: unknown) => {
        state.updateNodeProps(nodeId, { [key]: value });
    };

    // 예약 키 제외(As, tag 관련, 내부 메타 등)
    const visibleEntries = schema.filter((e) => !RESERVED_PROP_KEYS.has(e.key));

    if (visibleEntries.length === 0) return null;

    return (
        <section>
            <div className="space-y-1">
                {visibleEntries.map((entry) => {
                    if (entry.type === 'text') {
                        const v = getCurrent(entry.key);
                        return (
                            <Row key={entry.key}>
                                <Label>{entry.label ?? entry.key}</Label>
                                <input
                                    className="text-[11px] border rounded px-2 py-1 flex-1 min-w-0"
                                    placeholder={entry.placeholder ?? ''}
                                    value={String(v ?? '')}
                                    onChange={(e) => setProp(entry.key, e.target.value)}
                                />
                            </Row>
                        );
                    }

                    if (entry.type === 'select') {
                        const v = getCurrent(entry.key);
                        const opts = entry.options ?? [];
                        const current = v ?? (opts[0]?.value ?? '');
                        return (
                            <Row key={entry.key}>
                                <Label>{entry.label ?? entry.key}</Label>
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
                            </Row>
                        );
                    }

                    // 확장 타입은 안전하게 무시
                    return null;
                })}
            </div>
        </section>
    );
}

export default PropsAutoSection;