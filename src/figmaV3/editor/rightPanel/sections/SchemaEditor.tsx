'use client';
/**
 * SchemaEditor
 * - 선택 노드의 컴포넌트(defId)에 대한 propsSchema를 프로젝트 단위로 오버라이드합니다.
 * - 테이블 형태로 key/type/label/config(text:placeholder | select:options)/whenExpr를 편집
 * - 저장: state.update(s => s.project.schemaOverrides[defId] = rows)
 *
 * 규약:
 * - 훅 최상위 호출
 * - any 금지
 * - 얕은 복사 update
 */

import React from 'react';
import { getDefinition } from '../../../core/registry';
import type {EditorState, NodeId, PropSchemaEntry} from '../../../core/types';
import {useInspectorController} from "@/figmaV3/controllers/inspector/InspectorFacadeController";

type Row = PropSchemaEntry<Record<string, unknown>>;
type RowText = Extract<Row, { type: 'text' }>;
type RowSelect = Extract<Row, { type: 'select' }>;

/** 유틸: 텍스트/셀렉트 기본 행 */
function emptyTextRow(key = 'prop'): RowText {
    return { key, type: 'text', label: key, placeholder: '', default: '', when: undefined, whenExpr: '' };
}
function emptySelectRow(key = 'prop'): RowSelect {
    return { key, type: 'select', label: key, options: [{ label: 'Option', value: 'value' }], default: '', when: undefined, whenExpr: '' };
}

/** 유틸: 현재 Row를 안전하게 텍스트/셀렉트 행으로 변환(필수 필드 보장) */
function ensureTextRow(r: Row): RowText {
    if (r.type === 'text') return r;
    return {
        key: r.key as RowText['key'],
        type: 'text',
        label: r.label,
        placeholder: '',
        default: r.default,
        when: r.when,
        whenExpr: r.whenExpr,
    };
}
function ensureSelectRow(r: Row): RowSelect {
    if (r.type === 'select') return r;
    return {
        key: r.key as RowSelect['key'],
        type: 'select',
        label: r.label,
        options: [{ label: 'Option', value: 'value' }],
        default: r.default,
        when: r.when,
        whenExpr: r.whenExpr,
    };
}

/** 유틸: 부분 패치를 안전하게 적용(식별자 변경 포함) */
function patchRow(r: Row, patch: Partial<Row>): Row {
    const nextType = (patch.type ?? r.type);
    if (nextType === 'text') {
        const base = ensureTextRow(r);
        const p = patch as Partial<RowText>;
        const next: RowText = {
            key: (p.key ?? base.key) as RowText['key'],
            type: 'text',
            label: p.label ?? base.label,
            placeholder: p.placeholder ?? base.placeholder,
            default: p.default ?? base.default,
            when: p.when ?? base.when,
            whenExpr: p.whenExpr ?? base.whenExpr,
        };
        return next;
    } else {
        const base = ensureSelectRow(r);
        const p = patch as Partial<RowSelect>;
        const next: RowSelect = {
            key: (p.key ?? base.key) as RowSelect['key'],
            type: 'select',
            label: p.label ?? base.label,
            options: p.options ?? base.options,
            default: p.default ?? base.default,
            when: p.when ?? base.when,
            whenExpr: p.whenExpr ?? base.whenExpr,
        };
        return next;
    }
}

/** JSON 옵션 입력을 안전 파싱 */
function parseOptionsJson(src: string): RowSelect['options'] | null {
    try {
        const obj = JSON.parse(src) as unknown;
        if (!Array.isArray(obj)) return null;
        const ok = obj.every(
            (o) =>
                typeof o === 'object' &&
                o !== null &&
                'label' in (o as Record<string, unknown>) &&
                'value' in (o as Record<string, unknown>)
        );
        if (!ok) return null;
        // 타입 단언 없이 좁히기 어려워서 매핑으로 보강
        return (obj as Array<{ label: unknown; value: unknown }>).map((o) => ({
            label: String(o.label),
            value: o.value,
        }));
    } catch {
        return null;
    }
}

