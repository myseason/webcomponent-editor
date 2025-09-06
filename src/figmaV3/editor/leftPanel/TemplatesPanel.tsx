'use client';

import React, { useMemo, useState, useEffect } from 'react';
import type { Fragment } from '../../core/types';
import { useTemplatesFacadeController } from '@/figmaV3/controllers/templates/TemplatesFacadeController';
import { Trash2, PlusCircle, CopyPlus, Edit3 } from 'lucide-react';

/**
 * TemplatesPanel
 * - 프로젝트 내 비공개 프래그먼트(템플릿) 관리
 * - 추가 / 이름 변경 / 삭제 / 캔버스에 삽입 / 템플릿 편집 열기
 *
 * ✅ UI/UX는 기준 그대로 유지(마크업/클래스/문구 동일),
 *    데이터/액션 공급자만 파사드 컨트롤러로 교체
 */

export function TemplatesPanel() {
    const ctrl = useTemplatesFacadeController();
    const R = ctrl.reader();
    const W = ctrl.writer();

    // 목록 스냅샷
    const templates = useMemo(() => R.templates(), [R]);

    // 새 템플릿 이름 입력
    const [newName, setNewName] = useState('New Template');

    const addTemplate = () => {
        const id = W.addTemplate(newName.trim() || 'New Template');
        if (id) {
            setNewName('New Template');
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="p-2 border-b space-y-2">
                <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-gray-700">Templates</div>
                    <div className="flex items-center gap-2">
                        <input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="text-xs border rounded px-2 py-1"
                            placeholder="Template name"
                        />
                        <button
                            className="text-xs px-2 py-1 border rounded bg-white hover:bg-gray-50 flex items-center gap-1"
                            onClick={addTemplate}
                            title="Add template"
                        >
                            <PlusCircle size={14} />
                            Add
                        </button>
                    </div>
                </div>

                {templates.length === 0 ? (
                    <div className="text-xs text-gray-400 py-4 text-center">No templates yet.</div>
                ) : (
                    <ul className="space-y-2 max-h-[40vh] overflow-auto p-1">
                        {templates.map((t: Fragment) => (
                            <TemplateItem key={t.id} frag={t} onRename={W.renameTemplate} onRemove={W.removeTemplate} onInsert={W.insertTemplate} onOpen={W.openTemplate} />
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

function TemplateItem({
                          frag,
                          onRename,
                          onRemove,
                          onInsert,
                          onOpen,
                      }: {
    frag: Fragment;
    onRename: (id: string, name: string) => void;
    onRemove: (id: string) => void;
    onInsert: (id: string) => string | null;
    onOpen: (id: string) => void;
}) {
    const [name, setName] = useState(frag.name);

    useEffect(() => {
        setName(frag.name);
    }, [frag]);

    const handleRename = () => {
        if (name.trim() && name.trim() !== frag.name) {
            onRename(frag.id, name.trim());
        }
    };

    const handleRemove = () => {
        if (window.confirm(`Delete template "${frag.name}"? This cannot be undone.`)) {
            onRemove(frag.id);
        }
    };

    return (
        <li className="border rounded-md p-3 space-y-2 bg-white">
            <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">ID: {frag.id}</div>
                <div className="flex items-center gap-2">
                    <button
                        className="text-xs px-2 py-1 border rounded bg-white hover:bg-gray-50 flex items-center gap-1"
                        onClick={() => onInsert(frag.id)}
                        title="Insert into canvas"
                    >
                        <CopyPlus size={14} />
                        Insert
                    </button>
                    <button
                        className="text-xs px-2 py-1 border rounded bg-white hover:bg-gray-50 flex items-center gap-1"
                        onClick={() => onOpen(frag.id)}
                        title="Open in editor"
                    >
                        <Edit3 size={14} />
                        Open
                    </button>
                    <button
                        className="text-xs px-2 py-1 border rounded bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1"
                        onClick={handleRemove}
                        title="Delete template"
                    >
                        <Trash2 size={14} />
                        Delete
                    </button>
                </div>
            </div>

            <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                className="w-full text-sm font-semibold border rounded-md px-2 py-1.5"
                placeholder="Template Name"
            />
        </li>
    );
}