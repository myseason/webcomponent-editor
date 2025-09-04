// src/figmaV3/editor/leftPanel/ProjectStylesheets.tsx
'use client';

import * as React from 'react';
import { useEditor } from '../useEditor';
import type { EditorState, Stylesheet } from '../../core/types';
import styles from '../ui/theme.module.css';

// ⬇️ 추가: 프로젝트 정책을 PolicyProvider에 주입하는 컨트롤러 포트
import { useProjectPolicyController } from '../../controllers/ProjectPolicyController';

/**
 * ProjectStylesheets
 * - Project.stylesheets 를 열람/추가(URL/Inline)/토글/삭제
 * - 저장은 editorStore.subscribe → persistence 로 디바운스 저장됨
 * - (추가) 프로젝트 설정의 정책 변경을 PolicyProvider에 즉시 반영
 */
export function ProjectStylesheets() {
    const state = useEditor();
    const sheets: Stylesheet[] = React.useMemo(
        () => state.project.stylesheets ?? [],
        [state.project.stylesheets],
    );

    // ⬇️ 추가: 정책 연동용 컨트롤러
    const policyCtl = useProjectPolicyController();

    // ⬇️ 추가: 프로젝트 설정의 정책 오버라이드가 바뀔 때 Provider에 즉시 반영
    React.useEffect(() => {
        // 실제로 운영하시는 정책 저장 위치에 맞춰서 경로를 교체해 주세요.
        // 아래는 예시입니다.
        const overridesFromProject = state.project?.policies ?? state.settings?.policies ?? undefined;
        if (overridesFromProject) {
            policyCtl.setOverrides(overridesFromProject as any);
        }
    }, [state.project?.policies, state.settings?.policies, policyCtl]);

    const [urlOpen, setUrlOpen] = React.useState(false);
    const [urlName, setUrlName] = React.useState('External CSS');
    const [urlValue, setUrlValue] = React.useState('');

    const [inlineOpen, setInlineOpen] = React.useState(false);
    const [inlineName, setInlineName] = React.useState('Inline CSS');
    const [inlineContent, setInlineContent] = React.useState(
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
        <div className={styles.mdt_v1_section}>
            <div className={styles.mdt_v1_section_title}>Stylesheets</div>

            {/* 리스트 */}
            {sheets.length === 0 ? (
                <div className={styles.mdt_v1_empty}>No stylesheets added.</div>
            ) : (
                sheets.map((ss) => (
                    <div key={ss.id} className={styles.mdt_v1_row}>
                        <div className={styles.mdt_v1_row_main}>
                            <div className={styles.mdt_v1_row_title}>{ss.name}</div>
                            <div className={styles.mdt_v1_row_sub}>
                                {ss.source === 'url' ? ss.url : 'inline'}
                            </div>
                        </div>
                        <div className={styles.mdt_v1_row_actions}>
                            <label className={styles.mdt_v1_switch}>
                                <input
                                    type="checkbox"
                                    checked={!!ss.enabled}
                                    onChange={() => toggleEnabled(ss.id)}
                                />
                                <span />
                            </label>
                            <button
                                className={styles.mdt_v1_icon_button}
                                onClick={() => removeSheet(ss.id)}
                                title="Delete"
                                aria-label="Delete"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                ))
            )}

            {/* 추가 버튼들 */}
            <div className={styles.mdt_v1_actions_row}>
                <button
                    className={styles.mdt_v1_button}
                    onClick={() => setUrlOpen((v) => !v)}
                >
                    + URL
                </button>
                <button
                    className={styles.mdt_v1_button}
                    onClick={() => setInlineOpen((v) => !v)}
                >
                    + Inline
                </button>
            </div>

            {/* URL 추가 폼 */}
            {urlOpen && (
                <div className={styles.mdt_v1_card}>
                    <input
                        className={styles.mdt_v1_input}
                        value={urlName}
                        onChange={(e) => setUrlName(e.target.value)}
                        placeholder="Name"
                    />
                    <input
                        className={styles.mdt_v1_input}
                        value={urlValue}
                        onChange={(e) => setUrlValue(e.target.value)}
                        placeholder="https://example.com/theme.css"
                    />
                    <button className={styles.mdt_v1_button_accent} onClick={addUrl}>
                        Add URL
                    </button>
                </div>
            )}

            {/* Inline 추가 폼 */}
            {inlineOpen && (
                <div className={styles.mdt_v1_card}>
                    <input
                        className={styles.mdt_v1_input}
                        value={inlineName}
                        onChange={(e) => setInlineName(e.target.value)}
                        placeholder="Name"
                    />
                    <textarea
                        className={styles.mdt_v1_textarea}
                        value={inlineContent}
                        onChange={(e) => setInlineContent(e.target.value)}
                        rows={6}
                    />
                    <button className={styles.mdt_v1_button_accent} onClick={addInline}>
                        Add Inline CSS
                    </button>
                </div>
            )}
        </div>
    );
}