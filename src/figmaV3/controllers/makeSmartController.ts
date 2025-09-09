'use client';

/**
 * 사용법
 * =====================================================================================================================
 * 1) 가장 기본: 필요한 키만 얇게 노출 (pick)
 * =====================================================================================================================
 * export function useLeftPanelControllerBasic() {
 *   const { reader: RE, writer: WE } = useEngine([
 *     EngineDomain.UI,
 *     EngineDomain.Pages,
 *   ]);
 *
 *   const { reader, writer } = makeSmartController('LeftPanelBasic', RE, WE)
 *     .pickReader('getUI', 'getProject')
 *     .pickWriter('addPage', 'removePage')
 *     .build();
 *
 *   return { reader, writer } as const;
 * }
 *
 * =====================================================================================================================
 * 2) per-method 로깅(withLog) + after 훅(withAfter)
 * =====================================================================================================================
 * export function usePagesController() {
 *   const { reader: RE, writer: WE } = useEngine([EngineDomain.Pages, EngineDomain.History]);
 *
 *   const { reader, writer } = makeSmartController('Pages', RE, WE, {
 *     wrap: {
 *       addPage: withLog('addPage'),
 *       removePage: withLog('removePage'),
 *       duplicatePage: withAfter((ret) => {
 *         // ret 에는 원본 함수 반환값
 *         // ex: 성공 알림 or 도메인 이벤트 푸시
 *         // toast.success('Duplicated!');
 *       }),
 *     },
 *   })
 *     .pickReader('getProject', 'getUI')
 *     .pickWriter('addPage', 'removePage', 'duplicatePage')
 *     .build();
 *
 *   return { reader, writer } as const;
 * }
 *
 * =====================================================================================================================
 * 3) 전역 Aspect(before/after/error) + 개별 래퍼 섞어쓰기
 * =====================================================================================================================
 * const globalAspect: Aspect = {
 *   before: ({ ctrlName, method }, args) => {
 *     // console.debug(`[${ctrlName}.${method}]`, 'args:', args);
 *   },
 *   onError: ({ method }, _args, err) => {
 *     // Sentry.captureException(err, { tags: { method } });
 *   },
 * };
 *
 * export function useAssetsController() {
 *   const { reader: RE, writer: WE } = useEngine([EngineDomain.Assets]);
 *
 *   const { reader, writer } = makeSmartController('Assets', RE, WE, {
 *     aspect: globalAspect,
 *     wrap: {
 *       addAsset: withLog('addAsset'),
 *       removeAsset: withLog('removeAsset'),
 *     },
 *   })
 *     .pickReader('getProject', 'assets') // 도메인에 따라 이름 다를 수 있음
 *     .pickWriter('addAsset', 'removeAsset')
 *     .build();
 *
 *   return { reader, writer } as const;
 * }
 *
 * =====================================================================================================================
 * 4) MethodWrapper(meta 활용) — 메서드명/컨트롤러명 기반 공통 태깅
 * =====================================================================================================================
 * // meta(ctrlName/method)를 쓰는 고급 래퍼
 * const withMetric: MethodWrapper = (orig, meta) => {
 *   return (...a: any[]) => {
 *     const t0 = performance.now();
 *     try {
 *       return orig(...a);
 *     } finally {
 *       const t1 = performance.now();
 *       // metrics.log({ name: `${meta?.ctrlName}.${meta?.method}`, durMs: +(t1-t0).toFixed(1) });
 *     }
 *   };
 * };
 *
 * export function useNodesController() {
 *   const { reader: RE, writer: WE } = useEngine([EngineDomain.Nodes]);
 *
 *   const { reader, writer } = makeSmartController('Nodes', RE, WE, {
 *     wrap: {
 *       addNode: withMetric,
 *       removeNode: withMetric,
 *       moveNode: withMetric,
 *     },
 *   })
 *     .pickReader('getNodeById', 'getProject')
 *     .pickWriter('addNode', 'removeNode', 'moveNode')
 *     .build();
 *
 *   return { reader, writer } as const;
 * }
 *
 * =====================================================================================================================
 * 5) Command 패턴과 결합(withCommand)
 * =====================================================================================================================
 * // history.push 를 주입해 커맨드 기록 (undo/redo)
 * const push = (cmd: { undo(): void; redo(): void }) => {
 *   // editHistory.push(cmd)
 * };
 *
 * const mkMoveCmd = (id: string, from: string, to: string) => ({
 *   undo() { ... },
 *   redo() { ... },
 * });
 *
 * export function useLayersController() {
 *   const { reader: RE, writer: WE } = useEngine([EngineDomain.Nodes, EngineDomain.History]);
 *
 *   const { reader, writer } = makeSmartController('Layers', RE, WE, {
 *     wrap: {
 *       moveNode: withCommand('moveNode', mkMoveCmd as any, push),
 *     },
 *   })
 *     .pickReader('getProject', 'getNodeById', 'getUI')
 *     .pickWriter('moveNode')
 *     .build();
 *
 *   return { reader, writer } as const;
 * }
 *
 * =====================================================================================================================
 * 6) Reader는 가볍게, Writer만 특정 메서드 노출
 * =====================================================================================================================
 * export function useTopbarController() {
 *   const { reader: RE, writer: WE } = useEngine([EngineDomain.UI, EngineDomain.Pages]);
 *
 *   const { reader, writer } = makeSmartController('Topbar', RE, WE)
 *     .pickReader('getUI')               // 최소 조회만
 *     .pickWriter('setEditorMode', 'selectPage') // 조작만 노출
 *     .build();
 *
 *   return { reader, writer } as const;
 * }
 *
 * =====================================================================================================================
 * 7) 다중 도메인 병합 + 도메인간 합성 API (컨트롤러 내부 helper 추가)
 * =====================================================================================================================
 * export function useInspectorController() {
 *   const { reader: RE, writer: WE } = useEngine([
 *     EngineDomain.UI,
 *     EngineDomain.Nodes,
 *     EngineDomain.Policy,
 *     EngineDomain.Project,
 *   ]);
 *
 *   // 컨트롤러 내부 helper: 도메인 함수 조합
 *   const helpers = {
 *     getSelectedNode() {
 *       const ui = RE.getUI();
 *       return ui.selectedId ? RE.getNodeById(ui.selectedId) : null;
 *     },
 *     isExpert() {
 *       return !!RE.getUI()?.expertMode;
 *     },
 *   };
 *
 *   const { reader, writer } = makeSmartController('Inspector', { ...RE, ...helpers }, WE, {
 *     wrap: { updateNodeStyles: withLog('updateNodeStyles') },
 *   })
 *     .pickReader('getSelectedNode', 'isExpert', 'getProject')
 *     .pickWriter('updateNodeStyles', 'updateNodeProps', 'setNotification')
 *     .build();
 *
 *   return { reader, writer } as const;
 * }
 *
 * =====================================================================================================================
 * 8) Presenter-lite: UI 전용 Selector만 노출
 * =====================================================================================================================
 * export function useLayersPresenter() {
 *   const { reader: RE, writer: WE } = useEngine([EngineDomain.Nodes, EngineDomain.UI, EngineDomain.Project]);
 *
 *   // UI 최적화된 selector
 *   const selectors = {
 *     // 트리 변환/필터링/정렬 등 UI 친화 로직
 *     flatTree(): { id: string; depth: number }[] {
 *       const proj = RE.getProject();
 *       const root = proj.rootId;
 *       const out: any[] = [];
 *       const walk = (id: string, depth: number) => {
 *         out.push({ id, depth });
 *         (proj.nodes[id]?.children ?? []).forEach((cid: string) => walk(cid, depth + 1));
 *       };
 *       root && walk(root, 0);
 *       return out;
 *     },
 *   };
 *
 *   const { reader, writer } = makeSmartController('LayersPresenter', selectors as any, WE)
 *     .pickReader('flatTree') // UI에서 딱 이것만 씀
 *     .pickWriter('select')   // 선택만 필요
 *     .build();
 *
 *   return { reader, writer } as const;
 * }
 *
 * =====================================================================================================================
 * 9) Worker-friendly: 읽기 전용 컨트롤러
 * =====================================================================================================================
 *  export function useReadOnlyReportController() {
 *   const { reader: RE } = useEngine([
 *     EngineDomain.Project,
 *     EngineDomain.Pages,
 *     EngineDomain.Nodes,
 *     EngineDomain.Data,
 *   ]);
 *
 *   const { reader } = makeSmartController('ReportRO', RE, {} as any)
 *     .pickReader('getProject', 'pages', 'getNodeById', 'data')
 *     .build();
 *
 *   return { reader } as const;
 * }
 *
 * =====================================================================================================================
 * 10) 테스트 더블/스파이 삽입 — wrap으로 목킹
 * =====================================================================================================================
 * export function useActionsTestableController(spy: (name: string, args: any[]) => void) {
 *   const { reader: RE, writer: WE } = useEngine([EngineDomain.Actions]);
 *
 *   const spyWrap: MethodWrapper = (orig, meta) => {
 *     return (...a: any[]) => {
 *       spy(`${meta?.ctrlName}.${meta?.method}`, a);
 *       return orig(...a);
 *     };
 *   };
 *
 *   const { reader, writer } = makeSmartController('Actions', RE, WE, {
 *     wrap: { runActionSteps: spyWrap },
 *   })
 *     .pickReader('getActionSteps')
 *     .pickWriter('setActionSteps', 'runActionSteps')
 *     .build();
 *
 *   return { reader, writer } as const;
 * }
 *
 */

