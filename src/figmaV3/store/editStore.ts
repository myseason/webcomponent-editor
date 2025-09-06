import { createStore, type StoreApi } from 'zustand/vanilla';
import { EditorState, Project } from '../core/types';
import { EditorStoreState } from './types';
import { createDataSlice } from './slices/dataSlice';
import { createFragmentSlice } from './slices/fragmentSlice';
import { createHistorySlice } from './slices/historySlice';
import { createNodeSlice } from './slices/nodeSlice';
import { createPageSlice } from './slices/pageSlice';
import { createUiSlice } from './slices/uiSlice';

const initialProject: Project = {
    pages: [{ id: 'page_home', name: 'Home', rootId: 'node_root_home', slug: '/' }],
    fragments: [],
    nodes: {
        node_root_home: {
            id: 'node_root_home',
            componentId: 'box',
            props: {},
            styles: { element: { base: { minHeight: '100%', width: '100%' } } },
            children: [],
            locked: false,
            isVisible: true,
        },
    },
    rootId: 'node_root_home',
    assets: [],
    globalCss: '/* Global CSS styles */',
    globalJs: '// Global JavaScript',
};

const initialState: EditorState = {
    project: initialProject,
    ui: {
        selectedId: null,
        mode: 'Page',
        expertMode: false,
        overlays: [],
        editingFragmentId: null,
        notification: null,
        canvas: {
            width: 1280, height: 800, zoom: 1, orientation: 'landscape',
            activeViewport: 'base', baseViewport: 'base',
            vpMode: { base: 'Unified', tablet: 'Unified', mobile: 'Unified' },
        },
        panels: {
            left: {
                activeHubTab: 'Pages', widthPx: 320, lastActivePageId: null, lastActiveFragmentId: null,
                isSplit: false, splitPercentage: 50,
            },
            right: { widthPx: 320 },
            bottom: { heightPx: 240, isCollapsed: false, advanced: null },
        },
    },
    data: {},
    settings: {},
    flowEdges: {},
    history: { past: [], future: [] },
};


/**
 * editStore 직접 접근은 Engine 파사드 은닉 원칙에 어긋납니다.
 * 외부 코드는 반드시 ../engine/EditorEngine 파사드를 사용해 주세요.
 * (getState / update / subscribe + 도메인 오퍼레이션)
 */
export const editorStore: StoreApi<EditorStoreState> = createStore<EditorStoreState>((set, get, api) => {
    const update = (fn: (draft: EditorState) => void, recordHistory = false) => {
        const current = get();
        const prevProject = current.project;
        const draft: EditorState = JSON.parse(JSON.stringify(current));
        fn(draft);
        const nextHistory = recordHistory
            ? { past: [...current.history.past, prevProject], future: [] }
            : current.history;
        set({ ...(draft as any), history: nextHistory });
    };

    return {
        ...initialState,
        update,
        // 각 슬라이스 생성 함수에 set, get, api 세 인자를 모두 전달합니다.
        ...createDataSlice(set, get, api),
        ...createFragmentSlice(set, get, api),
        ...createHistorySlice(set, get, api),
        ...createNodeSlice(set, get, api),
        ...createPageSlice(set, get, api),
        ...createUiSlice(set, get, api),
    };
});