export function SchemaEditor({ nodeId }: { nodeId: NodeId }) {

    const { reader, writer } = useInspectorController();
    const R = reader();
    const W = writer();

    // 상태 구독(최상위 훅)
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
    const node = state.project.nodes[nodeId];
    const defId = node.componentId;

    const defBase = getDefinition(defId);
    const projectOverride = state.project.schemaOverrides?.[defId];
    const initialRows = (projectOverride ?? defBase?.propsSchema ?? []) as Row[];

    // 로컬 편집 상태(깊은 복사)
    const [rows, setRows] = React.useState<Row[]>(
        () => initialRows.map((r) => ({ ...r }))
    );

    // defId나 프로젝트 오버라이드가 바뀌면 로컬 상태 갱신
    React.useEffect(() => {
        const fresh = (state.project.schemaOverrides?.[defId] ?? defBase?.propsSchema ?? []) as Row[];
        setRows(fresh.map((r) => ({ ...r })));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defId, state.project.schemaOverrides]);

    // 행 갱신(부분 패치) — 유니온 안전
    const updateRow = (i: number, patch: Partial<Row>) => {
        setRows((prev: Row[]) =>
            prev.map((r, idx) => (idx === i ? patchRow(r, patch) : r))
        );
    };

    // type 변경은 전용 핸들러로 필수 필드 보장
    const changeType = (i: number, t: Row['type']) => {
        setRows((prev: Row[]) =>
            prev.map((r, idx) => {
                if (idx !== i) return r;
                // 임시 객체를 만들지 말고 r 자체를 전달해 안전 변환
                return t === 'text' ? ensureTextRow(r) : ensureSelectRow(r);
            }),
        );
    };

    const onAdd = (kind: 'text' | 'select') =>
        setRows((prev: Row[]) => [...prev, kind === 'text' ? emptyTextRow(`prop${prev.length + 1}`) : emptySelectRow(`prop${prev.length + 1}`)]);

    const onRemove = (i: number) =>
        setRows((prev: Row[]) => prev.filter((_, idx) => idx !== i));

    const move = (i: number, dir: -1 | 1) =>
        setRows((prev: Row[]) => {
            const next = [...prev];
            const j = i + dir;
            if (j < 0 || j >= next.length) return prev;
            const t = next[i];
            next[i] = next[j];
            next[j] = t;
            return next;
        });

    const onSave = () => {
        state.update((s: EditorState) => {
            const map = { ...(s.project.schemaOverrides ?? {}) };
            map[defId] = rows;
            s.project.schemaOverrides = map;
        });
    };

    const onReset = () => {
        state.update((s: EditorState) => {
            const map = { ...(s.project.schemaOverrides ?? {}) };
            delete map[defId];
            s.project.schemaOverrides = map;
        });
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center text-xs">
                <div className="font-semibold text-gray-500">Schema ( {defId} )</div>
                <div className="ml-auto flex gap-2">
                    <button className="border rounded px-2 py-1" onClick={() => onAdd('text')}>+ text</button>
                    <button className="border rounded px-2 py-1" onClick={() => onAdd('select')}>+ select</button>
                </div>
            </div>

            <div className="border rounded">
                <div className="grid grid-cols-12 gap-2 px-2 py-1 text-[11px] bg-gray-50">
                    <div className="col-span-2">key</div>
                    <div className="col-span-1">type</div>
                    <div className="col-span-2">label</div>
                    <div className="col-span-3">config</div>
                    <div className="col-span-3">whenExpr</div>
                    <div className="col-span-1 text-right">act</div>
                </div>

                {rows.map((r, i) => (
                    <div key={`${String(r.key)}-${i}`} className="grid grid-cols-12 gap-2 px-2 py-1 items-center text-[11px] border-t">
                        {/* key */}
                        <input
                            className="col-span-2 border rounded px-2 py-1"
                            value={String(r.key)}
                            onChange={(e) => updateRow(i, { key: e.target.value as Row['key'] })}
                        />

                        {/* type */}
                        <select
                            className="col-span-1 border rounded px-2 py-1"
                            value={r.type}
                            onChange={(e) => changeType(i, e.target.value as Row['type'])}
                        >
                            <option value="text">text</option>
                            <option value="select">select</option>
                        </select>

                        {/* label */}
                        <input
                            className="col-span-2 border rounded px-2 py-1"
                            placeholder="label"
                            value={r.label ?? ''}
                            onChange={(e) => updateRow(i, { label: e.target.value })}
                        />

                        {/* config: text.placeholder or select.options */}
                        {r.type === 'text' ? (
                            <input
                                className="col-span-3 border rounded px-2 py-1"
                                placeholder="placeholder"
                                value={(r as RowText).placeholder ?? ''}
                                onChange={(e) => updateRow(i, { placeholder: e.target.value })}
                            />
                        ) : (
                            <input
                                className="col-span-3 border rounded px-2 py-1 font-mono"
                                placeholder='options JSON ex) [{"label":"A","value":"a"}]'
                                value={JSON.stringify((r as RowSelect).options)}
                                onChange={(e) => {
                                    const parsed = parseOptionsJson(e.target.value);
                                    if (parsed) updateRow(i, { options: parsed });
                                }}
                            />
                        )}

                        {/* whenExpr */}
                        <input
                            className="col-span-3 border rounded px-2 py-1 font-mono"
                            placeholder="ex) data.user == 'admin'"
                            value={r.whenExpr ?? ''}
                            onChange={(e) => updateRow(i, { whenExpr: e.target.value })}
                        />

                        {/* actions */}
                        <div className="col-span-1 flex justify-end gap-1">
                            <button className="border rounded px-2 py-1" onClick={() => move(i, -1)}>↑</button>
                            <button className="border rounded px-2 py-1" onClick={() => move(i, +1)}>↓</button>
                            <button className="border rounded px-2 py-1 text-red-600" onClick={() => onRemove(i)}>✕</button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex gap-2">
                <button className="ml-auto border rounded px-3 py-1 text-xs bg-blue-600 text-white" onClick={onSave}>
                    Save (project override)
                </button>
                <button className="border rounded px-3 py-1 text-xs" onClick={onReset}>
                    Reset to default
                </button>
            </div>
        </div>
    );
}