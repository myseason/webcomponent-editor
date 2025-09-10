'use client';

import React from 'react';
import { listDefinitions } from '../../core/registry';
import type { Fragment } from '../../core/types';
import { Trash2 } from 'lucide-react';

// ✅ 도메인 인자 제거
import {LeftDomain, useLeftControllerFactory} from '../../controllers/left/LeftControllerFactory';

function itemMatch(title: string, id: string, q: string): boolean {
    const qq = q.trim().toLowerCase();
    if (!qq) return true;
    return title.toLowerCase().includes(qq) || id.toLowerCase().includes(qq);
}

export function Palette({ query = '' }: { query?: string }) {
    // ✅ 인자 없이 컨트롤러 사용
    const { reader, writer } = useLeftControllerFactory(LeftDomain.Palette);

    const project = reader.getProject();
    const coreDefs = listDefinitions().filter((d) => itemMatch(d.title, d.id, query));

    // isPublic === true 인 Fragment만
    const sharedComponents = React.useMemo<Fragment[]>(
        () => project.fragments.filter((f: Fragment) => f.isPublic),
        [project.fragments]
    );
    const filteredSharedComponents = sharedComponents.filter((c) =>
        itemMatch(c.name, c.id, query)
    );

    const onInsertCore = (defId: string) => {
        const parent = reader.getUI().selectedId ?? project.rootId;
        writer.addByDef(defId, parent);
    };

    const handleDeleteShared = (componentId: string, componentName: string) => {
        if (window.confirm(`Are you sure you want to delete the shared component "${componentName}" from the Library?`)) {
            writer.removeFragment(componentId);
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <div className="text-xs font-semibold text-gray-700 mb-2 px-1">Core Library</div>
                {coreDefs.length === 0 && !query ? (
                    <div className="text-xs text-gray-500">No components</div>
                ) : (
                    <ul className="grid grid-cols-2 gap-2">
                        {coreDefs.map((d) => (
                            <li key={d.id}>
                                <button
                                    type="button"
                                    className="w-full text-left px-2 py-2 border rounded hover:border-gray-300"
                                    onClick={() => onInsertCore(d.id)}
                                    title={d.id}
                                >
                                    <div className="text-sm font-medium truncate">{d.title}</div>
                                    <div className="text-[10px] text-gray-500 truncate">{d.id}</div>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {filteredSharedComponents.length > 0 && (
                <div>
                    <div className="text-xs font-semibold text-gray-700 mb-2 px-1">Shared Library (Public)</div>
                    <ul className="grid grid-cols-2 gap-2">
                        {filteredSharedComponents.map((c) => (
                            <li key={c.id} className="group relative">
                                <button
                                    type="button"
                                    className="w-full text-left px-2 py-2 border rounded hover:border-gray-300"
                                    onClick={() => writer.insertComponent(c.id)}
                                    title={`${c.name}\nComponent: ${c.id}`}
                                >
                                    <div className="text-sm font-medium truncate">{c.name}</div>
                                    <div className="text-[10px] text-gray-500 truncate">ID: {c.id}</div>
                                </button>
                                {reader.isAdmin() && (
                                    <button
                                        onClick={() => handleDeleteShared(c.id, c.name)}
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