'use client';

import type { AnyFn } from './types';

/* ========================
 * Types
 * ====================== */

export type AspectCtx = {
    ctrlName: string;
    method: string;
    when: 'before' | 'after' | 'error';
};

export type Aspect = {
    before?: (ctx: AspectCtx, args: unknown[]) => void;
    after?: (ctx: AspectCtx, args: unknown[], result: unknown) => void;
    onError?: (ctx: AspectCtx, args: unknown[], error: unknown) => void;
};

/** 기존 withLog('name')처럼 (orig)=>wrapped 를 지원하기 위한 타입 */
export type MethodWrapper<F extends AnyFn = AnyFn> = (orig: F) => F;

/** per-method로 적용되는 항목: Aspect 또는 MethodWrapper 둘 다 허용 */
type WrapEntry = Aspect | MethodWrapper;

/* 내부: wrap엔트리를 두 갈래로 나눠 관리 */
type WrapMaps = {
    methodAspects: Record<string, Aspect | undefined>;
    methodWrappers: Record<string, MethodWrapper | undefined>;
};

function splitWrapEntry(entry?: WrapEntry): { aspect?: Aspect; wrapper?: MethodWrapper } {
    if (!entry) return {};
    // Aspect signature heuristic: object with any of before/after/onError
    const maybeAspect = entry as Partial<Aspect>;
    const looksAspect =
        typeof entry === 'object' &&
        (typeof maybeAspect.before === 'function' ||
            typeof maybeAspect.after === 'function' ||
            typeof maybeAspect.onError === 'function');

    if (looksAspect) return { aspect: entry as Aspect };
    if (typeof entry === 'function') return { wrapper: entry as MethodWrapper };
    return {};
}

