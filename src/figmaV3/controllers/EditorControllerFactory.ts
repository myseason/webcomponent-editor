import React from "react";

import {EditorDomain, useEditorApi} from "@/figmaV3/engine/EditorApi";
import {useStoreTick} from "@/figmaV3/controllers/adapters/useStoreTick";
import {makeSmartController, writerRerenderAspect} from "@/figmaV3/controllers/makeSmartController";
import {withLog} from "@/figmaV3/controllers/adapters/aspect";
import { useRerenderOnWrite } from '@/figmaV3/controllers/adapters/uiRerender';

/** 단 하나의 훅만 노출 */
export function useEditorControllerFactory(): { reader: any; writer: any } {
    const { reader: RE, writer: WE } = useEditorApi([EditorDomain.Selectors, EditorDomain.History, EditorDomain.Fragment]);
    //useStoreTick();
    useRerenderOnWrite();

    return React.useMemo(() => {
        return createEditorController(RE, WE);
    }, [RE, WE]);
}

/* ───────── 내부 구현 숨김 ───────── */

function createEditorController(RE: any, WE: any) {
    const ctl = makeSmartController('editor', RE, WE, {
        wrap: {
            setEditorMode: withLog('setEditorMode'),
            selectPage: withLog('selectPage'),
            setNotification: withLog('setNotification'),
            undo: withLog('undo'),
            redo: withLog('redo'),
        },
    });
    return ctl.exposeAll().build();
}