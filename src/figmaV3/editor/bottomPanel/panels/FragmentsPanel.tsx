'use client';
/**
 * FragmentsPanel
 * - 프래그먼트 생성/이름 변경/삭제/미리보기(오버레이 Open) 기능을 제공합니다.
 * - Store 액션 사용:
 *   - addFragment(name)        : 새 프래그먼트 추가
 *   - removeFragment(id)       : 프래그먼트 삭제
 *   - openFragment(id)         : 오버레이 스택에 push
 *   - closeFragment([id])      : 오버레이 스택에서 pop 또는 특정 id 제거
 * - 얕은 복사 update() 규약:
 *   - 이름 변경은 project.fragments 배열을 map으로 교체하여 적용
 * - any 금지 / 훅 규칙: 모든 훅은 최상위에서만 호출
 */
import React, { useMemo, useState } from 'react';
import { useEditor } from '../../useEditor';
import type { ActionStep, FlowEdge, Fragment } from '../../../core/types';

export function FragmentsPanel() {
    // 1) 훅은 최상위에서 호출
    const state = useEditor();

    // 2) 파생 데이터: 참조 카운트 (Flows + Actions)
    const refCountById = useMemo<Record<string, number>>(() => {
        const counts: Record<string, number> = Object.create(null);

        // (a) FlowEdges에서 Open/CloseFragment 대상 카운트
        const edges: FlowEdge[] = Object.values(state.flowEdges);
        for (const e of edges) {
            if (e.to.kind === 'OpenFragment') {
                const id = e.to.fragmentId;
                counts[id] = (counts[id] ?? 0) + 1;
            } else if (e.to.kind === 'CloseFragment') {
                // 명시 id가 있으면 해당 id 카운트, 없으면 top-close라 특정 id에 귀속하지 않음
                if (e.to.fragmentId) {
                    const id = e.to.fragmentId;
                    counts[id] = (counts[id] ?? 0) + 1;
                }
            }
        }

        // (b) 각 노드 actions(__actions)에서 Open/CloseFragment 스텝 카운트
        const nodes = state.project.nodes;
        for (const node of Object.values(nodes)) {
            const actionsBag = (node.props as Record<string, unknown>).__actions as
                | Record<string, { steps: ActionStep[] }>
                | undefined;
            if (!actionsBag) continue;

            for (const bag of Object.values(actionsBag)) {
                for (const s of bag.steps) {
                    if (s.kind === 'OpenFragment') {
                        const id = s.fragmentId;
                        counts[id] = (counts[id] ?? 0) + 1;
                    } else if (s.kind === 'CloseFragment') {
                        if (s.fragmentId) {
                            const id = s.fragmentId;
                            counts[id] = (counts[id] ?? 0) + 1;
                        }
                    }
                }
            }
        }

        return counts;
    }, [state.flowEdges, state.project.nodes]);

    // 3) 생성용 입력
    const [newName, setNewName] = useState<string>('');

    const onCreate = () => {
        const name = newName.trim() || `Fragment ${state.project.fragments.length + 1}`;
        const id = state.addFragment(name);
        // 생성 직후 미리보기(선택사항): 주석 해제 시 자동 오픈
        // state.openFragment(id);
        void id; // 사용하지 않아도 경고 방지
        setNewName('');
    };

    const onOpen = (fragmentId: string) => state.openFragment(fragmentId);

    const onDelete = (fragmentId: string) => {
        const used = refCountById[fragmentId] ?? 0;
        if (used > 0) {
            const ok = confirm(
                `이 프래그먼트를 참조하는 항목이 ${used}개 있습니다.\n그래도 삭제하시겠습니까?`,
            );
            if (!ok) return;
        }
        // 오버레이에 떠 있다면 우선 닫음
        state.closeFragment(fragmentId);
        state.removeFragment(fragmentId);
    };

    const onRename = (fragmentId: string, name: string) => {
        const nextName = name.trim();
        if (!nextName) return;
        state.update((s) => {
            s.project.fragments = s.project.fragments.map((f) =>
                f.id === fragmentId ? { ...f, name: nextName } : f,
            );
        });
    };

    const frags: Fragment[] = state.project.fragments;

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
                    <div className="text-xs text-gray-400">프래그먼트가 없습니다. 위에서 생성하세요.</div>
                )}
                {frags.map((f) => (
                    <FragmentRow
                        key={f.id}
                        frag={f}
                        refsCount={refCountById[f.id] ?? 0}
                        onOpen={onOpen}
                        onRename={onRename}
                        onDelete={onDelete}
                    />
                ))}
            </div>
        </div>
    );
}

/** 개별 프래그먼트 행 — 훅 사용은 컴포넌트 내부 최상위에서만 */
function FragmentRow({
                         frag,
                         refsCount,
                         onOpen,
                         onRename,
                         onDelete,
                     }: {
    frag: Fragment;
    refsCount: number;
    onOpen: (id: string) => void;
    onRename: (id: string, name: string) => void;
    onDelete: (id: string) => void;
}) {
    const [draft, setDraft] = useState<string>(frag.name ?? '');

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
                title="이름 적용"
            >
                Apply
            </button>

            <button
                className="border rounded px-2 py-1"
                onClick={() => onOpen(frag.id)}
                title="오버레이로 미리보기"
            >
                Open
            </button>

            <button
                className="border rounded px-2 py-1 text-red-600"
                onClick={() => onDelete(frag.id)}
                title="삭제"
            >
                Delete
            </button>

            <span className="ml-2 text-[10px] text-gray-500">{refsCount} refs</span>
        </div>
    );
}