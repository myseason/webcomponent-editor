import * as React from 'react';
import { useEditor } from '../../useEditor';
import { getDefinition } from '../../../core/registry';
import { effectiveTag, isAttrAllowedByPolicy } from '../../../runtime/capabilities';
import {JSX} from "react";

/** 동일 섹션 타이틀 스타일(StylesSection 계열과 톤 맞춤) */
const SectionTitle: React.FC<{ label: string; className?: string }> = ({ label, className }) => (
    <div className={`flex items-center gap-2 select-none ${className ?? ''}`}>
        <span className="text-[12px] font-semibold text-gray-700">{label}</span>
        <div className="h-[1px] bg-gray-200 flex-1" />
    </div>
);

/** key-value row */
type KV = { key: string; value: string };

/** 라벨/필드 공통 레이아웃 */
const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="flex items-center gap-2 px-1">
        <label className="text-xs w-20 text-neutral-500">{label}</label>
        <div className="flex-1 min-w-0">{children}</div>
    </div>
);

export function CommonSection(): JSX.Element {
    const state = useEditor();

    // 현재 선택 노드 (없으면 root)
    const nodeId = state.ui.selectedId ?? state.project.rootId;
    const node = state.project.nodes[nodeId];
    const def = getDefinition(node.componentId);
    const proj = state.project;

    // props 안전 캐스팅
    const props = (node.props ?? {}) as Record<string, unknown>;

    // ── 공통 필드: 읽기/쓰기
    const nodeIdReadable = node.id;
    const nodeName = String(props.name ?? '');
    const slotId = String(props.slotId ?? '');

    // ── As (=Tag)
    const tag = effectiveTag(node, def);
    const allowedTags = (def?.capabilities?.allowedTags?.length
        ? def.capabilities!.allowedTags
        : [def?.capabilities?.defaultTag ?? 'div']) as string[];

    const onChangeName = (e: React.ChangeEvent<HTMLInputElement>) => {
        state.updateNodeProps(nodeId, { name: e.currentTarget.value });
    };

    const onChangeSlotId = (e: React.ChangeEvent<HTMLInputElement>) => {
        state.updateNodeProps(nodeId, { slotId: e.currentTarget.value });
    };

    const onChangeTag = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const next = e.currentTarget.value;
        state.updateNodeProps(nodeId, { __tag: next });
        // Phase1: 정책 위반은 차단하지 않고 경고 표시만 유지
        // 필요 시 여기서 태그 전환 부작용 정리 로직(예: a가 아니면 href/target 제거) 추가 가능
    };

    // ── Tag Attributes
    const tagAttrs: Record<string, string> = (props.__tagAttrs as Record<string, string> | undefined) ?? {};
    const rows: KV[] = Object.entries(tagAttrs).map(([k, v]) => ({ key: k, value: v }));

    const addAttr = () => {
        const base = 'data-attr';
        let k = base;
        let i = 1;
        while (tagAttrs[k] !== undefined) k = `${base}-${i++}`;
        state.updateNodeProps(nodeId, { __tagAttrs: { ...tagAttrs, [k]: '' } });
    };

    const updateKey = (oldKey: string, newKeyRaw: string) => {
        const newKey = newKeyRaw.trim();
        if (!newKey || newKey === oldKey) return;
        if (tagAttrs[newKey] !== undefined) {
            alert('이미 존재하는 속성 키입니다.');
            return;
        }
        const next: Record<string, string> = {};
        for (const [k, v] of Object.entries(tagAttrs)) {
            next[k === oldKey ? newKey : k] = v;
        }
        state.updateNodeProps(nodeId, { __tagAttrs: next });
    };

    const updateVal = (k: string, v: string) => {
        if (tagAttrs[k] === v) return;
        state.updateNodeProps(nodeId, { __tagAttrs: { ...tagAttrs, [k]: v } });
    };

    const removeAttr = (k: string) => {
        const next = { ...tagAttrs };
        delete next[k];
        state.updateNodeProps(nodeId, { __tagAttrs: next });
    };

    return (
        <section className="space-y-2">
            {/* 구분선 스타일(Inspector 전체 톤과 맞춤) */}
            <SectionTitle label="common" />
            {/* ID (읽기 전용) */}
            <Row label="ID">
                <div className="text-[11px] text-neutral-500 truncate" title={nodeIdReadable}>
                    {nodeIdReadable}
                </div>
            </Row>

            {/* Name */}
            <Row label="Name">
                <input
                    className="text-[11px] border rounded px-2 py-1 w-full"
                    value={nodeName}
                    onChange={onChangeName}
                    placeholder="optional name"
                />
            </Row>

            {/* Slot Id */}
            <Row label="Slot Id">
                <input
                    className="text-[11px] border rounded px-2 py-1 w-full"
                    value={slotId}
                    onChange={onChangeSlotId}
                    placeholder="slot id (for composition)"
                />
            </Row>

            {/* As (= Tag) */}
            <Row label="As (Tag)">
                <div className="flex items-center gap-2">
                    <select
                        className="text-xs border rounded px-2 py-1"
                        value={tag}
                        onChange={onChangeTag}
                    >
                        {allowedTags.map((t) => (
                            <option key={t} value={t}>
                                {t}
                            </option>
                        ))}
                    </select>

                    {/* 정책 힌트: 현재 태그 기준 */}
                    <span className="text-[10px] text-neutral-400">
            Allowed by component: {allowedTags.join(', ')}
          </span>
                </div>
            </Row>

            {/* Tag Attributes */}
            <div className="px-1">
                <div className="flex items-center justify-between mb-1">
                    <div className="text-xs text-neutral-500">Tag Attributes</div>
                    <button
                        className="text-[11px] px-2 py-1 border rounded hover:bg-neutral-50"
                        onClick={addAttr}
                        type="button"
                    >
                        + add
                    </button>
                </div>

                <div className="space-y-1">
                    {rows.length === 0 && (
                        <div className="text-[11px] text-neutral-400">No attributes</div>
                    )}

                    {rows.map(({ key, value }) => {
                        const allowedByPolicy = isAttrAllowedByPolicy(proj, tag, key);
                        return (
                            <div key={key} className="flex items-center gap-2">
                                <input
                                    className="text-[11px] border rounded px-2 py-1 w-36"
                                    defaultValue={key}
                                    onBlur={(e) => updateKey(key, e.currentTarget.value)}
                                    placeholder="key"
                                />
                                <input
                                    className="text-[11px] border rounded px-2 py-1 flex-1"
                                    value={value}
                                    onChange={(e) => updateVal(key, e.currentTarget.value)}
                                    placeholder="value"
                                />
                                {!allowedByPolicy && (
                                    <span
                                        title="TagPolicy에 없는 속성입니다. 렌더/익스포트 시 무시될 수 있습니다."
                                        className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-300"
                                    >
                    not in policy
                  </span>
                                )}
                                <button
                                    className="text-[11px] px-2 py-1 border rounded hover:bg-red-50"
                                    onClick={() => removeAttr(key)}
                                    type="button"
                                >
                                    remove
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}