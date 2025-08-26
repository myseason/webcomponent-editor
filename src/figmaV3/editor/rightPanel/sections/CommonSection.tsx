'use client';

/**
 * CommonSection
 * - 기본 속성 + As(Tag, TagPolicy 적용) + 정적 Tag Attributes 편집
 * - id(attr): 최상단, 기본값(node.id) 자동 채움. 수정 시 __tagAttrs.id 로 저장
 * - name/slotId: node.props 에 저장
 * - As(Tag): getAllowedTagsForBase(defId)로 허용 태그, getTagPolicy(tag, project.tagPolicies)로 정책 확인
 * - Tag Attributes 박스:
 *   · 상단 제목줄 + 내부 리스트(max-h + overflow-auto)
 *   · id 키는 제외(상단 전용 필드), 나머지 key/value 편집
 *   · add: key, value, 추가 버튼 한 줄 배치
 *   · 적용 버튼 왼쪽에 안내 문구 표시
 * - 동적 전환/표현식은 ActionsPanel에서 처리
 */

import * as React from 'react';
import { useEditor } from '../../useEditor';
import { getDefinition } from '../../../core/registry';
import { getAllowedTagsForBase, getTagPolicy } from '../../../runtime/capabilities';
import type { NodeId, TagPolicyMap } from '../../../core/types';

type AttrMap = Record<string, string>;

function SectionTitle({ children }: { children: React.ReactNode }) {
    return <div className="text-[11px] font-semibold text-neutral-700 px-1 mb-1">{children}</div>;
}
function Row({ children }: { children: React.ReactNode }) {
    return <div className="flex items-center gap-2 px-1 py-0.5">{children}</div>;
}
function Label({ children }: { children: React.ReactNode }) {
    return <div className="text-xs w-24 shrink-0 text-neutral-500 select-none">{children}</div>;
}

