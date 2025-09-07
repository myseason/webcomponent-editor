'use client';

import React, { useState } from 'react';
import type { NodeId } from '../../../core/types';
import { useRightPanelController } from '../../../controllers/right/RightPanelController';

interface SaveAsComponentDialogProps {
    nodeId: NodeId;
    onClose: () => void;
}

export function SaveAsComponentDialog({ nodeId, onClose }: SaveAsComponentDialogProps) {
    // ✅ Right 패널 컨트롤러 사용
    const { reader, writer } = useRightPanelController();

    // writer에서 필요한 액션만 구조분해
    const { saveNodeAsComponent, setNotification } = writer as {
        saveNodeAsComponent: (nodeId: NodeId, name: string, description: string, isPublic: boolean) => void;
        setNotification: (msg: string) => void;
    };

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);

    const handleSave = () => {
        if (!name.trim()) {
            alert('Component name is required.');
            return;
        }
        // ✅ 컨트롤러 writer 경유
        saveNodeAsComponent(nodeId, name.trim(), description.trim(), isPublic);
        setNotification(`Component "${name.trim()}" has been saved.`);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg shadow-xl p-6 w-96 space-y-4"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-lg font-semibold">Save as Component</h3>

                <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Component Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full border rounded px-2 py-1.5 text-sm"
                        placeholder="e.g., Primary Button"
                    />
                </div>

                <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full border rounded px-2 py-1.5 text-sm h-20 resize-none"
                        placeholder="A brief description of the component"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Visibility</span>
                    <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                        <button
                            onClick={() => setIsPublic(true)}
                            className={`px-3 py-1 text-xs rounded-md ${isPublic ? 'bg-white shadow-sm font-semibold' : 'text-gray-500'}`}
                        >
                            Public
                        </button>
                        <button
                            onClick={() => setIsPublic(false)}
                            className={`px-3 py-1 text-xs rounded-md ${!isPublic ? 'bg-white shadow-sm font-semibold' : 'text-gray-500'}`}
                        >
                            Private
                        </button>
                    </div>
                </div>

                <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded-md">
                    {isPublic
                        ? 'This component will be saved to the shared Library and will be available in all your projects.'
                        : 'This component will be saved to Project Components and will only be available in this project.'
                    }
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm border rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}