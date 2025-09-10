import { EditorCore } from '../EditorCore';
import { genId } from '../../store/utils';
import { Stylesheet } from '../../core/types';

export function stylesheetsDomain() {
    const R = {
        /** 프로젝트의 모든 스타일시트 목록을 가져옵니다. */
        getStylesheets: () => EditorCore.getState().project.stylesheets ?? [],
    };
    const W = {
        /** 스타일시트 목록 전체를 설정합니다. (내부용) */
        setStylesheets: (stylesheets: Stylesheet[]) => {
            EditorCore.store.getState().update(s => { s.project.stylesheets = stylesheets; }, true);
        },

        /** 새 스타일시트를 추가합니다. */
        addStylesheet(sheet: Omit<Stylesheet, 'id'>) {
            const newSheet = { ...sheet, id: genId('ss') };
            W.setStylesheets([...R.getStylesheets(), newSheet]);
        },

        /** 특정 스타일시트의 내용을 업데이트합니다. */
        updateStylesheet(id: string, patch: Partial<Omit<Stylesheet, 'id'>>) {
            W.setStylesheets(R.getStylesheets().map(s => (s.id === id ? { ...s, ...patch } : s)));
        },

        /** 특정 스타일시트를 제거합니다. */
        removeStylesheet(id: string) {
            W.setStylesheets(R.getStylesheets().filter(s => s.id !== id));
        },
    };
    return { reader: R, writer: W } as const;
}