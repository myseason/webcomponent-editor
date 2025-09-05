'use client';

import * as React from 'react';
import { useEngine } from '../engine/EditorEngine';
import type { Fragment } from '../core/types';

export interface FragmentsReader {
    list(): ReadonlyArray<Fragment>;
    getEditingFragment(): Fragment | null;
}

export interface FragmentsWriter {
    setEditingFragment(id: string | null): void;
    addFragment(f: Fragment): void;
    removeFragment(id: string): void;
}

export interface FragmentsController {
    reader(): FragmentsReader;
    writer(): FragmentsWriter;
}

export function useFragmentsController(): FragmentsController {
    const eng = useEngine();

    const reader = React.useMemo<FragmentsReader>(() => ({
        list() {
            return (eng.project as any)?.fragments ?? [];
        },
        getEditingFragment() {
            const fid = (eng.ui as any)?.editingFragmentId;
            const list = (eng.project as any)?.fragments ?? [];
            return list.find((f: Fragment) => f.id === fid) ?? null;
        },
        getEditingFragmentId(): string | null {
            const fid = (eng.ui as any)?.editingFragmentId;
            return (typeof fid === 'string' && fid.length > 0) ? fid : null;
        }
    }), [eng.project, eng.ui]);

    const writer = React.useMemo<FragmentsWriter>(() => ({
        setEditingFragment(id: string | null) {
            eng.update((s: any) => {
                (s.ui ??= {});
                s.ui.editingFragmentId = id;
            }, true);
        },
        addFragment(f: Fragment) {
            eng.update((s: any) => {
                (s.project ??= {});
                (s.project.fragments ??= []);
                s.project.fragments.push(f);
            }, true);
        },
        removeFragment(id: string) {
            eng.update((s: any) => {
                (s.project ??= {});
                s.project.fragments = (s.project.fragments ?? []).filter((f: Fragment) => f.id !== id);
            }, true);
        },
    }), [eng]);

    return React.useMemo(() => ({ reader: () => reader, writer: () => writer }), [reader, writer]);
}