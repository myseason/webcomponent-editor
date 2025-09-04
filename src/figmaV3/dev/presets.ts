'use client';

import type { InitOptions } from '../editor/initArchitecture';

/** 개발 환경에서 편하게 쓰는 옵션 프리셋 */
export const DevPresetVerbose: InitOptions = {
    enableLogging: true,
    enableJournal: true,
    autoReplayJournal: false,
    enableUndoKeyBinding: true,
    journalKey: '__EDITOR_CMD_JOURNAL__',
};

export const DevPresetReplay: InitOptions = {
    enableLogging: false,
    enableJournal: true,
    autoReplayJournal: true,
    enableUndoKeyBinding: true,
    journalKey: '__EDITOR_CMD_JOURNAL__',
};