'use client';

import * as React from 'react';
import { useEditorApi, EditorDomain } from '../../engine/EditorApi';
import { useStoreTick } from '../adapters/useStoreTick';
import {makeSmartController, writerRerenderAspect} from '../makeSmartController';
import { withLog } from '../adapters/aspect';

import { useRerenderOnWrite } from '@/figmaV3/controllers/adapters/uiRerender';

export enum LeftDomain {
    Sidebar = 'Sidebar',
    Layers = 'Layers',
    Pages = 'Pages',
    Components = 'Components',
    Assets = 'Assets',
    Stylesheets = 'Stylesheets',
    Palette = 'Palette',
    Templates = 'Templates',
}

/** 외부에 노출되는 것은 이 훅 "하나" 뿐입니다. */
export function useLeftControllerFactory(domain?: LeftDomain): { reader: any; writer: any } {
    const { reader: RE, writer: WE } = useEditorApi([
        EditorDomain.Fragment,
        EditorDomain.Assets,
        EditorDomain.Stylesheets,
        EditorDomain.Selectors,
        EditorDomain.History,
    ]);
    //useStoreTick();
    useRerenderOnWrite();

    return React.useMemo(() => {
        switch (domain) {
            case LeftDomain.Pages:       return createPagesController(RE, WE);
            case LeftDomain.Layers:      return createLayersController(RE, WE);
            case LeftDomain.Components:  return createComponentsController(RE, WE);
            case LeftDomain.Assets:      return createAssetsController(RE, WE);
            case LeftDomain.Stylesheets: return createStylesheetsController(RE, WE);
            case LeftDomain.Palette:     return createPaletteController(RE, WE);
            case LeftDomain.Templates:   return createTemplatesController(RE, WE);
            case LeftDomain.Sidebar:
            default:                     return createSidebarController(RE, WE);
        }
    }, [domain, RE, WE]);
}

/* ───────── 내부 구현은 전부 비공개 ───────── */

function createPagesController(RE: any, WE: any) {
    const ctl = makeSmartController('Left/Pages', RE, WE, {
        writerAspect: writerRerenderAspect,
        wrap: {
            addPage: withLog('addPage'),
            removePage: withLog('removePage'),
            duplicatePage: withLog('duplicatePage'),
            selectPage: withLog('selectPage'),
        },
    });

    return ctl
        //.pickReader('getProject', 'getUI')
        //.pickWriter('addPage', 'removePage', 'duplicatePage', 'selectPage', 'update')
        .exposeAll()
        .build();
}

function createLayersController(RE: any, WE: any) {
    const ctl = makeSmartController('Left/Layers', RE, WE, {
        writerAspect: writerRerenderAspect,
        wrap: {
            //select: withLog('select'),
            moveNode: withLog('moveNode'),
            toggleNodeVisibility: withLog('toggleNodeVisibility'),
            toggleNodeLock: withLog('toggleNodeLock'),
            removeNodeCascade: withLog('removeNodeCascade'),
        },
    });

    return ctl
        //.pickReader('getProject', 'getUI', 'getNodeById', 'getNode')
        //.pickWriter('select', 'moveNode', 'toggleNodeVisibility', 'toggleNodeLock', 'removeNodeCascade')
        .exposeAll()
        .build();
}

function createComponentsController(RE: any, WE: any) {
    const ctl = makeSmartController('Left/Components', RE, WE, {
        writerAspect: writerRerenderAspect,
        wrap: {
            addFragment: withLog('addFragment'),
            updateFragment: withLog('updateFragment'),
            removeFragment: withLog('removeFragment'),
            openComponentEditor: withLog('openComponentEditor'),
            publishComponent: withLog('publishComponent'),
            insertComponent: withLog('insertComponent'),
            setNotification: withLog('setNotification'),
        },
    });

    return ctl
        /*
        .pickReader('getProject', 'getUI', 'isAdmin')
        .pickWriter(
            'addFragment',
            'updateFragment',
            'removeFragment',
            'openComponentEditor',
            'publishComponent',
            'insertComponent',
            'setNotification',
        )
        */
        .exposeAll()
        .build();
}

function createAssetsController(RE: any, WE: any) {
    const ctl = makeSmartController('Left/Assets', RE, WE, {
        writerAspect: writerRerenderAspect,
        wrap: {
            addAsset: withLog('addAsset'),
            removeAsset: withLog('removeAsset'),
            updateGlobalCss: withLog('updateGlobalCss'),
            updateGlobalJs: withLog('updateGlobalJs'),
        },
    });

    return ctl
        //.pickReader('getProject', 'getUI')
        //.pickWriter('addAsset', 'removeAsset', 'updateGlobalCss', 'updateGlobalJs')
        .exposeAll()
        .build();
}

function createStylesheetsController(RE: any, WE: any) {
    const ctl = makeSmartController('Left/Stylesheets', RE, WE, {});

    return ctl
        //.pickReader('getProject', 'getUI')
        //.pickWriter('update')
        .exposeAll()
        .build();
}

function createPaletteController(RE: any, WE: any) {
    const ctl = makeSmartController('Left/Palette', RE, WE, {
        writerAspect: writerRerenderAspect,
        wrap: {
            addByDef: withLog('addByDef'),
            insertComponent: withLog('insertComponent'),
            removeFragment: withLog('removeFragment'),
        },
    });

    return ctl
        //.pickReader('getProject', 'getUI', 'isAdmin')
        //.pickWriter('addByDef', 'insertComponent', 'removeFragment')
        .exposeAll()
        .build();
}

function createTemplatesController(RE: any, WE: any) {
    const ctl = makeSmartController('Left/Templates', RE, WE, {
        writerAspect: writerRerenderAspect,
        wrap: {
            insertComponent: withLog('insertComponent'),
            removeFragment: withLog('removeFragment'),
        },
    });

    return ctl
        .pickReader('getProject', 'getUI', 'isAdmin')
        .pickWriter('insertComponent', 'removeFragment')
        .build();
}

function createSidebarController(RE: any, WE: any) {
    const ctl = makeSmartController('Left/Sidebar', RE, WE, {
        wrap: {
            setActiveHubTab: withLog('setActiveHubTab'),
            toggleLeftPanelSplit: withLog('toggleLeftPanelSplit'),
            setLeftPanelSplitPercentage: withLog('setLeftPanelSplitPercentage'),
            setEditorMode: withLog('setEditorMode'),
            setNotification: withLog('setNotification'),
        },
    });

    return ctl
        .attachReader('getLeftSidebarVM', () => {
            const ui = RE.getUI();
            const left = ui?.panels?.left ?? {};
            const bottom = ui?.panels?.bottom ?? {};
            const isSplit =
                left.isSplit === true ||
                typeof left.splitPercentage === 'number';
            const bottomActive = bottom.activeTab;
            const showLayersInLeft = !(isSplit && bottomActive === 'Layers');
            return { isSplit, bottomActive, showLayersInLeft, activeLeftTab: left.activeTab };
        })
        .pickReader('getUI')
        .pickWriter(
            'setActiveHubTab',
            'toggleLeftPanelSplit',
            'setLeftPanelSplitPercentage',
            'setEditorMode',
            'setNotification',
        )
        .build();
}