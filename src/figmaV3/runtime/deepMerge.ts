/**
 * ✨ [수정] 여러 소스 객체를 재귀적으로 병합합니다. 뒤에 오는 객체의 속성이 앞서는 객체의 속성을 덮어씁니다.
 * 배열은 덮어쓰기 방식으로 처리됩니다.
 */
export function deepMerge<T extends object, U extends object[]>(target: T, ...sources: U): T & U[number] {
    const output = { ...target } as any;

    for (const source of sources) {
        if (source && typeof source === 'object' && !Array.isArray(source)) {
            for (const key in source) {
                if (Object.prototype.hasOwnProperty.call(source, key)) {
                    const sourceValue = source[key as keyof typeof source];
                    const targetValue = output[key];

                    if (
                        sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue) &&
                        targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)
                    ) {
                        output[key] = deepMerge(targetValue, sourceValue);
                    } else {
                        output[key] = sourceValue;
                    }
                }
            }
        }
    }
    return output as T & U[number];
}