'use client';
import React from 'react';
import type { Fragment } from '../../core/types';
import { Trash2 } from 'lucide-react';

// ✅ 도메인 인자 제거: LeftDomain 사용 안 함
import { useLeftPanelController } from '../../controllers/left/LeftPanelController';

export function TemplatesPanel({ query = '' }: { query?: string }) {
    // ✅ 도메인 인자 없이 컨트롤러 사용
    const { reader, writer } = useLeftPanelController();

    const project = reader.getProject();

    // isPublic이 false인 컴포넌트(Fragment)만 필터링
    const privateComponents = React.useMemo<Fragment[]>(() => {
        return project.fragments.filter((f: Fragment) => !f.isPublic);
    }, [project.fragments]);

    const filteredComponents = privateComponents.filter((c) => {
        if (!query.trim()) return true;
        const q = query.trim().toLowerCase();
        return (
            c.id.toLowerCase().includes(q) ||
            c.name.toLowerCase().includes(q)
        );
    });

    const isAdmin = false;

    const handleDelete = (componentId: string, componentName: string) => {
        if (window.confirm(`Are you sure you want to delete the component "${componentName}"?`)) {
            writer.removeFragment(componentId);
        }
    };

    return (
        <div className="space-y-2">
            {filteredComponents.length === 0 ? (
                <div className="text-xs text-gray-500 px-1">No private components for this project.</div>
            ) : (
                <ul className="space-y-1">
                    {filteredComponents.map((c) => (
                        <li key={c.id} className="group relative">
                            <button
                                type="button"
                                className="w-full text-left px-2 py-2 border rounded hover:border-gray-300"
                                // insertComponent 액션 호출
                                onClick={() => writer.insertComponent(c.id)}
                                title={`Component: ${c.name}\nClick to insert.`}
                            >
                                <div className="text-sm font-medium truncate">{c.name}</div>
                                <div className="text-[10px] text-gray-500 truncate">ID: {c.id}</div>
                            </button>
                            {isAdmin && (
                                <button
                                    onClick={() => handleDelete(c.id, c.name)}
                                    className="absolute top-1 right-1 p-1 rounded-full bg-white/50 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-100"
                                    title="Delete project component"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}