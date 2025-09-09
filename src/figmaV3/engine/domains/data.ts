import { EditorCore } from '../EditorCore';
import { selectData } from '../../store/slices/dataSlice';
import { setByPath } from '../../store/utils';

export function dataDomain() {
    const R = {
        getData: (): Record<string, unknown> => selectData(EditorCore.getState()),
    };

    const W = {
        setData(data: Record<string, unknown>) {
            EditorCore.store.getState()._setData(data);
        },
        setDataByPath(path: string, value: unknown) {
            const currentData = R.getData();
            const newData = setByPath(currentData, path, value);
            EditorCore.store.getState()._setData(newData);
        },
    };

    return { reader: R, writer: W } as const;
}