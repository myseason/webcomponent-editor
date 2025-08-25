'use client';
/**
 * ComposerPane
 * - Top: Project Components(TemplatesPanel) + Common Components(Palette)
 * - Bottom: Layers (현재 문서 트리)
 */
import React from 'react';
import { TemplatesPanel } from './TemplatesPanel';
import { Palette } from './Palette';
import { Layers } from './Layers';

export const ComposerPane = {
    Top() {
        return (
            <div className="p-2 space-y-3">
                <div>
                    <div className="text-xs font-semibold text-gray-600 mb-1">Project Components</div>
                    <TemplatesPanel />
                </div>
                <div>
                    <div className="text-xs font-semibold text-gray-600 mb-1">Common Components</div>
                    <Palette />
                </div>
            </div>
        );
    },
    Bottom() {
        return (
            <div className="p-2">
                <Layers />
            </div>
        );
    },
};