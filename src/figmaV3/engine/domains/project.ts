import type { Project, ComponentSchemaOverrides } from '../../core/types';
import { EditorEngineCore } from '../EditorEngineCore';

export function projectDomain() {
    const R = {
        /** 전체 프로젝트 객체를 가져옵니다. */
        getProject: (): Project => EditorEngineCore.getState().project,
        /** 프로젝트의 스키마 오버라이드 정보를 가져옵니다. */
        getSchemaOverrides: (): ComponentSchemaOverrides | undefined => R.getProject().schemaOverrides,
    };

    const W = {
        /** 프로젝트의 일부 속성을 업데이트합니다. */
        patchProject(patch: Partial<Project>) {
            EditorEngineCore.store.getState().update(s => {
                s.project = { ...s.project, ...patch };
            }, true);
        },

        /** 특정 컴포넌트의 propsSchema를 프로젝트 레벨에서 오버라이드합니다. */
        setSchemaOverride(defId: string, rows: any[]) {
            const currentOverrides = R.getSchemaOverrides() ?? {};
            W.patchProject({ schemaOverrides: { ...currentOverrides, [defId]: rows } });
        },

        /** 특정 컴포넌트에 대한 propsSchema 오버라이드를 제거합니다. */
        removeSchemaOverride(defId: string) {
            const currentOverrides = R.getSchemaOverrides();
            if (!currentOverrides?.[defId]) return;
            const { [defId]: _, ...nextOverrides } = currentOverrides;
            W.patchProject({ schemaOverrides: nextOverrides });
        },
    };
    return { reader: R, writer: W } as const;
}