export function CommonSection({ nodeId, defId }: { nodeId: NodeId; defId: string }) {
    const state = useEditor();
    const node = state.project.nodes[nodeId];
    const def = getDefinition(defId);

    // 현재 props / tagAttrs 스냅샷
    const propsObj = (node.props ?? {}) as Record<string, unknown>;
    const initialAttrs = (propsObj.__tagAttrs as AttrMap | undefined) ?? {};

    // ─────────────────────────────────────────────
    // 1) id(attr) — 최상단, 기본값(node.id) 사용
    // ─────────────────────────────────────────────
    const defaultElemId = String(initialAttrs.id ?? node.id);
    const [elemId, setElemId] = React.useState<string>(defaultElemId);

    // ─────────────────────────────────────────────
    // 2) 기본 속성(name, slotId)
    // ─────────────────────────────────────────────
    const [name, setName] = React.useState<string>(String(propsObj.name ?? ''));
    const [slotId, setSlotId] = React.useState<string>(String(propsObj.slotId ?? ''));

    // 노드가 바뀌면 로컬 상태 동기화 (불필요한 재초기화 방지: nodeId만 의존)
    React.useEffect(() => {
        const p = (state.project.nodes[nodeId].props ?? {}) as Record<string, unknown>;
        const a = (p.__tagAttrs as AttrMap | undefined) ?? {};
        setElemId(String((a.id as string | undefined) ?? state.project.nodes[nodeId].id));
        setName(String(p.name ?? ''));
        setSlotId(String(p.slotId ?? ''));
    }, [nodeId]);

    // 저장(블러 시 적용)
    const saveBasic = () => {
        // name, slotId 저장
        const patchProps: Record<string, unknown> = { name, slotId };
        state.updateNodeProps(nodeId, patchProps);

        // id(attr) 저장 → __tagAttrs.id
        const curAttrs = ((state.project.nodes[nodeId].props ?? {}) as Record<string, unknown>).__tagAttrs as
            | AttrMap
            | undefined;
        const nextAttrs: AttrMap = { ...(curAttrs ?? {}) };
        if (elemId && elemId.trim()) nextAttrs.id = elemId.trim();
        else delete nextAttrs.id;
        state.updateNodeProps(nodeId, { __tagAttrs: nextAttrs });
    };

    // ─────────────────────────────────────────────
    // 3) As(Tag) with TagPolicy
    // ─────────────────────────────────────────────
    const tagPolicies: TagPolicyMap | undefined = state.project.tagPolicies;
    const allowedTags = getAllowedTagsForBase(defId); // base whitelist (ex: box → ['div','section','span'])
    const defaultTag = (def?.capabilities?.defaultTag) ?? 'div';

    const currentTag = String((propsObj.__tag as string | undefined) ?? defaultTag);
    const [selTag, setSelTag] = React.useState<string>(currentTag);

    React.useEffect(() => setSelTag(currentTag), [currentTag, nodeId]);

    const policyFor = (t: string) => getTagPolicy(t, tagPolicies); // 프로젝트 오버라이드 없으면 기본 정책으로 폴백
    const canUse = (t: string) => !!policyFor(t);

    const applyTag = () => {
        if (!selTag) return;
        if (!canUse(selTag)) {
            alert(`허용되지 않은 태그입니다: <${selTag}> (TagPolicy)`);
            return;
        }
        state.updateNodeProps(nodeId, { __tag: selTag });
    };

    // ─────────────────────────────────────────────
    // 4) Tag Attributes 박스 (id 제외)
    // ─────────────────────────────────────────────
    const tagAttrs = (propsObj.__tagAttrs as AttrMap | undefined) ?? {};
    const nonIdEntries = Object.entries(tagAttrs).filter(([k]) => k !== 'id');

    const [rows, setRows] = React.useState<Array<{ key: string; value: string }>>(
        () => nonIdEntries.map(([k, v]) => ({ key: k, value: String(v ?? '') }))
    );
    const [draft, setDraft] = React.useState<{ key: string; value: string }>({ key: '', value: '' });

    // nodeId 변할 때만 초기화(창 리사이즈 등으로 사라지는 현상 방지)
    React.useEffect(() => {
        const p = (state.project.nodes[nodeId].props ?? {}) as Record<string, unknown>;
        const a = (p.__tagAttrs as AttrMap | undefined) ?? {};
        const list = Object.entries(a)
            .filter(([k]) => k !== 'id')
            .map(([k, v]) => ({ key: k, value: String(v ?? '') }));
        setRows(list);
    }, [nodeId]);

    const existsKey = (k: string, exceptIndex: number | null = null) =>
        rows.some((r, i) => r.key === k && i !== exceptIndex);

    const saveAttrs = () => {
        // 표 + 상단 elemId 동기화하여 저장
        const cleaned = rows
            .map(({ key, value }) => ({ key: key.trim(), value }))
            .filter((r) => r.key.length > 0);

        const dup = new Set<string>();
        for (const r of cleaned) {
            if (dup.has(r.key)) {
                alert(`중복 key: ${r.key}`);
                return;
            }
            dup.add(r.key);
        }

        const next: AttrMap = {};
        // 상단 id 반영
        if (elemId && elemId.trim()) next.id = elemId.trim();

        // 나머지 키 채우기
        cleaned.forEach(({ key, value }) => {
            if (key !== 'id') next[key] = value;
        });

        state.updateNodeProps(nodeId, { __tagAttrs: next });
    };

    const addDraft = () => {
        const k = draft.key.trim();
        if (!k) return;
        if (k === 'id') {
            alert('id는 상단 필드에서 관리됩니다.');
            return;
        }
        if (existsKey(k)) {
            alert('이미 존재하는 key 입니다.');
            return;
        }
        setRows([...rows, { key: k, value: draft.value }]);
        setDraft({ key: '', value: '' });
    };
    const removeAt = (idx: number) => setRows(rows.filter((_, i) => i !== idx));

    return (
        <section className="space-y-4">
            {/* ── 기본 속성: id(attr) 최상단 ───────────────────────── */}
            <div>
                <SectionTitle>Common</SectionTitle>

                <Row>
                    <Label>id (attr)</Label>
                    <input
                        className="text-[11px] border rounded px-2 py-1 flex-1 min-w-0"
                        placeholder={node.id}
                        value={elemId}
                        onChange={(e) => setElemId(e.target.value)}
                        onBlur={saveBasic}
                        title="실제 HTML id 속성(__tagAttrs.id). 비우면 내부 기본값(node.id)로 동작"
                    />
                </Row>

                <Row>
                    <Label>name</Label>
                    <input
                        className="text-[11px] border rounded px-2 py-1 flex-1 min-w-0"
                        placeholder="ex) Button A"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={saveBasic}
                    />
                </Row>

                <Row>
                    <Label>slotId</Label>
                    <input
                        className="text-[11px] border rounded px-2 py-1 flex-1 min-w-0"
                        placeholder="slot identifier"
                        value={slotId}
                        onChange={(e) => setSlotId(e.target.value)}
                        onBlur={saveBasic}
                    />
                </Row>
            </div>

            {/* ── As(Tag) with TagPolicy ───────────────────────────── */}
            <div>
                <Row>
                    <Label>As (Tag)</Label>
                    <select
                        className="text-[11px] border rounded px-2 py-1"
                        value={selTag}
                        onChange={(e) => setSelTag(e.target.value)}
                        title={
                            allowedTags.length === 0
                                ? '허용 태그가 없습니다(컴포넌트 화이트리스트 확인).'
                                : undefined
                        }
                    >
                        {allowedTags.map((t) => {
                            const enabled = canUse(t);
                            return (
                                <option key={t} value={t} disabled={!enabled}>
                                    {t}{!enabled ? ' (policy: off)' : ''}
                                </option>
                            );
                        })}
                    </select>

                    <button
                        type="button"
                        className="text-[11px] px-2 py-1 border rounded hover:bg-neutral-50"
                        onClick={applyTag}
                        disabled={allowedTags.every((t) => !canUse(t))}
                        title={
                            allowedTags.every((t) => !canUse(t))
                                ? 'TagPolicy에 허용된 태그가 없습니다'
                                : '선택한 태그 적용'
                        }
                    >
                        적용
                    </button>

                    {/* 안내 문구: 버튼 오른쪽 */}
                    <span className="text-[10px] text-neutral-400 ml-2">"적용"을 눌러야 반영됩니다.</span>
                </Row>
            </div>

            {/* ── Tag Attributes: 박스로 구분(리스트 + add 한 줄) ── */}
            <div className="rounded-md border border-neutral-200 bg-white/60 overflow-hidden">
                <div className="px-2 py-1 border-b text-[11px] font-medium text-neutral-700">Tag Attributes</div>

                <div className="p-2 space-y-2">
                    {/* 리스트: 높이 제한 + 스크롤 */}
                    <div className="max-h-44 overflow-auto space-y-1">
                        {rows.length === 0 && (
                            <div className="text-[11px] text-neutral-400 px-1">속성이 없습니다. 아래에서 추가하세요.</div>
                        )}

                        {rows.map((r, i) => {
                            const dup = r.key.trim().length > 0 && existsKey(r.key, i);
                            return (
                                <div className="flex items-center gap-2" key={`${r.key}-${i}`}>
                                    <input
                                        className={`text-[11px] border rounded px-2 py-1 w-36 ${dup ? 'border-red-400' : ''}`}
                                        placeholder="key"
                                        value={r.key}
                                        onChange={(e) =>
                                            setRows(rows.map((x, idx) => (idx === i ? { ...x, key: e.target.value } : x)))
                                        }
                                        title={dup ? '중복 key' : r.key}
                                    />
                                    <input
                                        className="text-[11px] border rounded px-2 py-1 flex-1 min-w-0"
                                        placeholder="value"
                                        value={r.value}
                                        onChange={(e) =>
                                            setRows(rows.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)))
                                        }
                                    />
                                    <button
                                        type="button"
                                        className="text-[11px] px-2 py-1 border rounded hover:bg-neutral-50"
                                        onClick={() => removeAt(i)}
                                        title="삭제"
                                    >
                                        삭제
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* add: 한 줄 배치 */}
                    <div className="flex items-center gap-2">
                        <input
                            className="text-[11px] border rounded px-2 py-1 w-36"
                            placeholder="key"
                            value={draft.key}
                            onChange={(e) => setDraft({ ...draft, key: e.target.value })}
                        />
                        <input
                            className="text-[11px] border rounded px-2 py-1 flex-1 min-w-0"
                            placeholder="value"
                            value={draft.value}
                            onChange={(e) => setDraft({ ...draft, value: e.target.value })}
                        />
                        <button
                            type="button"
                            className="text-[11px] px-2 py-1 border rounded hover:bg-neutral-50"
                            onClick={addDraft}
                        >
                            추가
                        </button>
                    </div>

                    {/* 적용: 왼쪽에 안내 문구 + 오른쪽 버튼 */}
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-neutral-400">"적용"을 눌러야 반영됩니다.</span>
                        <button
                            type="button"
                            className="text-[11px] px-2 py-1 border rounded hover:bg-neutral-50"
                            onClick={saveAttrs}
                        >
                            적용
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}