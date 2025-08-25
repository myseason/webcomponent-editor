'use client';
import React from 'react';
import { useEditor } from './useEditor';
import { bootstrapEditor } from './bootstrap';

import PageBar from './topbar/PageBar';
import { LeftSidebar } from './leftPanel/LeftSidebar';

import { Canvas } from './centerPanel/Canvas';
import { OverlayHost } from './centerPanel/OverlayHost';
import { Inspector } from './rightPanel/Inspector';
import { BottomDock } from './bottomPanel/BottomDock';

bootstrapEditor();

export default function ComponentEditor() {
    useEditor();
    return (
        <div className="w-full h-full grid" style={{ gridTemplateRows: '40px 1fr auto' }}>
            <div className="border-b"><PageBar /></div>
            <div className="grid" style={{ gridTemplateColumns: '320px 1fr 340px', minHeight: 0 }}>
                <div className="border-r min-h-0"><LeftSidebar /></div>
                <div className="relative min-h-0">
                    <Canvas />
                    <OverlayHost />
                </div>
                <div className="border-l min-h-0 overflow-auto"><Inspector /></div>
            </div>
            <div className="border-t min-h-0"><BottomDock /></div>
        </div>
    );
}