/**
 * 로컬스토리지 프로젝트 저장/복원 + API 스텁
 * - SSR 안전 처리(window 존재 시에만 접근)
 */
import type { EditorState, Project } from '../core/types';

const KEY_PROJECT = 'wce:project';
const KEY_UI = 'wce:ui';

export function saveProjectToLocal(project: Project): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(KEY_PROJECT, JSON.stringify(project));
}

export function loadProjectFromLocal(): Project | null {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(KEY_PROJECT);
    if (!raw) return null;
    try { return JSON.parse(raw) as Project; } catch { return null; }
}

export function saveUiToLocal(ui: EditorState['ui']): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(KEY_UI, JSON.stringify(ui));
}

export function loadUiFromLocal(): EditorState['ui'] | null {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(KEY_UI);
    if (!raw) return null;
    try { return JSON.parse(raw) as EditorState['ui']; } catch { return null; }
}

/** 후일 서버 연동을 위한 인터페이스(스텁) */
export interface ProjectAPI {
    fetchProject(projectId: string): Promise<Project>;
    saveProject(projectId: string, project: Project): Promise<void>;
}

export const ApiStub: ProjectAPI = {
    async fetchProject(_projectId: string) {
        const local = loadProjectFromLocal();
        if (local) return local;
        // 빈 프로젝트 기본값
        return {
            pages: [{ id: 'page_home', name: 'Home', rootId: 'node_root_home', slug: '/' }],
            fragments: [],
            nodes: {
                node_root_home: { id: 'node_root_home', componentId: 'box', props: {}, styles: { element: {} }, children: [] },
            },
            rootId: 'node_root_home',
            templates: {},
        };
    },
    async saveProject(_projectId: string, project: Project) {
        saveProjectToLocal(project);
    },
};