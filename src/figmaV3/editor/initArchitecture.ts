// src/figmaV3/editor/initArchitecture.ts
'use client';

import { registerDefaultGuards } from '../dev/registerDefaultGuards';
import { commandLogger } from '../domain/command/CommandLogger';
import { useWireCommandJournal } from '../dev/useWireCommandJournal';
import { useBindUndoRedo } from '../dev/useBindUndoRedo';
import * as React from 'react';
import { useInspectorController } from '../controllers/InspectorController';

export type InitOptions = {
    enableLogging?: boolean;
    enableJournal?: boolean;
    autoReplayJournal?: boolean;
    enableUndoKeyBinding?: boolean;
    journalKey?: string;
};

export function initArchitecture() {
    registerDefaultGuards();
}

export function useArchitectureDevWiring(opts?: InitOptions) {
    const ctl = useInspectorController();

    // 로깅: cleanup을 반드시 void로
    React.useEffect(() => {
        if (!opts?.enableLogging) return;
        const off = ctl.onCommand((cmd) => commandLogger.record(cmd));
        return () => {
            if (off) off(); // void cleanup
        };
    }, [ctl, opts?.enableLogging]);

    // 저널: 기록/재생(옵션)
    const { replayAll, clearJournal, readAll } = useWireCommandJournal({
        enabled: !!opts?.enableJournal,
        autoReplayOnMount: !!opts?.autoReplayJournal,
        storageKey: opts?.journalKey,
    });

    // Undo/Redo 키바인딩(옵션)
    useBindUndoRedo({ withKeyBinding: !!opts?.enableUndoKeyBinding });

    return { replayAll, clearJournal, readAll };
}