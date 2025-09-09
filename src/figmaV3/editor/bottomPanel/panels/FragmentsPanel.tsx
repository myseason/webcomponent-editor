'use client';
/**
 * FragmentsPanel
 * - 프래그먼트 생성/이름 변경/삭제/미리보기(오버레이 Open) + (열린 경우) Close
 * - 훅 규칙: 최상위에서만 호출. map 내부에서는 훅 호출 금지 → FragmentRow로 분리
 */
import React, { useMemo, useState } from 'react';
import type { ActionStep, EditorState, FlowEdge, Fragment, Node } from '../../../core/types';
import { useBottomPanelController } from '@/figmaV3/controllers/bottom/BottomPanelController';

export function FragmentsPanel() {
    // 최상위 훅들만 사용
    const { reader, writer } = useBottomPanelController();

    // 호환 접근(getUI/getProject 우선, 구형 시그니처 폴백)
    const ui = (reader as any).getUI?.() ?? (reader as any).ui?.();
    const project = (reader as any).getProject?.() ?? (reader as any).project?.();
    const flowEdges: Record<string, FlowEdge> =
        (reader as any).flowEdges?.() ?? {};

    // refs 카운트(Flows + Actions) — useMemo로 계산 비용 절감
    const refCountById = useMemo<Record<string, number>>(() => {
        const counts: Record<string, number> = Object.create(null);

        // (a) FlowEdges
        const edges: FlowEdge[] = Object.values(flowEdges);
        for (const e of edges) {
            if (e.to.kind === 'OpenFragment') {
                counts[e.to.fragmentId] = (counts[e.to.fragmentId] ?? 0) + 1;
            } else if (e.to.kind === 'CloseFragment' && e.to.fragmentId) {
                counts[e.to.fragmentId] = (counts[e.to.fragmentId] ?? 0) + 1;
            }
        }

        // (b) Node actions(__actions)
        const nodes = project.nodes ?? {};
        for (const node of Object.values(nodes) as Node[]) {
            const bag = (node.props as Record<string, unknown>).__actions as
                | Record<string, { steps: ActionStep[] }>
                | undefined;
            if (!bag) continue;
            for (const v of Object.values(bag)) {
                for (const s of v.steps) {
                    if (s.kind === 'OpenFragment') {
                        counts[s.fragmentId] = (counts[s.fragmentId] ?? 0) + 1;
                    } else if (s.kind === 'CloseFragment' && s.fragmentId) {
                        counts[s.fragmentId] = (counts[s.fragmentId] ?? 0) + 1;
                    }
                }
            }
        }

        return counts;
    }, [flowEdges, project.nodes]);

    // 열린 오버레이 집합
    const openSet = useMemo<Set<string>>(
        () => new Set(ui?.overlays ?? []),
        [ui?.overlays]
    );

    // 생성 폼 상태
    const [newName, setNewName] = useState<string>('');

    const onCreate = () => {
        const name =
            (newName || '').trim() || `Fragment ${project.fragments.length + 1}`;
        (writer as any).addFragment?.(name);
        setNewName('');
    };

    const onOpen = (fragmentId: string) =>
        (writer as any).openFragment?.(fragmentId);

    const onClose = (fragmentId: string) =>
        (writer as any).closeFragment?.(fragmentId);

    const onDelete = (fragmentId: string) => {
        const used = refCountById[fragmentId] ?? 0;
        if (
            used > 0 &&
            !confirm(
                `이 프래그먼트를 참조하는 항목이 ${used}개 있습니다.\n그래도 삭제하시겠습니까?`
            )
        ) {
            return;
        }
        (writer as any).closeFragment?.(fragmentId);
        (writer as any).removeFragment?.(fragmentId);
    };

    const onRename = (fragmentId: string, name: string) => {
        const next = name.trim();
        if (!next) return;
        (writer as any).update?.((s: EditorState) => {
            s.project.fragments = s.project.fragments.map((f) =>
                f.id === fragmentId ? { ...f, name: next } : f
            );
        });
    };

    const frags: Fragment[] = project.fragments ?? [];

    return (
        <div className="p-3 space-y-3">
            <div className="text-xs font-semibold text-gray-500">Fragments</div>

            {/* 생성 */}
            <div className="flex items-center gap-2">
                <input
                    className="flex-1 border rounded px-2 py-1 text-xs"
                    placeholder="Fragment name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                />
                <button className="text-xs border rounded px-2 py-1" onClick={onCreate}>
                    + New
                </button>
            </div>

            {/* 리스트 */}
            <div className="space-y-2">
                {frags.length === 0 && (
                    <div className="text-xs text-gray-400">
                        프래그먼트가 없습니다. 위에서 생성하세요.
                    </div>
                )}
                {frags.map((f) => (
                    <FragmentRow
                        key={f.id} // ← key로 인스턴스/훅 상태 안정화
                        frag={f}
                        opened={openSet.has(f.id)}
                        refsCount={refCountById[f.id] ?? 0}
                        onOpen={onOpen}
                        onClose={onClose}
                        onRename={onRename}
                        onDelete={onDelete}
                    />
                ))}
            </div>
        </div>
    );
}

/** 개별 프래그먼트 행 — map 밖으로 분리하여 내부에서 훅 사용 */
function FragmentRow({
                         frag,
                         opened,
                         refsCount,
                         onOpen,
                         onClose,
                         onRename,
                         onDelete,
                     }: {
    frag: Fragment;
    opened: boolean;
    refsCount: number;
    onOpen: (id: string) => void;
    onClose: (id: string) => void;
    onRename: (id: string, name: string) => void;
    onDelete: (id: string) => void;
}) {
    // 각 행 컴포넌트의 로컬 상태 — 훅을 여기서 사용(안정)
    const [draft, setDraft] = useState<string>(frag.name ?? '');

    // 외부에서 이름이 바뀐 경우 입력값 동기화
    React.useEffect(() => {
        setDraft(frag.name ?? '');
    }, [frag.id, frag.name]);

    return (
        <div className="border rounded p-2 text-xs flex items-center gap-2">
            <span className="px-1 rounded bg-gray-100 text-gray-700">{frag.id}</span>

            <input
                className="border rounded px-2 py-1 flex-1"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Name"
            />
            <button
                className="border rounded px-2 py-1"
                onClick={() => onRename(frag.id, draft)}
            >
                Apply
            </button>

            {!opened ? (
                <button
                    className="border rounded px-2 py-1"
                    onClick={() => onOpen(frag.id)}
                >
                    Open
                </button>
            ) : (
                <button
                    className="border rounded px-2 py-1"
                    onClick={() => onClose(frag.id)}
                >
                    Close
                </button>
            )}

            <button
                className="border rounded px-2 py-1 text-red-600"
                onClick={() => onDelete(frag.id)}
            >
                Delete
            </button>

            <span className="ml-2 text-[10px] text-gray-500">{refsCount} refs</span>
            {opened && (
                <span className="text-[10px] ml-1 px-1 rounded bg-emerald-50 text-emerald-700">
          open
        </span>
            )}
        </div>
    );
}