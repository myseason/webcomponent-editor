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
 *     .pickReader('getUi', 'getProject')
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
 *     .pickReader('getProject', 'getUi')
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
 *     .pickReader('getProject', 'getNodeById', 'getUi')
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
 *     .pickReader('getUi')               // 최소 조회만
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
 *       const ui = RE.getUi();
 *       return ui.selectedId ? RE.getNodeById(ui.selectedId) : null;
 *     },
 *     isExpert() {
 *       return !!RE.getUi()?.expertMode;
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

import {AnyFn} from "./types";

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

/**
 * MethodWrapper
 * - aspect.ts의 withLog/withAfter/withCommand 형태( (orig)=>wrapped )를 그대로 허용
 * - 필요 시 meta(ctrlName/method)까지 받고 싶으면 (orig, meta)=>wrapped로 작성 가능
 */
export type MethodWrapper = (orig: AnyFn, meta?: { ctrlName: string; method: string }) => AnyFn;

type WrapEntry = Aspect | MethodWrapper;
type WrapMap = Record<string, WrapEntry | undefined>;

function createAspectProxy<T extends object>(
    bag: T,
    ctrlName: string,
    perMethod: WrapMap,
    globalAspect?: Aspect
): T {
    return new Proxy(bag, {
        get(target, p, receiver) {
            const v = Reflect.get(target, p, receiver) as unknown;
            if (typeof p !== 'string') return v as any;
            if (typeof v !== 'function') return v as any;

            const methodName = p;
            const entry = perMethod[methodName];

            // 메서드 래핑 로직
            const callWrapped = (fn: AnyFn, args: unknown[]) => {
                const base = { ctrlName, method: methodName } as const;
                try {
                    globalAspect?.before?.({ ...base, when: 'before' }, args);
                    const result = fn.apply(target, args);
                    globalAspect?.after?.({ ...base, when: 'after' }, args, result);
                    return result;
                } catch (err) {
                    globalAspect?.onError?.({ ...base, when: 'error' }, args, err);
                    throw err;
                }
            };

            // ① 함수 래퍼인 경우: 원본을 감싸서 반환
            if (typeof entry === 'function') {
                const wrapped = (entry as MethodWrapper)(v as AnyFn, { ctrlName, method: methodName });
                return (...args: unknown[]) => callWrapped(wrapped, args);
            }

            // ② Aspect 훅인 경우
            const methodAspect = entry as Aspect | undefined;

            return (...args: unknown[]) => {
                const base = { ctrlName, method: methodName } as const;
                try {
                    globalAspect?.before?.({ ...base, when: 'before' }, args);
                    methodAspect?.before?.({ ...base, when: 'before' }, args);

                    const result = (v as Function).apply(target, args);

                    globalAspect?.after?.({ ...base, when: 'after' }, args, result);
                    methodAspect?.after?.({ ...base, when: 'after' }, args, result);

                    return result;
                } catch (err) {
                    globalAspect?.onError?.({ ...base, when: 'error' }, args, err);
                    methodAspect?.onError?.({ ...base, when: 'error' }, args, err);
                    throw err;
                }
            };
        },
    });
}

/* ──────────────────────────────────────────────
 * Expose Builder (체이닝)
 *  - pickReader / pickWriter : 필요한 키만 남김
 *  - wrapReader / wrapWriter : 특정 메서드 Aspect/Wrapper
 *  - build : Proxy 적용된 { reader, writer } 객체 반환
 * ────────────────────────────────────────────── */

export type ExposeBuilder<R extends object, W extends object> = {
    pickReader: <K extends keyof R>(...keys: K[]) => ExposeBuilder<Pick<R, K>, W>;
    pickWriter: <K extends keyof W>(...keys: K[]) => ExposeBuilder<R, Pick<W, K>>;
    wrapReader: <K extends keyof R & string>(key: K, entry: Aspect | MethodWrapper) => ExposeBuilder<R, W>;
    wrapWriter: <K extends keyof W & string>(key: K, entry: Aspect | MethodWrapper) => ExposeBuilder<R, W>;
    build: () => { reader: R; writer: W };
};

function makeBuilder<R extends object, W extends object>(
    controllerName: string,
    curReader: R,
    curWriter: W,
    globalAspect?: Aspect,
    readerWraps: WrapMap = {},
    writerWraps: WrapMap = {}
): ExposeBuilder<R, W> {
    return {
        pickReader: (...keys) => {
            const next: Partial<R> = {};
            for (const k of keys) if (k in curReader) (next as any)[k] = (curReader as any)[k];
            return makeBuilder(controllerName, next as Pick<R, (typeof keys)[number]>, curWriter, globalAspect, readerWraps, writerWraps) as any;
        },
        pickWriter: (...keys) => {
            const next: Partial<W> = {};
            for (const k of keys) if (k in curWriter) (next as any)[k] = (curWriter as any)[k];
            return makeBuilder(controllerName, curReader, next as Pick<W, (typeof keys)[number]>, globalAspect, readerWraps, writerWraps) as any;
        },
        wrapReader: (key, entry) => {
            readerWraps[key] = entry;
            return makeBuilder(controllerName, curReader, curWriter, globalAspect, readerWraps, writerWraps);
        },
        wrapWriter: (key, entry) => {
            writerWraps[key] = entry;
            return makeBuilder(controllerName, curReader, curWriter, globalAspect, readerWraps, writerWraps);
        },
        build: () => {
            const r = createAspectProxy(curReader, `${controllerName}.reader`, readerWraps, globalAspect);
            const w = createAspectProxy(curWriter, `${controllerName}.writer`, writerWraps, globalAspect);
            return { reader: r, writer: w };
        },
    };
}

/**
 * makeSmartController
 * @param controllerName 컨트롤러 표시명 (로그/디버깅용)
 * @param RE useEngine(...).reader  그대로 전달
 * @param WE useEngine(...).writer  그대로 전달
 * @param opts { aspect, wrap } 전역/개별 메서드 Aspect/Wrapper (선택)
 */
export function makeSmartController<R extends object, W extends object>(
    controllerName: string,
    RE: R,
    WE: W,
    opts?: { aspect?: Aspect; wrap?: Record<string, Aspect | MethodWrapper> }
): ExposeBuilder<R, W> {
    const readerWraps: WrapMap = {};
    const writerWraps: WrapMap = {};
    if (opts?.wrap) {
        for (const k of Object.keys(opts.wrap)) {
            readerWraps[k] = opts.wrap[k];
            writerWraps[k] = opts.wrap[k];
        }
    }
    return makeBuilder(controllerName, RE, WE, opts?.aspect, readerWraps, writerWraps);
}