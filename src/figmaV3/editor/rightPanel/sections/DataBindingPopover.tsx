'use client';

import React, { useEffect, useRef } from 'react';
import type { NodeId } from '../../../core/types';
import {useInspectorController} from "@/figmaV3/controllers/inspector/InspectorFacadeController";

interface DataBindingPopoverProps {
    nodeId: NodeId;
    propKey: string;
    anchorEl: HTMLElement;
    onClose: () => void;
}

export function DataBindingPopover({ nodeId, propKey, anchorEl, onClose }: DataBindingPopoverProps) {

    const { reader, writer } = useInspectorController();
    const R = reader();
    const W = writer();

    const state = {
  ui: R.ui(),
  project: R.project(),
  data: R.data(),
  getEffectiveDecl: R.getEffectiveDecl.bind(R),
  updateNodeStyles: W.updateNodeStyles.bind(W),
  updateNodeProps: W.updateNodeProps.bind(W),
  setNotification: W.setNotification.bind(W),
  saveNodeAsComponent: W.saveNodeAsComponent.bind(W),
  updateComponentPolicy: W.updateComponentPolicy.bind(W),
  update: W.update.bind(W),
};
    const ref = useRef<HTMLDivElement>(null);

    const setBinding = (path: string) => {
        state.updateNodeProps(nodeId, { [propKey]: `{{ ${path} }}` });
        onClose();
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node) && !anchorEl.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [ref, anchorEl, onClose]);

    const rect = anchorEl.getBoundingClientRect();

    return (
        <div
            ref={ref}
            className="absolute z-10 w-64 bg-white border rounded-lg shadow-xl p-2 text-xs"
            style={{ top: rect.bottom + 4, left: rect.left }}
        >
            <div className="font-semibold mb-2">Select Data Source</div>
            <div className="space-y-1">
                <div className="font-medium text-gray-600">Global Data</div>
                <ul className="pl-2">
                    {Object.keys(state.data).map(key => (
                        <li key={key}><button className="hover:underline" onClick={() => setBinding(`data.${key}`)}>{key}</button></li>
                    ))}
                </ul>
                {/* TODO: node, project 등 다른 데이터 소스도 트리 형태로 구현 */}
            </div>
        </div>
    );
}