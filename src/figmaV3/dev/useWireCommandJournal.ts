'use client';

import * as React from 'react';
import { useInspectorController } from '../controllers/InspectorController';
import { CommandJournal } from '../domain/persistence/CommandJournal';
import { applyCommand } from '../domain/history/HistoryExecutor';

export type WireJournalOptions = {
    storageKey?: string;
    autoReplayOnMount?: boolean;
    max?: number;
    enabled?: boolean;
};

export function useWireCommandJournal(opts?: WireJournalOptions) {
    const ctl = useInspectorController();
    const journalRef = React.useRef<CommandJournal>(null);

    if (!journalRef.current) {
        journalRef.current = new CommandJournal({
            storageKey: opts?.storageKey ?? '__EDITOR_CMD_JOURNAL__',
            max: opts?.max ?? 1000,
            enabled: opts?.enabled ?? true,
        });
    }

    // 구독: cleanup이 void를 반환하도록 보장
    React.useEffect(() => {
        const off = ctl.onCommand((cmd) => {
            journalRef.current?.append(cmd);
        });
        return () => {
            if (off) off(); // void cleanup
        };
    }, [ctl]);

    React.useEffect(() => {
        if (!opts?.autoReplayOnMount) return;
        const records = journalRef.current?.readAll() ?? [];
        for (const r of records) {
            applyCommand(r.cmd, ctl);
        }
    }, [ctl, opts?.autoReplayOnMount]);

    const replayAll = React.useCallback(() => {
        const records = journalRef.current?.readAll() ?? [];
        for (const r of records) applyCommand(r.cmd, ctl);
    }, [ctl]);

    const clearJournal = React.useCallback(() => {
        journalRef.current?.clear();
    }, []);

    const readAll = React.useCallback(() => {
        return journalRef.current?.readAll() ?? [];
    }, []);

    return { replayAll, clearJournal, readAll };
}