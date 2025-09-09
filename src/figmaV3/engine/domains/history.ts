import { EditorCore } from '../EditorCore';
import { selectCanUndo, selectCanRedo, selectHistory } from '../../store/slices/historySlice';

export function historyDomain() {
    const R = {
        canUndo: (): boolean => selectCanUndo(EditorCore.getState()),
        canRedo: (): boolean => selectCanRedo(EditorCore.getState()),
    };

    const W = {
        undo: () => {
            const state = EditorCore.store.getState();
            if (!R.canUndo()) return;

            const { past, future } = selectHistory(state);
            const previousProject = past[past.length - 1]!;
            const newPast = past.slice(0, past.length - 1);

            // 히스토리 스택 변경과 프로젝트 상태 복원을 하나의 트랜잭션으로 묶음
            state.update(s => {
                s.history.past = newPast;
                s.history.future = [s.project, ...future];
                s.project = previousProject;
                // 선택된 노드가 사라졌을 경우 루트를 선택
                if (!s.project.nodes[s.ui.selectedId ?? '']) {
                    s.ui.selectedId = s.project.rootId;
                }
            });
        },
        redo: () => {
            const state = EditorCore.store.getState();
            if (!R.canRedo()) return;

            const { past, future } = selectHistory(state);
            const nextProject = future[0]!;
            const newFuture = future.slice(1);

            state.update(s => {
                s.history.past = [...past, s.project];
                s.history.future = newFuture;
                s.project = nextProject;
                // 선택된 노드가 사라졌을 경우 루트를 선택
                if (!s.project.nodes[s.ui.selectedId ?? '']) {
                    s.ui.selectedId = s.project.rootId;
                }
            });
        },
    };

    return { reader: R, writer: W } as const;
}