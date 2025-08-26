'use client';
/**
 * Inspector > CommonSection
 * - 공통 속성: id(읽기), __name, __slotId, __tag, __tagAttrs
 * - __tag: 컴포넌트 capability(허용 태그) 기반 드롭다운
 * - __tagAttrs: TagPolicy.allowedAttributes 기반 KV 편집 + 커스텀(key/value) 추가(허용 attr만)
 *
 * 규칙
 * - 훅은 최상위
 * - any 금지
 * - 얕은 복사 update 시그니처 사용
 */
import React from 'react';
import { useEditor } from '../../useEditor';
import type {
    EditorState,
    NodeId,
    NodePropsWithMeta,
    TagPolicyMap,
} from '../../../core/types';
import { getAllowedTagsForBase, getTagPolicy } from '../../../runtime/capabilities';

export function CommonSection() {
    const state = useEditor();
    const nodeId: NodeId = state.ui.selectedId ?? state.project.rootId;
    const node = state.project.nodes[nodeId];

    // 안전 캐스팅(메타 접근)
    const props = (node.props as NodePropsWithMeta) ?? {};
    const currentTag =
        (props.__tag as string | undefined) ??
        getAllowedTagsForBase(node.componentId)[0] ??
        'div';

    const projectPolicies: TagPolicyMap | undefined = state.project.tagPolicies;
    const tagPolicy = getTagPolicy(currentTag, projectPolicies);
    const allowedAttrs = tagPolicy?.allowedAttributes ?? [];

    const onChangeMeta = (patch: Partial<Record<string, unknown>>) => {
        state.update((s: EditorState) => {
            const n = s.project.nodes[nodeId];
            if (!n) return;
            s.project.nodes = {
                ...s.project.nodes,
                [nodeId]: {
                    ...n,
                    props: { ...n.props, ...patch },
                },
            };
        });
    };

    const onChangeTag = (tag: string) => {
        // 태그 변경 시, 허용되지 않은 attribute들은 즉시 제거하여 정합성 유지
        const newPolicy = getTagPolicy(tag, projectPolicies);
        const allowSet = new Set(newPolicy?.allowedAttributes ?? []);
        const nextAttrs = Object.fromEntries(
            Object.entries((props.__tagAttrs as Record<string, string>) ?? {}).filter(
                ([k]) => allowSet.has(k),
            ),
        );
        onChangeMeta({ __tag: tag, __tagAttrs: nextAttrs });
    };

    const allowedTags = getAllowedTagsForBase(node.componentId);

    // __tagAttrs 편집 로컬 상태 (apply로 커밋)
    const [draft, setDraft] = React.useState<Record<string, string>>(() => ({
        ...(((props.__tagAttrs as Record<string, string>) ?? {}) as Record<
            string,
            string
        >),
    }));

    React.useEffect(() => {
        // 선택 노드/태그 바뀌면 동기화
        setDraft({
            ...(((props.__tagAttrs as Record<string, string>) ?? {}) as Record<
                string,
                string
            >),
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodeId, currentTag]);

    const unusedAttrOptions = allowedAttrs.filter((a) => !(a in draft));
    const onApplyAttrs = () => onChangeMeta({ __tagAttrs: { ...draft } });

    // ✨ 커스텀 key/value 추가 (TagPolicy 허용 항목만)
    const [customKey, setCustomKey] = React.useState('');
    const [customVal, setCustomVal] = React.useState('');
    const addCustomAttr = () => {
        const k = customKey.trim();
        if (!k) return;
        if (!allowedAttrs.includes(k)) {
            alert(`'${k}' 속성은 현재 태그('${currentTag}')에서 허용되지 않습니다(TagPolicy).`);
            return;
        }
        setDraft((prev) => ({ ...prev, [k]: customVal }));
        setCustomKey('');
        setCustomVal('');
    };

    return (
        <section className="space-y-3">
            {/* 타이틀 */}
            <div className="text-sm font-semibold text-gray-700">Common</div>

            {/* ID (읽기 전용) */}
            <div className="grid grid-cols-3 items-center gap-2 text-xs">
                <div className="text-gray-500">ID</div>
                <input
                    className="col-span-2 bg-gray-50 border rounded px-2 py-1"
                    value={nodeId}
                    readOnly
                />
            </div>

            {/* Name */}
            <div className="grid grid-cols-3 items-center gap-2 text-xs">
                <div className="text-gray-500">Name</div>
                <input
                    className="col-span-2 border rounded px-2 py-1"
                    value={String(props.__name ?? '')}
                    onChange={(e) => onChangeMeta({ __name: e.target.value })}
                />
            </div>

            {/* Slot Id */}
            <div className="grid grid-cols-3 items-center gap-2 text-xs">
                <div className="text-gray-500">Slot</div>
                <input
                    className="col-span-2 border rounded px-2 py-1"
                    placeholder="ex) header, footer..."
                    value={String(props.__slotId ?? '')}
                    onChange={(e) => onChangeMeta({ __slotId: e.target.value })}
                />
            </div>

            {/* Tag */}
            <div className="grid grid-cols-3 items-center gap-2 text-xs">
                <div className="text-gray-500">Tag</div>
                <select
                    className="col-span-2 border rounded px-2 py-1"
                    value={currentTag}
                    onChange={(e) => onChangeTag(e.target.value)}
                >
                    {allowedTags.map((t) => (
                        <option key={t} value={t}>
                            {t}
                        </option>
                    ))}
                </select>
            </div>

            {!!tagPolicy?.isVoid && (
                <div className="text-[11px] text-amber-600">
                    This is a void element. Children are not allowed.
                </div>
            )}

            {/* Tag Attributes (KV) */}
            <div className="mt-2 rounded border p-2">
                <div className="flex items-center justify-between">
                    <div className="text-xs font-medium">Tag Attributes</div>
                    <button
                        className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                        onClick={onApplyAttrs}
                        title="Apply attributes to the node"
                    >
                        Apply
                    </button>
                </div>

                {/* 추가 가능한 attr */}
                <div className="flex items-center gap-2 mt-2">
                    <select
                        className="border rounded px-2 py-1 text-xs"
                        defaultValue=""
                        onChange={(e) => {
                            const k = e.target.value;
                            if (!k) return;
                            setDraft((prev) => ({ ...prev, [k]: '' }));
                            e.currentTarget.value = '';
                        }}
                    >
                        <option value="">+ Add attribute</option>
                        {unusedAttrOptions.map((a) => (
                            <option key={a} value={a}>
                                {a}
                            </option>
                        ))}
                    </select>

                    {/* 🔹 커스텀 key/value 추가 */}
                    <input
                        className="border rounded px-2 py-1 text-xs w-10"
                        placeholder="key"
                        value={customKey}
                        onChange={(e) => setCustomKey(e.target.value)}
                    />
                    <input
                        className="border rounded px-2 py-1 text-xs w-10"
                        placeholder="value"
                        value={customVal}
                        onChange={(e) => setCustomVal(e.target.value)}
                    />
                    <button
                        className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                        onClick={addCustomAttr}
                        title="Add custom attribute (must be allowed by TagPolicy)"
                    >
                        + Add
                    </button>
                </div>

                {/* 현재 attr 리스트 */}
                <div className="mt-2 space-y-1">
                    {Object.entries(draft).map(([k, v]) => (
                        <div
                            key={k}
                            className="grid grid-cols-[120px_1fr_auto] items-center gap-2 text-xs"
                        >
                            <div className="truncate text-gray-600">{k}</div>
                            <input
                                className="border rounded px-2 py-1"
                                value={v}
                                onChange={(e) =>
                                    setDraft((prev) => ({ ...prev, [k]: e.target.value }))
                                }
                            />
                            <button
                                className="px-2 py-1 text-[11px] text-red-600 hover:bg-red-50 border rounded"
                                onClick={() =>
                                    setDraft((prev) => {
                                        const next = { ...prev };
                                        delete next[k];
                                        return next;
                                    })
                                }
                                title="Remove attribute"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                    {Object.keys(draft).length === 0 && (
                        <div className="text-[11px] text-gray-500">
                            No attributes set. Add from the dropdown or use custom key/value.
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}