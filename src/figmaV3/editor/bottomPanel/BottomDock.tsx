'use client';
/**
 * BottomDock: Actions / Data / Flows / Fragments 패널 탭
 * - 훅은 최상위에서만 사용(useState)
 */
import React, { useState } from 'react';
import { ActionsPanel } from './panels/ActionsPanel';
import { DataPanel } from './panels/DataPanel';
import { FlowsPanel } from './panels/FlowsPanel';
import { FragmentsPanel } from './panels/FragmentsPanel';

export function BottomDock() {
    const [tab, setTab] = useState<'actions' | 'data' | 'flows' | 'fragments'>('actions');

    return (
        <div className="border-t bg-white">
            <div className="flex gap-2 px-3 py-2 text-xs border-b">
                <button
                    className={`px-2 py-1 rounded ${tab === 'actions' ? 'bg-gray-100' : ''}`}
                    onClick={() => setTab('actions')}
                >
                    Actions
                </button>
                <button
                    className={`px-2 py-1 rounded ${tab === 'data' ? 'bg-gray-100' : ''}`}
                    onClick={() => setTab('data')}
                >
                    Data
                </button>
                <button
                    className={`px-2 py-1 rounded ${tab === 'flows' ? 'bg-gray-100' : ''}`}
                    onClick={() => setTab('flows')}
                >
                    Flows
                </button>
                <button
                    className={`px-2 py-1 rounded ${tab === 'fragments' ? 'bg-gray-100' : ''}`}
                    onClick={() => setTab('fragments')}
                >
                    Fragments
                </button>
            </div>

            {tab === 'actions' && <ActionsPanel />}
            {tab === 'data' && <DataPanel />}
            {tab === 'flows' && <FlowsPanel />}
            {tab === 'fragments' && <FragmentsPanel />}
        </div>
    );
}