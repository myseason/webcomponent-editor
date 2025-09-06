'use client';

import React from 'react';
import type { Fragment } from '../../core/types';
import { Trash2 } from 'lucide-react';
import { usePaletteFacadeController } from '@/figmaV3/controllers/library/PaletteFacadeController';

/** 검색 매칭 유틸 (기존 로직 유지) */
function itemMatch(title: string, id: string, q: string): boolean {
    const qq = q.trim().toLowerCase();
    if (!qq) return true;
    return title.toLowerCase().includes(qq) || id.toLowerCase().includes(qq);
}

export function Palette({ query = '' }: { query?: string }) {
    // 기존: const state = useEditor();
    // 변경: Palette 전용 파사드 컨트롤러
    const palette = usePaletteFacadeController();
    const R = palette.reader();
    const W = palette.writer();

    // Core 라이브러리 정의 (기존 listDefinitions() 사용과 동일 의미)
    const coreDefs = React.useMemo(
        () => R.listDefinitions().filter((d) => itemMatch(d.title, d.id, query)),
        // R.token()은 Reader 스냅샷 토큰(경량) — 렌더 과민 반응 없이 변화만 캐치
        [query, R] // R은 안정 객체; 필요한 경우 R.token()을 deps에 추가 가능
    );

    // Shared Components (isPublic만)
    const sharedComponents = React.useMemo<Fragment[]>(() => {
        return R.listSharedFragments().filter((f) => f.isPublic);
        // R.token()을 deps로 넣으면 파사드가 의미 변화 시 스냅샷됨
    }, [R]);

    const filteredSharedComponents = React.useMemo(
        () => sharedComponents.filter((c) => itemMatch(c.name, c.id, query)),
        [sharedComponents, query]
    );

    // Core 라이브러리 항목 클릭 핸들러 (부모: selectedId ?? rootId)
    const onInsertCore = React.useCallback(
        (defId: string) => {
            const parent = R.selectedId() ?? R.rootId();
            W.addByDef(defId, parent);
        },
        [R, W]
    );

    // Shared 컴포넌트 삭제 (isAdmin일 때만 버튼 노출)
    const handleDeleteShared = React.useCallback(
        (componentId: string, componentName: string) => {
            if (
                window.confirm(
                    `Are you sure you want to delete the shared component "${componentName}" from the Library?`
                )
            ) {
                W.removeFragment(componentId);
            }
        },
        [W]
    );

    return (
        <div className="space-y-4">
            {/* Core Library */}
            <div>
                <div className="px-3 py-2 text-xs uppercase text-gray-500">Core Library</div>

                {coreDefs.length === 0 && !query ? (
                    <div className="px-3 py-2 text-sm text-gray-400">No components</div>
                ) : (
                    <ul className="px-2 grid grid-cols-2 gap-2">
                        {coreDefs.map((d) => (
                            <li
                                key={d.id}
                                className="group relative rounded-md border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer p-2"
                                onClick={() => onInsertCore(d.id)}
                                title={d.id}
                            >
                                <div className="text-sm font-medium truncate">{d.title}</div>
                                <div className="text-[11px] text-gray-500 truncate">{d.id}</div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Shared Library (Public) */}
            {filteredSharedComponents.length > 0 && (
                <div>
                    <div className="px-3 py-2 text-xs uppercase text-gray-500">Shared Library (Public)</div>
                    <ul className="px-2 grid grid-cols-2 gap-2">
                        {filteredSharedComponents.map((c) => (
                            <li
                                key={c.id}
                                className="group relative rounded-md border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer p-2"
                                onClick={() => W.insertComponent(c.id)}
                                title={`${c.name}\nComponent: ${c.id}`}
                            >
                                <div className="text-sm font-medium truncate">{c.name}</div>
                                <div className="text-[11px] text-gray-500 truncate">ID: {c.id}</div>

                                {R.isAdmin() && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteShared(c.id, c.name);
                                        }}
                                        className="absolute top-1 right-1 p-1 rounded-full bg-white/50 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-100"
                                        title="Delete shared component"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}