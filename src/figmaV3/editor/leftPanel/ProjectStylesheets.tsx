'use client';

import React from 'react';
import { useEditor } from '../useEditor';
import type { EditorState, Stylesheet } from '../../core/types';
import styles from '../ui/theme.module.css';

/**
 * ProjectStylesheets
 * - Project.stylesheets 를 열람/추가(URL/Inline)/토글/삭제
 * - 저장은 editorStore.subscribe → persistence 로 디바운스 저장됨
 */
export function ProjectStylesheets() {
    const state = useEditor();

    const sheets: Stylesheet[] = React.useMemo(
        () => state.project.stylesheets ?? [],
        [state.project.stylesheets],
    );

    const [urlOpen, setUrlOpen] = React.useState(false);
    const [urlName, setUrlName] = React.useState<string>('External CSS');
    const [urlValue, setUrlValue] = React.useState<string>('');

    const [inlineOpen, setInlineOpen] = React.useState(false);
    const [inlineName, setInlineName] = React.useState<string>('Inline CSS');
    const [inlineContent, setInlineContent] = React.useState<string>(
        '/* Example: .my-class { background: #ffeaea; } */',
    );

    const genId = (prefix: string): string => `${prefix}_${Date.now().toString(36)}`;

    const addSheet = (sheet: Omit<Stylesheet, 'id'>) => {
        state.update((s: EditorState) => {
            const newSheet: Stylesheet = { ...sheet, id: genId('sheet') };
            s.project.stylesheets = [...(s.project.stylesheets ?? []), newSheet];
        });
    };

    const addUrl = () => {
        if (!urlValue.trim()) return;
        addSheet({
            name: urlName.trim() || 'External CSS',
            source: 'url',
            url: urlValue.trim(),
            enabled: true,
        });
        setUrlOpen(false);
        setUrlName('External CSS');
        setUrlValue('');
    };

    const addInline = () => {
        if (!inlineContent.trim()) return;
        addSheet({
            name: inlineName.trim() || 'Inline CSS',
            source: 'inline',
            content: inlineContent,
            enabled: true,
        });
        setInlineOpen(false);
        setInlineName('Inline CSS');
        setInlineContent('/* Example: .my-class { background: #ffeaea; } */');
    };

    const toggleEnabled = (id: string) => {
        state.update((s: EditorState) => {
            s.project.stylesheets = (s.project.stylesheets ?? []).map((ss) =>
                ss.id === id ? { ...ss, enabled: !ss.enabled } : ss,
            );
        });
    };

    const removeSheet = (id: string) => {
        state.update((s: EditorState) => {
            s.project.stylesheets = (s.project.stylesheets ?? []).filter((ss) => ss.id !== id);
        });
    };

    return (
        <div className="mt-3 rounded border border-[var(--mdt-color-border)] bg-[var(--mdt-color-panel-primary)]">
            <div className="px-3 py-2 text-[var(--mdt-color-text-secondary)] text-sm font-medium">
                Stylesheets
            </div>

            <div className="max-h-56 overflow-auto divide-y divide-[var(--mdt-color-border)]">
                {sheets.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-[var(--mdt-color-text-secondary)]">
                        No stylesheets added.
                    </div>
                ) : (
                    sheets.map((ss) => (
                        <div key={ss.id} className="px-3 py-2 flex items-center gap-2 text-xs">
                            <span className="flex-1 truncate" title={ss.source === 'url' ? ss.url : ss.name}>{ss.name}</span>
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={ss.enabled}
                                    onChange={() => toggleEnabled(ss.id)}
                                />
                                <span className="text-[var(--mdt-color-text-secondary)]">On</span>
                            </label>
                            <button
                                className={`${styles.mdt_v1_button} text-[var(--mdt-color-danger)]`}
                                onClick={() => removeSheet(ss.id)}
                                title="Delete"
                            >
                                Remove
                            </button>
                        </div>
                    ))
                )}
            </div>

            <div className="px-3 py-2 flex gap-2 border-t border-[var(--mdt-color-border)]">
                <button className={styles.mdt_v1_button} onClick={() => setUrlOpen(v => !v)}>+ URL</button>
                <button className={styles.mdt_v1_button} onClick={() => setInlineOpen(v => !v)}>+ Inline</button>
            </div>

            {urlOpen && (
                <div className="p-3 border-t border-[var(--mdt-color-border)] space-y-2">
                    <input className={styles.mdt_v1_input} placeholder="Name" value={urlName} onChange={(e) => setUrlName(e.target.value)} />
                    <input className={styles.mdt_v1_input} placeholder="https://example.com/styles.css" value={urlValue} onChange={(e) => setUrlValue(e.target.value)} />
                    <button className={styles.mdt_v1_button_accent} onClick={addUrl}>Add URL</button>
                </div>
            )}
            {inlineOpen && (
                <div className="p-3 border-t border-[var(--mdt-color-border)] space-y-2">
                    <input className={styles.mdt_v1_input} placeholder="Name" value={inlineName} onChange={(e) => setInlineName(e.target.value)} />
                    <textarea className={`${styles.mdt_v1_input} w-full h-24 font-mono`} value={inlineContent} onChange={(e) => setInlineContent(e.target.value)} />
                    <button className={styles.mdt_v1_button_accent} onClick={addInline}>Add Inline CSS</button>
                </div>
            )}
        </div>
    );
}