/* ========================
 * Proxy(Reader/Writer) 생성
 *  - per-method wrapper -> 먼저 적용
 *  - aspect(before/after/onError) -> 호출 전/후에 실행
 *  - globalAspect도 병행 적용
 * ====================== */

function createHybridProxy<T extends object>(
    bag: T,
    ctrlName: string,
    perMethod: WrapMaps,
    globalAspect?: Aspect
): T {
    return new Proxy(bag, {
        get(target, p, receiver) {
            const v = Reflect.get(target, p, receiver) as unknown;
            if (typeof p !== 'string') return v as T[Extract<keyof T, symbol>];
            if (typeof v !== 'function') return v as T[Extract<keyof T, string>];

            const methodName = p;
            const aspect = perMethod.methodAspects[methodName];
            const wrapper = perMethod.methodWrappers[methodName];

            // 1) this 바인딩 유지
            let fn = (v as Function).bind(target) as AnyFn;

            // 2) MethodWrapper 먼저 적용 (원본을 감싸서 기능 확장/치환)
            if (wrapper) {
                fn = wrapper(fn);
            }

            // 3) Aspect 적용 (before/after/onError)
            if (!globalAspect && !aspect) {
                // 아무 부가 처리 없으면 그대로 반환 (최단 경로)
                return fn as T[Extract<keyof T, string>];
            }

            // Aspect가 있으면 래퍼를 한 번 더 씌움
            return ((...args: unknown[]) => {
                const base = { ctrlName, method: methodName } as const;
                try {
                    globalAspect?.before?.({ ...base, when: 'before' }, args);
                    aspect?.before?.({ ...base, when: 'before' }, args);

                    const result = fn(...args);

                    // 동기/비동기 모두 지원
                    if (result && typeof (result as any).then === 'function') {
                        return (result as Promise<unknown>)
                            .then((res) => {
                                globalAspect?.after?.({ ...base, when: 'after' }, args, res);
                                aspect?.after?.({ ...base, when: 'after' }, args, res);
                                return res;
                            })
                            .catch((err) => {
                                globalAspect?.onError?.({ ...base, when: 'error' }, args, err);
                                aspect?.onError?.({ ...base, when: 'error' }, args, err);
                                throw err;
                            });
                    } else {
                        globalAspect?.after?.({ ...base, when: 'after' }, args, result);
                        aspect?.after?.({ ...base, when: 'after' }, args, result);
                        return result;
                    }
                } catch (err) {
                    globalAspect?.onError?.({ ...base, when: 'error' }, args, err);
                    aspect?.onError?.({ ...base, when: 'error' }, args, err);
                    throw err;
                }
            }) as T[Extract<keyof T, string>];
        },
    });
}

