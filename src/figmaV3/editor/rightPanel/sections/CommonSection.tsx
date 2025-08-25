'use client';
/**
 * Inspector > CommonSection
 * - 공통 속성: id(읽기), __name, __slotId, __tag, __tagAttrs
 * - __tag: 컴포넌트 capability(허용 태그) 기반 드롭다운
 * - __tagAttrs: TagPolicy.allowedAttributes 기반 KV 편집
 *
 * 규칙
 * - 훅은 최상위
 * - any 금지
 * - 얕은 복사 update 시그니처 사용
 */
import React from 'react';
import { useEditor } from '../../useEditor';
import type { EditorState, NodeId, NodePropsWithMeta, TagPolicyMap } from '../../../core/types';
import { getAllowedTagsForBase, getTagPolicy } from '../../../runtime/capabilities';

export function CommonSection() {
    const state = useEditor();
    const nodeId: NodeId = state.ui.selectedId ?? state.project.rootId;
    const node = state.project.nodes[nodeId];

    // 안전 캐스팅(메타 접근)
    const props = (node.props as NodePropsWithMeta) ?? {};
    const currentTag = props.__tag ?? getAllowedTagsForBase(node.componentId)[0] ?? 'div';

    const projectPolicies: TagPolicyMap | undefined = state.project.tagPolicies;
    const tagPolicy = getTagPolicy(currentTag, projectPolicies);
    const allowedAttrs = tagPolicy?.allowedAttributes ?? [];

    const onChangeMeta = (patch: Partial<NodePropsWithMeta>) => {
        state.update((s: EditorState) => {
            const n = s.project.nodes[nodeId];
            if (!n) return;
            s.project.nodes = {
                ...s.project.nodes,
                [nodeId]: { ...n, props: { ...n.props, ...patch } },
            };
        });
    };

    const onChangeTag = (tag: string) => {
        // 태그 변경 시, 허용되지 않은 attribute들은 즉시 제거하여 정합성 유지
        const newPolicy = getTagPolicy(tag, projectPolicies);
        const allowSet = new Set(newPolicy?.allowedAttributes ?? []);
        const nextAttrs = Object.fromEntries(
            Object.entries(props.__tagAttrs ?? {}).filter(([k]) => allowSet.has(k))
        );
        onChangeMeta({ __tag: tag, __tagAttrs: nextAttrs });
    };

    const allowedTags = getAllowedTagsForBase(node.componentId);

    // __tagAttrs 편집 로컬 상태 (apply로 커밋)
    const [draft, setDraft] = React.useState<Record<string,string>>(() => ({ ...(props.__tagAttrs ?? {}) }));
    React.useEffect(() => {
        // 선택 노드/태그 바뀌면 동기화
        setDraft({ ...(props.__tagAttrs ?? {}) });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodeId, currentTag]);

    const unusedAttrOptions = allowedAttrs.filter(a => !(a in draft));

    const onApplyAttrs = () => onChangeMeta({ __tagAttrs: { ...draft } });

    return (
        <div className="p-2">
            <div className="text-[11px] font-semibold text-gray-600 mb-1">Common</div>

            {/* ID (읽기 전용) */}
            <div className="mb-2">
                <label className="block text-[11px] text-gray-500 mb-1">ID</label>
                <input className="w-full border rounded px-2 py-1 text-sm bg-gray-50" value={node.id} readOnly />
            </div>

            {/* Name */}
            <div className="mb-2">
                <label className="block text-[11px] text-gray-500 mb-1">Name</label>
                <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={props.__name ?? ''}
                    onChange={(e) => onChangeMeta({ __name: e.target.value })}
                />
            </div>

            {/* Slot Id */}
            <div className="mb-2">
                <label className="block text-[11px] text-gray-500 mb-1">Slot</label>
                <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={props.__slotId ?? ''}
                    onChange={(e) => onChangeMeta({ __slotId: e.target.value })}
                    placeholder="ex) header, footer..."
                />
            </div>

            {/* Tag */}
            <div className="mb-2">
                <label className="block text-[11px] text-gray-500 mb-1">Tag</label>
                <select
                    className="w-full border rounded px-2 py-1 text-sm bg-white"
                    value={currentTag}
                    onChange={(e) => onChangeTag(e.target.value)}
                >
                    {allowedTags.map((t) => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>
                {tagPolicy?.isVoid && (
                    <div className="mt-1 text-[11px] text-amber-700">This is a void element. Children are not allowed.</div>
                )}
            </div>

            {/* Tag Attributes (KV) */}
            <div className="mb-2">
                <div className="flex items-center justify-between">
                    <label className="block text-[11px] text-gray-500">Tag Attributes</label>
                    <button
                        className="text-[11px] border rounded px-2 py-0.5"
                        onClick={onApplyAttrs}
                        title="Apply attributes to node props"
                    >
                        Apply
                    </button>
                </div>

                {/* 추가 가능한 attr */}
                <div className="flex gap-2 mt-1">
                    <select
                        className="border rounded px-2 py-1 text-sm bg-white"
                        value=""
                        onChange={(e) => {
                            const k = e.target.value;
                            if (!k) return;
                            setDraft((prev) => ({ ...prev, [k]: '' }));
                            e.currentTarget.value = '';
                        }}
                    >
                        <option value="">+ Add attribute</option>
                        {unusedAttrOptions.map((a) => (
                            <option key={a} value={a}>{a}</option>
                        ))}
                    </select>
                </div>

                {/* 현재 attr 리스트 */}
                <div className="mt-2 space-y-1">
                    {Object.entries(draft).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-2">
                            <span className="text-[12px] w-36 truncate">{k}</span>
                            <input
                                className="flex-1 border rounded px-2 py-1 text-sm"
                                value={v}
                                onChange={(e) => setDraft((prev) => ({ ...prev, [k]: e.target.value }))}
                            />
                            <button
                                className="text-[12px] border rounded px-2 py-1"
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
                        <div className="text-[12px] text-gray-500">No attributes set. Add from the dropdown above.</div>
                    )}
                </div>
            </div>
        </div>
    );
}