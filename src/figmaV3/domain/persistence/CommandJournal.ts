'use client';

import type { Command } from '../../domain/command/CommandTypes';

export type JournalRecord = {
    ts: number;
    cmd: Command;
};

export type JournalConfig = {
    /** localStorage 키 (프로젝트/테넌트 별로 식별 추천) */
    storageKey?: string;
    /** 최대 보관 개수 */
    max?: number;
    /** 운영에서는 비활성화를 원할 수 있음 */
    enabled?: boolean;
};

const defaultConfig: Required<JournalConfig> = {
    storageKey: '__EDITOR_CMD_JOURNAL__',
    max: 1000,
    enabled: true,
};

function loadArray(key: string): JournalRecord[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return [];
        return arr as JournalRecord[];
    } catch {
        return [];
    }
}

function saveArray(key: string, arr: JournalRecord[]) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(key, JSON.stringify(arr));
    } catch {
        // ignore quota errors
    }
}

export class CommandJournal {
    private buf: JournalRecord[] = [];
    private cfg: Required<JournalConfig>;

    constructor(config?: JournalConfig) {
        this.cfg = { ...defaultConfig, ...(config ?? {}) };
        if (this.cfg.enabled) {
            this.buf = loadArray(this.cfg.storageKey);
        }
    }

    clear() {
        this.buf = [];
        if (this.cfg.enabled) saveArray(this.cfg.storageKey, this.buf);
    }

    append(cmd: Command) {
        if (!this.cfg.enabled) return;
        const rec: JournalRecord = { ts: Date.now(), cmd };
        this.buf.push(rec);
        if (this.buf.length > this.cfg.max) this.buf.shift();
        saveArray(this.cfg.storageKey, this.buf);
    }

    readAll(): JournalRecord[] {
        return [...this.buf];
    }

    /** 조건부 필터로 추출 (예: 특정 시간대, 특정 커맨드만) */
    query(filter?: (r: JournalRecord) => boolean): JournalRecord[] {
        const base = this.readAll();
        return filter ? base.filter(filter) : base;
    }
}