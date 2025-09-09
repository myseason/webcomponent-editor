import { EditorEngineCore } from '../EditorEngineCore';
import { selectData } from '../../store/slices/dataSlice';
import { setByPath } from '../../store/utils';

export function dataDomain() {
    const R = {
        getData: (): Record<string, unknown> => selectData(EditorEngineCore.getState()),
    };

    const W = {
        setData(data: Record<string, unknown>) {
            EditorEngineCore.store.getState()._setData(data);
        },
        setDataByPath(path: string, value: unknown) {
            const currentData = R.getData();
            const newData = setByPath(currentData, path, value);
            EditorEngineCore.store.getState()._setData(newData);
        },
    };

    return { reader: R, writer: W } as const;
}