/* ========================
 * Expose Builder
 *  - pickReader / pickWriter: 필요한 키만
 *  - exposeReaderAll / exposeWriterAll / exposeAll: 전부 노출
 *  - wrapReader / wrapWriter: per-method에 MethodWrapper/Aspect 부착
 *  - requireReader / requireWriter: 런타임 검증
 *  - build: Proxy 적용한 객체 반환
 * ====================== */

export type ExposeBuilder<R extends object, W extends object> = {
    pickReader: <K extends keyof R>(...keys: K[]) => ExposeBuilder<Pick<R, K>, W>;
    pickWriter: <K extends keyof W>(...keys: K[]) => ExposeBuilder<R, Pick<W, K>>;
    exposeReaderAll: () => ExposeBuilder<R, W>;
    exposeWriterAll: () => ExposeBuilder<R, W>;
    exposeAll: () => ExposeBuilder<R, W>;
    wrapReader: <K extends keyof R & string>(key: K, entry: WrapEntry) => ExposeBuilder<R, W>;
    wrapWriter: <K extends keyof W & string>(key: K, entry: WrapEntry) => ExposeBuilder<R, W>;
    requireReader: (...keys: (keyof R & string)[]) => ExposeBuilder<R, W>;
    requireWriter: (...keys: (keyof W & string)[]) => ExposeBuilder<R, W>;
    build: () => { reader: R; writer: W };
};

