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
            //state._patchNode(rootId, rootNode); // 새 노드를 추가합니다.
            state._createNode(rootNode);

            return newId;
        },

        /** 프래그먼트와 관련된 모든 노드를 재귀적으로 삭제합니다. */
        removeFragment(fragmentId: string): boolean {
            const state = EditorCore.store.getState();

            // 존재 확인
            const frags = state.project.fragments ?? [];
            const frag = frags.find(f => f.id === fragmentId);
            if (!frag)
                return false;

            // 최소 1개 보장: 마지막 1개면 삭제 금지
            if (frags.length <= 1) {
                state._setNotification?.('At least one component is required in Component Dev Mode.');
                return false;
            }

            // 트리 삭제는 원자 연산으로
            if (frag.rootId) {
                state._deleteNodeCascade?.(frag.rootId);   // store/slices/nodeSlice.ts 원자 연산 사용
            }

            //  fragment 목록 갱신 (원자 setter 사용)
            const nextFrags = frags.filter(f => f.id !== fragmentId);
            state._setFragments?.(nextFrags);

            //  편집/선택 상태 보정: 남은 첫 컴포넌트로 전환
            const next = nextFrags[0];
            state._setEditingFragmentId?.(next?.id ?? null);
            state._setSelectedId?.(next?.rootId ?? null);

            return true;
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
        publishFragment(fragmentId: string) {
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