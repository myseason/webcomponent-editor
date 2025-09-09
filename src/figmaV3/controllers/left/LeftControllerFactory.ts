'use client';

import * as React from 'react';
import { useEngine, EngineDomain } from '../../engine/Engine';
import { useStoreTick } from '../adapters/useStoreTick';
import { makeSmartController } from '../makeSmartController';
import { withLog } from '../adapters/aspect';

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
    const { reader: RE, writer: WE } = useEngine([
        EngineDomain.Components,
        EngineDomain.Assets,
        EngineDomain.Stylesheets,
        EngineDomain.Selectors,
        EngineDomain.History,
    ]);
    useStoreTick();

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
        wrap: {
            addPage: withLog('addPage'),
            removePage: withLog('removePage'),
            duplicatePage: withLog('duplicatePage'),
            selectPage: withLog('selectPage'),
        },
    });

    return ctl
        .pickReader('getProject', 'getUI')
        .pickWriter('addPage', 'removePage', 'duplicatePage', 'selectPage', 'update')
        .build();
}

function createLayersController(RE: any, WE: any) {
    const ctl = makeSmartController('Left/Layers', RE, WE, {
        wrap: {
            select: withLog('select'),
            moveNode: withLog('moveNode'),
            toggleNodeVisibility: withLog('toggleNodeVisibility'),
            toggleNodeLock: withLog('toggleNodeLock'),
            removeNodeCascade: withLog('removeNodeCascade'),
        },
    });

    return ctl
        .pickReader('getProject', 'getUI', 'getNodeById')
        .pickWriter('select', 'moveNode', 'toggleNodeVisibility', 'toggleNodeLock', 'removeNodeCascade')
        .build();
}

function createComponentsController(RE: any, WE: any) {
    const ctl = makeSmartController('Left/Components', RE, WE, {
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
        .build();
}

function createAssetsController(RE: any, WE: any) {
    const ctl = makeSmartController('Left/Assets', RE, WE, {
        wrap: {
            addAsset: withLog('addAsset'),
            removeAsset: withLog('removeAsset'),
            updateGlobalCss: withLog('updateGlobalCss'),
            updateGlobalJs: withLog('updateGlobalJs'),
        },
    });

    return ctl
        .pickReader('getProject', 'getUI')
        .pickWriter('addAsset', 'removeAsset', 'updateGlobalCss', 'updateGlobalJs')
        .build();
}

function createStylesheetsController(RE: any, WE: any) {
    const ctl = makeSmartController('Left/Stylesheets', RE, WE, {});

    return ctl
        .pickReader('getProject', 'getUI')
        .pickWriter('update')
        .build();
}

function createPaletteController(RE: any, WE: any) {
    const ctl = makeSmartController('Left/Palette', RE, WE, {
        wrap: {
            addByDef: withLog('addByDef'),
            insertComponent: withLog('insertComponent'),
            removeFragment: withLog('removeFragment'),
        },
    });

    return ctl
        .pickReader('getProject', 'getUI', 'isAdmin')
        .pickWriter('addByDef', 'insertComponent', 'removeFragment')
        .build();
}

function createTemplatesController(RE: any, WE: any) {
    const ctl = makeSmartController('Left/Templates', RE, WE, {
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