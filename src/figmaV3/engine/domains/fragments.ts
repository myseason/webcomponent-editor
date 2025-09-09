import type { Fragment } from '../../core/types';
import { EditorCore } from '../EditorCore';
import { selectFragments, selectFragmentById, selectOverlays } from '../../store/slices/fragmentSlice';
import { genId, buildNodeWithDefaults, collectSubtreeIds } from '../../store/utils';

export function fragmentsDomain() {
    const R = {
        /** 모든 프래그먼트 목록을 가져옵니다. */
        getFragments: (): Fragment[] => selectFragments(EditorCore.getState()),
        /** ID로 특정 프래그먼트를 가져옵니다. */
        getFragmentById: (id: string): Fragment | undefined => selectFragmentById(id)(EditorCore.getState()),
        /** 현재 열려있는 오버레이(프래그먼트) 목록을 가져옵니다. */
        getOverlays: (): string[] => selectOverlays(EditorCore.getState()),
    };

    const W = {
        /** 새 프래그먼트와 그 루트 노드를 함께 생성합니다. */
        addFragment(name?: string): string {
            const state = EditorCore.store.getState();
            const newId = genId('comp');
            const rootId = genId('node');

            const newFragment: Fragment = {
                id: newId,
                name: name ?? `Component ${state.project.fragments.length + 1}`,
                rootId,
                isPublic: false
            };
            const rootNode = buildNodeWithDefaults('box', rootId);

            // fragmentSlice와 nodeSlice의 setter를 조합하여 하나의 유스케이스를 완성합니다.
            state._setFragments([...state.project.fragments, newFragment]);
            state._patchNode(rootId, rootNode); // 새 노드를 추가합니다.

            return newId;
        },

        /** 프래그먼트와 관련된 모든 노드를 재귀적으로 삭제합니다. */
        removeFragment(fragmentId: string) {
            const state = EditorCore.store.getState();
            const frag = R.getFragmentById(fragmentId);
            if (!frag) return;

            // 여러 상태를 하나의 트랜잭션으로 처리하기 위해 update 함수를 사용합니다.
            state.update(s => {
                const idsToDelete = collectSubtreeIds(s.project.nodes, frag.rootId);
                idsToDelete.forEach(id => delete s.project.nodes[id]);
                s.project.fragments = s.project.fragments.filter(f => f.id !== fragmentId);

                // 현재 편집 중인 프래그먼트가 삭제되었다면, 다른 프래그먼트로 전환합니다.
                if (s.ui.editingFragmentId === fragmentId) {
                    const nextFragment = s.project.fragments[0];
                    s.ui.editingFragmentId = nextFragment?.id ?? null;
                    s.ui.selectedId = nextFragment?.rootId ?? null;
                }
            }, true);
        },

        /** 프래그먼트의 메타데이터(이름, 설명, 공개 여부 등)를 업데이트합니다. */
        updateFragment(fragmentId: string, patch: Partial<Omit<Fragment, 'id' | 'rootId'>>) {
            const state = EditorCore.store.getState();
            const newFragments = state.project.fragments.map(f =>
                f.id === fragmentId ? { ...f, ...patch } : f
            );
            state._setFragments(newFragments);
        },

        /** 프래그먼트를 공유 라이브러리에 공개 상태로 변경합니다. */
        publishComponent(fragmentId: string) {
            W.updateFragment(fragmentId, { isPublic: true });
        },

        /** 프래그먼트를 오버레이로 엽니다. */
        openFragment(fragmentId: string) {
            const state = EditorCore.store.getState();
            const overlays = R.getOverlays();
            if (!overlays.includes(fragmentId)) {
                state._setOverlays([...overlays, fragmentId]);
            }
        },

        /** 프래그먼트 오버레이를 닫습니다. ID가 없으면 최상단 오버레이를 닫습니다. */
        closeFragment(fragmentId?: string) {
            const state = EditorCore.store.getState();
            const overlays = R.getOverlays();
            if (overlays.length === 0) return;
            const newOverlays = fragmentId ? overlays.filter(id => id !== fragmentId) : overlays.slice(0, -1);
            state._setOverlays(newOverlays);
        }
    };

    return { reader: R, writer: W } as const;
}