function makeBuilder<R extends object, W extends object>(
    controllerName: string,
    curReader: R,
    curWriter: W,
    globalAspect?: Aspect,
    readerWraps: WrapMaps = { methodAspects: {}, methodWrappers: {} },
    writerWraps: WrapMaps = { methodAspects: {}, methodWrappers: {} },
    // 원본 전체(전체 노출용)
    fullReader?: object,
    fullWriter?: object
): ExposeBuilder<R, W> {
    return {
        pickReader: (...keys) => {
            const next: Partial<R> = {};
            for (const k of keys) if (k in curReader) (next as any)[k] = (curReader as any)[k];
            return makeBuilder(
                controllerName,
                next as Pick<R, (typeof keys)[number]>,
                curWriter,
                globalAspect,
                readerWraps,
                writerWraps,
                fullReader ?? curReader,
                fullWriter ?? curWriter
            ) as any;
        },

        pickWriter: (...keys) => {
            const next: Partial<W> = {};
            for (const k of keys) if (k in curWriter) (next as any)[k] = (curWriter as any)[k];
            return makeBuilder(
                controllerName,
                curReader,
                next as Pick<W, (typeof keys)[number]>,
                globalAspect,
                readerWraps,
                writerWraps,
                fullReader ?? curReader,
                fullWriter ?? curWriter
            ) as any;
        },

        exposeReaderAll: () => {
            const source = (fullReader ?? curReader) as R;
            return makeBuilder(
                controllerName,
                source,
                curWriter,
                globalAspect,
                readerWraps,
                writerWraps,
                source,
                fullWriter ?? curWriter
            );
        },

        exposeWriterAll: () => {
            const source = (fullWriter ?? curWriter) as W;
            return makeBuilder(
                controllerName,
                curReader,
                source,
                globalAspect,
                readerWraps,
                writerWraps,
                fullReader ?? curReader,
                source
            );
        },

        exposeAll: () => {
            const srcR = (fullReader ?? curReader) as R;
            const srcW = (fullWriter ?? curWriter) as W;
            return makeBuilder(
                controllerName,
                srcR,
                srcW,
                globalAspect,
                readerWraps,
                writerWraps,
                srcR,
                srcW
            );
        },

        wrapReader: (key, entry) => {
            const { aspect, wrapper } = splitWrapEntry(entry);
            if (aspect) readerWraps.methodAspects[key] = aspect;
            if (wrapper) readerWraps.methodWrappers[key] = wrapper;
            return makeBuilder(
                controllerName,
                curReader,
                curWriter,
                globalAspect,
                readerWraps,
                writerWraps,
                fullReader ?? curReader,
                fullWriter ?? curWriter
            );
        },

        wrapWriter: (key, entry) => {
            const { aspect, wrapper } = splitWrapEntry(entry);
            if (aspect) writerWraps.methodAspects[key] = aspect;
            if (wrapper) writerWraps.methodWrappers[key] = wrapper;
            return makeBuilder(
                controllerName,
                curReader,
                curWriter,
                globalAspect,
                readerWraps,
                writerWraps,
                fullReader ?? curReader,
                fullWriter ?? curWriter
            );
        },

        requireReader: (...keys) => {
            for (const k of keys) {
                if (typeof (curReader as any)[k] !== 'function' && (curReader as any)[k] === undefined) {
                    throw new Error(`[${controllerName}] reader.${String(k)} is missing. Check useEngine domains or method name.`);
                }
            }
            return makeBuilder(
                controllerName,
                curReader,
                curWriter,
                globalAspect,
                readerWraps,
                writerWraps,
                fullReader ?? curReader,
                fullWriter ?? curWriter
            );
        },

        requireWriter: (...keys) => {
            for (const k of keys) {
                if (typeof (curWriter as any)[k] !== 'function' && (curWriter as any)[k] === undefined) {
                    throw new Error(`[${controllerName}] writer.${String(k)} is missing. Check useEngine domains or method name.`);
                }
            }
            return makeBuilder(
                controllerName,
                curReader,
                curWriter,
                globalAspect,
                readerWraps,
                writerWraps,
                fullReader ?? curReader,
                fullWriter ?? curWriter
            );
        },

        build: () => {
            const r = createHybridProxy(curReader, `${controllerName}.reader`, readerWraps, globalAspect);
            const w = createHybridProxy(curWriter, `${controllerName}.writer`, writerWraps, globalAspect);
            return { reader: r, writer: w };
        },
    };
}

/**
 * makeSmartController
 * - opts.wrap: { [methodName]: Aspect | MethodWrapper }  ← 둘 다 지원
 * - opts.aspect: 전역 Aspect(before/after/onError)
 */
export function makeSmartController<R extends object, W extends object>(
    controllerName: string,
    RE: R,
    WE: W,
    opts?: { aspect?: Aspect; wrap?: Record<string, WrapEntry> }
): ExposeBuilder<R, W> {
    const readerWraps: WrapMaps = { methodAspects: {}, methodWrappers: {} };
    const writerWraps: WrapMaps = { methodAspects: {}, methodWrappers: {} };

    if (opts?.wrap) {
        for (const k of Object.keys(opts.wrap)) {
            const entry = opts.wrap[k];
            const { aspect, wrapper } = splitWrapEntry(entry);
            if (aspect) {
                readerWraps.methodAspects[k] = aspect;
                writerWraps.methodAspects[k] = aspect;
            }
            if (wrapper) {
                readerWraps.methodWrappers[k] = wrapper;
                writerWraps.methodWrappers[k] = wrapper;
            }
        }
    }

    // 최초 builder는 RE/WE를 "현재 선택 집합"이자 "전체 집합"으로 등록
    return makeBuilder(controllerName, RE, WE, opts?.aspect, readerWraps, writerWraps, RE, WE);
}