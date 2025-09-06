'use client';

import React from 'react';
import styles from '../ui/theme.module.css';
import type { Stylesheet } from '../../core/types';
import { useStylesheetsFacadeController } from '@/figmaV3/controllers/stylesheets/StylesheetsFacadeController';

/**
 * ProjectStylesheets
 * - Project.stylesheets 열람/추가(URL/Inline)/토글/삭제
 * - 저장은 Engine.update 경유(기존 store.subscribe 기반 퍼시스트는 엔진 측에서 유지)
 *
 * ✅ UI/UX는 기준 소스와 동일하게 유지했습니다.
 *   (useEditor → useStylesheetsFacadeController 로 데이터/액션 공급자만 치환)
 */

export function ProjectStylesheets() {
    const facade = useStylesheetsFacadeController();
    const R = facade.reader();
    const W = facade.writer();

    // ⚠️ TS4104 대응: readonly 반환을 그대로 추론(또는 ReadonlyArray로 명시)
    const sheets = React.useMemo(() => R.sheets(), [R]);

    const [urlOpen, setUrlOpen] = React.useState(false);
    const [urlName, setUrlName] = React.useState('External CSS');
    const [urlValue, setUrlValue] = React.useState('');

    const [inlineOpen, setInlineOpen] = React.useState(false);
    const [inlineName, setInlineName] = React.useState('Inline CSS');
    const [inlineContent, setInlineContent] = React.useState(
        '/* Example: .my-class { background: #ffeaea; } */'
    );

    const addUrl = () => {
        if (!urlValue.trim()) return;
        W.addUrl(urlName, urlValue);
        setUrlOpen(false);
        setUrlName('External CSS');
        setUrlValue('');
    };

    const addInline = () => {
        if (!inlineContent.trim()) return;
        W.addInline(inlineName, inlineContent);
        setInlineOpen(false);
        setInlineName('Inline CSS');
        setInlineContent('/* Example: .my-class { background: #ffeaea; } */');
    };

    const toggleEnabled = (id: string) => {
        W.toggleEnabled(id);
    };

    const removeSheet = (id: string) => {
        W.remove(id);
    };

    return (
        <div className="space-y-3">
            <div className="px-3 py-2 text-xs uppercase text-gray-500">Stylesheets</div>

            {sheets.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-400">No stylesheets added.</div>
            ) : (
                <div className="space-y-2 px-2">
                    {sheets.map((ss: Stylesheet) => (
                        <div key={ss.id} className="flex items-center justify-between border rounded px-2 py-1">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={!!ss.enabled}
                                    onChange={() => toggleEnabled(ss.id)}
                                    title="Enable/Disable stylesheet"
                                />
                                <div className="text-sm font-medium">{ss.name}</div>
                                <div className="text-[11px] text-gray-500">
                                    {ss.source === 'url' ? ss.url : '(inline)'}
                                </div>
                            </div>
                            <button
                                className={styles.mdt_v1_button_accent}
                                onClick={() => removeSheet(ss.id)}
                                title="Delete"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="px-2 flex items-center gap-2">
                <button
                    className={styles.mdt_v1_button}
                    onClick={() => setUrlOpen((v) => !v)}
                    title="Add external CSS by URL"
                >
                    + URL
                </button>
                <button
                    className={styles.mdt_v1_button}
                    onClick={() => setInlineOpen((v) => !v)}
                    title="Add inline CSS"
                >
                    + Inline
                </button>
            </div>

            {urlOpen && (
                <div className="px-2 space-y-2">
                    <input
                        className="w-full border rounded px-2 py-1 text-sm"
                        placeholder="Name"
                        value={urlName}
                        onChange={(e) => setUrlName(e.target.value)}
                    />
                    <input
                        className="w-full border rounded px-2 py-1 text-sm"
                        placeholder="https://cdn.example.com/styles.css"
                        value={urlValue}
                        onChange={(e) => setUrlValue(e.target.value)}
                    />
                    <button className={styles.mdt_v1_button_accent} onClick={addUrl}>
                        Add URL
                    </button>
                </div>
            )}

            {inlineOpen && (
                <div className="px-2 space-y-2">
                    <input
                        className="w-full border rounded px-2 py-1 text-sm"
                        placeholder="Name"
                        value={inlineName}
                        onChange={(e) => setInlineName(e.target.value)}
                    />
                    <textarea
                        className="w-full border rounded px-2 py-1 text-sm font-mono min-h-[80px]"
                        placeholder="/* CSS content here */"
                        value={inlineContent}
                        onChange={(e) => setInlineContent(e.target.value)}
                    />
                    <button className={styles.mdt_v1_button_accent} onClick={addInline}>
                        Add Inline CSS
                    </button>
                </div>
            )}
        </div>
    );
}